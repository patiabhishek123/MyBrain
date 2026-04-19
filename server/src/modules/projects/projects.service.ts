import { AppError } from "../../shared/errors/AppError.js";
import { ProjectAccessService } from "./project-access.service.js";

export class ProjectsService {
  constructor(private readonly projectAccessService: ProjectAccessService) {}

  async getScopedProject(userId: string, projectId: string) {
    if (!userId || !projectId) {
      throw new AppError("Invalid project scope", 400);
    }

    return this.projectAccessService.assertProjectOwnership({ userId, projectId });
  }
}
