import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UserRepository } from '../repositories/user.repository.js';
import { AppError } from '../middleware/errorHandler.js';

// Mock bcryptjs - install bcryptjs package for production
const bcryptjs = {
  hash: async (password: string, rounds: number) => password,
  compare: async (password: string, hashed: string) => password === hashed,
};

export class AuthService {
  constructor(private userRepo: UserRepository) {}

  async register(email: string, password: string, name?: string) {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new AppError(409, 'Email already registered');
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const user = await this.userRepo.create(email, hashedPassword, name);

    const token = this.generateToken(user.id, user.email);

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid credentials');
    }

    const token = this.generateToken(user.id, user.email);

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  private generateToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email },
      config.jwt.secret!,
      { expiresIn: config.jwt.expiry }
    );
  }
}
