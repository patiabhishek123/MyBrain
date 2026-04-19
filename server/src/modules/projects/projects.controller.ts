import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import type { ProjectsService } from "./projects.service.js";

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(120).optional()
});

export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  createProject = async (req: Request, res: Response, _next: NextFunction) => {
    const input = createProjectSchema.parse(req.body);
    const project = await this.projectsService.createProject({
      userId: req.authUser.id,
      name: input.name,
      slug: input.slug
    });

    return res.status(201).json({
      success: true,
      data: {
        project
      },
      error: null
    });
  };

  listProjects = async (req: Request, res: Response, _next: NextFunction) => {
    const projects = await this.projectsService.listProjects(req.authUser.id);

    return res.status(200).json({
      success: true,
      data: {
        projects
      },
      error: null
    });
  };

  getCurrentProject = async (req: Request, res: Response, _next: NextFunction) => {
    const result = await this.projectsService.getScopedProject(req.projectScope.userId, req.projectScope.projectId);
    return res.status(200).json({
      success: true,
      data: {
        project: result
      },
      error: null
    });
  };
}
