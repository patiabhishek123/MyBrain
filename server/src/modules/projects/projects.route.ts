import { Router } from "express";

import { requireAuth } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { createRequireProjectScope } from "./project-scope.middleware.js";
import { ProjectAccessService } from "./project-access.service.js";
import { ProjectsController } from "./projects.controller.js";
import { ProjectsService } from "./projects.service.js";

const projectAccessService = new ProjectAccessService();
const projectsService = new ProjectsService(projectAccessService);
const projectsController = new ProjectsController(projectsService);
const requireProjectScope = createRequireProjectScope(projectAccessService);

export const projectsRouter = Router();

projectsRouter.get("/:projectId", requireAuth, requireProjectScope, asyncHandler(projectsController.getCurrentProject));
