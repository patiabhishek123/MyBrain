import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/AppError.js";
import type { AuthTokenPayload } from "./auth.types.js";

const extractBearerToken = (req: Request): string => {
  const authHeader = req.header("authorization");
  if (!authHeader) {
    throw new AppError("Authorization header is required", 401);
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new AppError("Invalid authorization scheme", 401);
  }

  return token;
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = extractBearerToken(req);
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthTokenPayload;

    if (payload.type !== "access" || !payload.sub) {
      throw new AppError("Invalid access token", 401);
    }

    req.authUser = {
      id: payload.sub
    };

    return next();
  } catch {
    return next(new AppError("Unauthorized", 401));
  }
};
