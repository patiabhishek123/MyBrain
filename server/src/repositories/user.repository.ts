import type { User } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

export class UserRepository {
  constructor(private prisma: PrismaClient) {}

  async create(email: string, password: string, name?: string): Promise<User> {
    return this.prisma.user.create({
      data: { email, password, name },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
