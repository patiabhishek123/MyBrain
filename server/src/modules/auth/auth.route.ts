import { Router } from "express";

import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { AuthController } from "./auth.controller.js";
import { requireAuth } from "./auth.middleware.js";
import { AuthService } from "./auth.service.js";

export const createAuthRouter = (authService: AuthService) => {
	const authController = new AuthController(authService);
	const authRouter = Router();

	authRouter.post("/register", asyncHandler(authController.register));
	authRouter.post("/login", asyncHandler(authController.login));
	authRouter.post("/refresh", asyncHandler(authController.refresh));
	authRouter.post("/logout", asyncHandler(authController.logout));
	authRouter.get("/me", requireAuth, asyncHandler(authController.me));

	return authRouter;
};

export const authRouter = createAuthRouter(new AuthService());
