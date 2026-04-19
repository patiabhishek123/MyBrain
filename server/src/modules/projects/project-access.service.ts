import { prisma } from "../../infrastructure/db/prisma/client.js";
import { AppError } from "../../shared/errors/AppError.js";

export interface ProjectScope {
  userId: string;
  projectId: string;
}

export class ProjectAccessService {
  async assertProjectOwnership(scope: ProjectScope) {
    const project = await prisma.project.findFirst({
      where: {
        id: scope.projectId,
        ownerId: scope.userId,
        deletedAt: null
      },
      select: {
        id: true,
        ownerId: true,
        name: true,
        slug: true,
        createdAt: true
      }
    });

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    return project;
  }

  buildProjectWhere<T extends Record<string, unknown>>(scope: ProjectScope, where: T): T & { projectId: string } {
    return {
      ...where,
      projectId: scope.projectId
    };
  }
}
