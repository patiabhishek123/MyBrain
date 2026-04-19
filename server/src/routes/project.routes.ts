import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ProjectController } from '../controllers/project.controller.js';
import { ProjectService } from '../services/project.service.js';
import { ProjectRepository } from '../repositories/project.repository.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Dependency injection
const prisma = new PrismaClient();
const projectRepo = new ProjectRepository(prisma);
const projectService = new ProjectService(projectRepo);
const projectController = new ProjectController(projectService);

// Middleware
router.use(authMiddleware);

// Routes
router.post('/', projectController.create);
router.get('/', projectController.getAll);
router.get('/:id', projectController.getById);
router.put('/:id', projectController.update);
router.delete('/:id', projectController.delete);

export default router;
