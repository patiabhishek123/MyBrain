import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AppError } from './errorHandler.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      email?: string;
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new AppError(401, 'No token provided');
    }

    const decoded = jwt.verify(token, config.jwt.secret!) as {
      userId: string;
      email: string;
    };

    req.userId = decoded.userId;
    req.email = decoded.email;

    next();
  } catch (error) {
    next(new AppError(401, 'Invalid or expired token'));
  }
};
