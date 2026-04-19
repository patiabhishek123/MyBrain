import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthController } from '../controllers/auth.controller.js';
import { AuthService } from '../services/auth.service.js';
import { UserRepository } from '../repositories/user.repository.js';

const router = Router();

// Dependency injection
const prisma = new PrismaClient();
const userRepo = new UserRepository(prisma);
const authService = new AuthService(userRepo);
const authController = new AuthController(authService);

// Routes
router.post('/register', authController.register);
router.post('/login', authController.login);

export default router;
