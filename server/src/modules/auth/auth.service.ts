import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import type { SignOptions } from "jsonwebtoken";

import { env } from "../../config/env.js";
import { prisma } from "../../infrastructure/db/prisma/client.js";
import { AppError } from "../../shared/errors/AppError.js";
import type { AuthTokenPayload, AuthTokens, LoginInput, LogoutInput, RefreshInput, RegisterInput } from "./auth.types.js";

const parseJwtLifetimeToMs = (value: string): number => {
  const match = value.match(/^(\d+)([smhd])$/i);
  if (!match) {
    throw new AppError("Invalid JWT lifetime format", 500);
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const factor: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000
  };

  return amount * factor[unit];
};

export class AuthService {
  private readonly saltRounds = env.BCRYPT_SALT_ROUNDS;
  private readonly accessExpiresIn = env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"];
  private readonly refreshExpiresIn = env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"];

  private signAccessToken(userId: string): string {
    const payload: AuthTokenPayload = { sub: userId, type: "access" };
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: this.accessExpiresIn });
  }

  private signRefreshToken(userId: string, jti: string): string {
    const payload: AuthTokenPayload = { sub: userId, type: "refresh", jti };
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: this.refreshExpiresIn });
  }

  private verifyRefreshToken(token: string): AuthTokenPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as AuthTokenPayload;
      if (decoded.type !== "refresh" || !decoded.sub || !decoded.jti) {
        throw new AppError("Invalid refresh token", 401);
      }
      return decoded;
    } catch {
      throw new AppError("Invalid or expired refresh token", 401);
    }
  }

  private async persistRefreshToken(params: {
    userId: string;
    refreshToken: string;
    jti: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<string> {
    const tokenHash = await bcrypt.hash(params.refreshToken, this.saltRounds);
    const expiresAt = new Date(Date.now() + parseJwtLifetimeToMs(env.JWT_REFRESH_EXPIRES_IN));

    const stored = await prisma.refreshToken.create({
      data: {
        userId: params.userId,
        jti: params.jti,
        tokenHash,
        expiresAt,
        createdByIp: params.ipAddress,
        userAgent: params.userAgent
      }
    });

    return stored.id;
  }

  private async buildTokenPair(userId: string, ipAddress?: string, userAgent?: string): Promise<AuthTokens> {
    const jti = randomUUID();
    const refreshToken = this.signRefreshToken(userId, jti);
    await this.persistRefreshToken({ userId, refreshToken, jti, ipAddress, userAgent });

    return {
      accessToken: this.signAccessToken(userId),
      refreshToken
    };
  }

  async register(input: RegisterInput, ipAddress?: string, userAgent?: string) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email: input.email.toLowerCase(),
        deletedAt: null
      }
    });

    if (existingUser) {
      throw new AppError("Email is already in use", 409);
    }

    const passwordHash = await bcrypt.hash(input.password, this.saltRounds);

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    const tokens = await this.buildTokenPair(user.id, ipAddress, userAgent);

    return {
      user,
      tokens
    };
  }

  async login(input: LoginInput, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findFirst({
      where: {
        email: input.email.toLowerCase(),
        deletedAt: null
      }
    });

    if (!user?.passwordHash) {
      throw new AppError("Invalid credentials", 401);
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError("Invalid credentials", 401);
    }

    const tokens = await this.buildTokenPair(user.id, ipAddress, userAgent);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      tokens
    };
  }

  async refresh(input: RefreshInput) {
    const payload = this.verifyRefreshToken(input.refreshToken);

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { jti: payload.jti },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            deletedAt: true
          }
        }
      }
    });

    if (!tokenRecord || tokenRecord.user.deletedAt || tokenRecord.revokedAt || tokenRecord.expiresAt <= new Date()) {
      throw new AppError("Refresh token is no longer valid", 401);
    }

    const isTokenMatch = await bcrypt.compare(input.refreshToken, tokenRecord.tokenHash);
    if (!isTokenMatch) {
      throw new AppError("Refresh token is no longer valid", 401);
    }

    const newJti = randomUUID();
    const newRefreshToken = this.signRefreshToken(tokenRecord.userId, newJti);
    const newTokenHash = await bcrypt.hash(newRefreshToken, this.saltRounds);
    const expiresAt = new Date(Date.now() + parseJwtLifetimeToMs(env.JWT_REFRESH_EXPIRES_IN));

    await prisma.$transaction(async (tx) => {
      const newToken = await tx.refreshToken.create({
        data: {
          userId: tokenRecord.userId,
          jti: newJti,
          tokenHash: newTokenHash,
          expiresAt,
          createdByIp: input.ipAddress,
          userAgent: input.userAgent
        }
      });

      await tx.refreshToken.update({
        where: { id: tokenRecord.id },
        data: {
          revokedAt: new Date(),
          replacedByTokenId: newToken.id
        }
      });
    });

    return {
      user: {
        id: tokenRecord.user.id,
        email: tokenRecord.user.email,
        name: tokenRecord.user.name
      },
      tokens: {
        accessToken: this.signAccessToken(tokenRecord.user.id),
        refreshToken: newRefreshToken
      }
    };
  }

  async logout(input: LogoutInput) {
    let payload: AuthTokenPayload;

    try {
      payload = this.verifyRefreshToken(input.refreshToken);
    } catch {
      return { success: true };
    }

    await prisma.refreshToken.updateMany({
      where: {
        jti: payload.jti,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });

    return { success: true };
  }

  async me(userId: string) {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }
}
