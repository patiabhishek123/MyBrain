import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { env } from "../../config/env.js";
import { AppError } from "../errors/AppError.js";

export const errorMiddleware = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        details: err.details ?? null
      }
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: "Validation error",
        details: err.issues
      }
    });
  }

  const fallbackMessage = env.NODE_ENV === "production" ? "Internal server error" : "Unhandled error";

  return res.status(500).json({
    error: {
      message: fallbackMessage
    }
  });
};
