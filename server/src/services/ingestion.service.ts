import type { SourceType } from '@prisma/client';
import { SourceRepository } from '../repositories/source.repository.js';
import { ProjectRepository } from '../repositories/project.repository.js';
import { AppError } from '../middleware/errorHandler.js';

export class IngestionService {
  constructor(
    private sourceRepo: SourceRepository,
    private projectRepo: ProjectRepository
  ) {}

  async ingestSource(
    projectId: string,
    userId: string,
    title: string,
    type: SourceType,
    content: string,
    metadata?: Record<string, unknown>
  ) {
    const project = await this.projectRepo.findById(projectId);
    if (!project || project.userId !== userId) {
      throw new AppError(403, 'Unauthorized');
    }

    const source = await this.sourceRepo.create(projectId, title, type, content, metadata);

    // Enqueue embedding job
    console.log(`Enqueuing embedding job for source ${source.id}`);
    // TODO: Enqueue to BullMQ

    return source;
  }

  async getSourcesByProjectId(projectId: string, userId: string, page = 1, limit = 10) {
    const project = await this.projectRepo.findById(projectId);
    if (!project || project.userId !== userId) {
      throw new AppError(403, 'Unauthorized');
    }

    const skip = (page - 1) * limit;
    return this.sourceRepo.findByProjectId(projectId, skip, limit);
  }

  async deleteSource(sourceId: string, projectId: string, userId: string) {
    const project = await this.projectRepo.findById(projectId);
    if (!project || project.userId !== userId) {
      throw new AppError(403, 'Unauthorized');
    }

    await this.sourceRepo.delete(sourceId);
    // TODO: Remove embeddings from vector DB
  }
}
