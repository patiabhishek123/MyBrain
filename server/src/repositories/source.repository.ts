import type { Source, SourceType } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

export class SourceRepository {
  constructor(private prisma: PrismaClient) {}

  async create(
    projectId: string,
    title: string,
    type: SourceType,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<Source> {
    return this.prisma.source.create({
      data: { projectId, title, type, content, metadata },
    });
  }

  async findById(id: string): Promise<Source | null> {
    return this.prisma.source.findUnique({ where: { id } });
  }

  async findByProjectId(projectId: string, skip = 0, take = 10): Promise<Source[]> {
    return this.prisma.source.findMany({
      where: { projectId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: Partial<Source>): Promise<Source> {
    return this.prisma.source.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.source.delete({ where: { id } });
  }
}
