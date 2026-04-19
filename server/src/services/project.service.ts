import { ProjectRepository } from '../repositories/project.repository.js';
import { AppError } from '../middleware/errorHandler.js';

export class ProjectService {
  constructor(private projectRepo: ProjectRepository) {}

  async createProject(userId: string, name: string, description?: string) {
    const existing = await this.projectRepo.findByUserIdAndName(userId, name);
    if (existing) {
      throw new AppError(409, 'Project with this name already exists');
    }

    return this.projectRepo.create(userId, name, description);
  }

  async getProjectById(id: string) {
    const project = await this.projectRepo.findById(id);
    if (!project) {
      throw new AppError(404, 'Project not found');
    }
    return project;
  }

  async getProjectsByUserId(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    return this.projectRepo.findByUserId(userId, skip, limit);
  }

  async updateProject(id: string, userId: string, data: { name?: string; description?: string }) {
    const project = await this.projectRepo.findById(id);
    if (!project || project.userId !== userId) {
      throw new AppError(403, 'Unauthorized');
    }

    return this.projectRepo.update(id, data);
  }

  async deleteProject(id: string, userId: string) {
    const project = await this.projectRepo.findById(id);
    if (!project || project.userId !== userId) {
      throw new AppError(403, 'Unauthorized');
    }

    await this.projectRepo.delete(id);
  }
}
