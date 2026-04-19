import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ChatController } from '../controllers/chat.controller.js';
import { ChatService } from '../services/chat.service.js';
import { ChatRepository } from '../repositories/chat.repository.js';
import { ProjectRepository } from '../repositories/project.repository.js';
import { RetrievalService } from '../services/retrieval.service.js';
import { EmbeddingRepository } from '../repositories/embedding.repository.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Dependency injection
const prisma = new PrismaClient();
const chatRepo = new ChatRepository(prisma);
const projectRepo = new ProjectRepository(prisma);
const embeddingRepo = new EmbeddingRepository(prisma);
const retrievalService = new RetrievalService(embeddingRepo);
const chatService = new ChatService(chatRepo, projectRepo, retrievalService);
const chatController = new ChatController(chatService);

// Middleware
router.use(authMiddleware);

// Routes
router.post('/', chatController.create);
router.get('/project/:projectId', chatController.getChats);
router.get('/:chatId', chatController.getChat);
router.post('/:chatId/message', chatController.sendMessage);
router.delete('/:chatId', chatController.delete);

export default router;
