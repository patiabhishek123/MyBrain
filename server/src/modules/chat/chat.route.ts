import { Router } from "express";

import { createLlmProvider } from "../../infrastructure/llm/core/LlmFactory.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { ProjectAccessService } from "../projects/project-access.service.js";
import { createRequireProjectScope } from "../projects/project-scope.middleware.js";
import { RetrievalService } from "../retrieval/retrieval.service.js";
import { ChatController } from "./chat.controller.js";
import { ChatService } from "./chat.service.js";

const llmProvider = createLlmProvider();
const projectAccessService = new ProjectAccessService();
const retrievalService = new RetrievalService(llmProvider, projectAccessService);
const chatService = new ChatService(retrievalService, llmProvider);
const chatController = new ChatController(chatService);
const requireProjectScope = createRequireProjectScope(projectAccessService);

export const chatRouter = Router();

chatRouter.post("/projects/:projectId/chat", requireAuth, requireProjectScope, asyncHandler(chatController.createAnswer));
