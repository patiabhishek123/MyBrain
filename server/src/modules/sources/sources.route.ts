import { Router } from "express";

import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { IngestionQueueProducer } from "../ingestion/ingestion.producer.js";
import { IngestionService } from "../ingestion/ingestion.service.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { createRequireProjectScope } from "../projects/project-scope.middleware.js";
import { ProjectAccessService } from "../projects/project-access.service.js";
import { SourcesController } from "./sources.controller.js";
import { SourcesService } from "./sources.service.js";

const projectAccessService = new ProjectAccessService();
const ingestionQueueProducer = new IngestionQueueProducer();
const ingestionService = new IngestionService(projectAccessService, ingestionQueueProducer);
const sourcesService = new SourcesService(ingestionService);
const sourcesController = new SourcesController(sourcesService);
const requireProjectScope = createRequireProjectScope(projectAccessService);

export const sourcesRouter = Router();

sourcesRouter.post("/projects/:projectId/sources", requireAuth, requireProjectScope, asyncHandler(sourcesController.upload));
