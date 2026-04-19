import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

export class AuthController {
  constructor(private authService: AuthService) {}

  register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name } = req.body;

    if (!email || !password) {
      throw new AppError(400, 'Email and password required');
    }

    const result = await this.authService.register(email, password, name);

    res.status(201).json({
      success: true,
      data: result,
    });
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(400, 'Email and password required');
    }

    const result = await this.authService.login(email, password);

    res.status(200).json({
      success: true,
      data: result,
    });
  });
}
