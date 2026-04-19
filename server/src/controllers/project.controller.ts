import type { Request, Response } from 'express';
import { ProjectService } from '../services/project.service.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

export class ProjectController {
  constructor(private projectService: ProjectService) {}

  create = asyncHandler(async (req: Request, res: Response) => {
    const { name, description } = req.body;
    const userId = req.userId!;

    if (!name) {
      throw new AppError(400, 'Project name required');
    }

    const project = await this.projectService.createProject(userId, name, description);

    res.status(201).json({
      success: true,
      data: project,
    });
  });

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const projects = await this.projectService.getProjectsByUserId(userId, page, limit);

    res.status(200).json({
      success: true,
      data: projects,
    });
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const project = await this.projectService.getProjectById(id);

    res.status(200).json({
      success: true,
      data: project,
    });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.userId!;
    const { name, description } = req.body;

    const project = await this.projectService.updateProject(id, userId, { name, description });

    res.status(200).json({
      success: true,
      data: project,
    });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.userId!;

    await this.projectService.deleteProject(id, userId);

    res.status(204).json();
  });
}
