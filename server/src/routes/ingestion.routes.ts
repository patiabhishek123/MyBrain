import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { IngestionController } from '../controllers/ingestion.controller.js';
import { IngestionService } from '../services/ingestion.service.js';
import { SourceRepository } from '../repositories/source.repository.js';
import { ProjectRepository } from '../repositories/project.repository.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Dependency injection
const prisma = new PrismaClient();
const sourceRepo = new SourceRepository(prisma);
const projectRepo = new ProjectRepository(prisma);
const ingestionService = new IngestionService(sourceRepo, projectRepo);
const ingestionController = new IngestionController(ingestionService);

// Middleware
router.use(authMiddleware);

// Routes
router.post('/', ingestionController.ingestSource);
router.get('/project/:projectId', ingestionController.getSources);
router.delete('/:sourceId/project/:projectId', ingestionController.deleteSource);

export default router;
