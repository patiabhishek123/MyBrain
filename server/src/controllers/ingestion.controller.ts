import type { Request, Response } from 'express';
import { IngestionService } from '../services/ingestion.service.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import type { SourceType } from '@prisma/client';

export class IngestionController {
  constructor(private ingestionService: IngestionService) {}

  ingestSource = asyncHandler(async (req: Request, res: Response) => {
    const { projectId, title, type, content, metadata } = req.body;
    const userId = req.userId!;

    if (!projectId || !title || !type || !content) {
      throw new AppError(400, 'Missing required fields');
    }

    const source = await this.ingestionService.ingestSource(
      projectId,
      userId,
      title,
      type as SourceType,
      content,
      metadata
    );

    res.status(201).json({
      success: true,
      data: source,
    });
  });

  getSources = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const sources = await this.ingestionService.getSourcesByProjectId(
      projectId,
      userId,
      page,
      limit
    );

    res.status(200).json({
      success: true,
      data: sources,
    });
  });

  deleteSource = asyncHandler(async (req: Request, res: Response) => {
    const { projectId, sourceId } = req.params;
    const userId = req.userId!;

    await this.ingestionService.deleteSource(sourceId, projectId, userId);

    res.status(204).json();
  });
}
