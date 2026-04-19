import type { Embedding } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

export class EmbeddingRepository {
  constructor(private prisma: PrismaClient) {}

  async create(
    sourceId: string,
    projectId: string,
    text: string,
    vector: number[],
    metadata?: Record<string, unknown>
  ): Promise<Embedding> {
    return this.prisma.embedding.create({
      data: { sourceId, projectId, text, vector, metadata },
    });
  }

  async findBySourceId(sourceId: string): Promise<Embedding[]> {
    return this.prisma.embedding.findMany({
      where: { sourceId },
    });
  }

  async findByProjectId(projectId: string, skip = 0, take = 10): Promise<Embedding[]> {
    return this.prisma.embedding.findMany({
      where: { projectId },
      skip,
      take,
    });
  }

  async deleteBySourceId(sourceId: string): Promise<void> {
    await this.prisma.embedding.deleteMany({ where: { sourceId } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.embedding.delete({ where: { id } });
  }
}
