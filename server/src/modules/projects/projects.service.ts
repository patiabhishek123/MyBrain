import { prisma } from "../../infrastructure/db/prisma/client.js";
import { AppError } from "../../shared/errors/AppError.js";
import { ProjectAccessService } from "./project-access.service.js";

interface CreateProjectInput {
  userId: string;
  name: string;
  slug?: string;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

export class ProjectsService {
  constructor(private readonly projectAccessService: ProjectAccessService) {}

  async createProject(input: CreateProjectInput) {
    if (!input.userId) {
      throw new AppError("Unauthorized", 401);
    }

    const name = input.name.trim();
    if (!name) {
      throw new AppError("Project name is required", 400);
    }

    const baseSlug = slugify(input.slug?.trim() || name);
    if (!baseSlug) {
      throw new AppError("Invalid project slug", 400);
    }

    let slugCandidate = baseSlug;
    let suffix = 1;

    while (
      await prisma.project.findFirst({
        where: {
          ownerId: input.userId,
          slug: slugCandidate,
          deletedAt: null
        },
        select: { id: true }
      })
    ) {
      suffix += 1;
      slugCandidate = `${baseSlug}-${suffix}`;
    }

    return prisma.project.create({
      data: {
        ownerId: input.userId,
        name,
        slug: slugCandidate
      },
      select: {
        id: true,
        ownerId: true,
        name: true,
        slug: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  async listProjects(userId: string) {
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    return prisma.project.findMany({
      where: {
        ownerId: userId,
        deletedAt: null
      },
      select: {
        id: true,
        ownerId: true,
        name: true,
        slug: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  async getScopedProject(userId: string, projectId: string) {
    if (!userId || !projectId) {
      throw new AppError("Invalid project scope", 400);
    }

    return this.projectAccessService.assertProjectOwnership({ userId, projectId });
  }
}
