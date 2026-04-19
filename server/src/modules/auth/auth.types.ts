import type { JwtPayload } from "jsonwebtoken";

export type TokenKind = "access" | "refresh";

export interface AuthTokenPayload extends JwtPayload {
  sub: string;
  type: TokenKind;
  jti?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshInput {
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface LogoutInput {
  refreshToken: string;
}
