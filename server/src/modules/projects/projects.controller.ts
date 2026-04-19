import type { NextFunction, Request, Response } from "express";

import type { ProjectsService } from "./projects.service.js";

export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  getCurrentProject = async (req: Request, res: Response, _next: NextFunction) => {
    const result = await this.projectsService.getScopedProject(req.projectScope.userId, req.projectScope.projectId);
    return res.status(200).json({ project: result });
  };
}
