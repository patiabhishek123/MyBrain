import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import type { AuthService } from "./auth.service.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(80).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10)
});

const logoutSchema = z.object({
  refreshToken: z.string().min(10)
});

const requestMeta = (req: Request) => ({
  ipAddress: req.ip,
  userAgent: req.get("user-agent") ?? undefined
});

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response, _next: NextFunction) => {
    const input = registerSchema.parse(req.body);
    const result = await this.authService.register(input, requestMeta(req).ipAddress, requestMeta(req).userAgent);
    return res.status(201).json(result);
  };

  login = async (req: Request, res: Response, _next: NextFunction) => {
    const input = loginSchema.parse(req.body);
    const result = await this.authService.login(input, requestMeta(req).ipAddress, requestMeta(req).userAgent);
    return res.status(200).json(result);
  };

  refresh = async (req: Request, res: Response, _next: NextFunction) => {
    const input = refreshSchema.parse(req.body);
    const result = await this.authService.refresh({ ...input, ...requestMeta(req) });
    return res.status(200).json(result);
  };

  logout = async (req: Request, res: Response, _next: NextFunction) => {
    const input = logoutSchema.parse(req.body);
    await this.authService.logout(input);
    return res.status(200).json({ success: true });
  };

  me = async (req: Request, res: Response, _next: NextFunction) => {
    const result = await this.authService.me(req.authUser.id);
    return res.status(200).json({ user: result });
  };
}
