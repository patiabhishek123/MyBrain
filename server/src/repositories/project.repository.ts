import type { Project } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

export class ProjectRepository {
  constructor(private prisma: PrismaClient) {}

  async create(userId: string, name: string, description?: string): Promise<Project> {
    return this.prisma.project.create({
      data: { userId, name, description },
    });
  }

  async findById(id: string): Promise<Project | null> {
    return this.prisma.project.findUnique({ where: { id } });
  }

  async findByUserIdAndName(userId: string, name: string): Promise<Project | null> {
    return this.prisma.project.findUnique({
      where: { userId_name: { userId, name } },
    });
  }

  async findByUserId(userId: string, skip = 0, take = 10): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: { userId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: Partial<Project>): Promise<Project> {
    return this.prisma.project.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.project.delete({ where: { id } });
  }
}
