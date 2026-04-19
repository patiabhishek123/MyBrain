import { ChatRepository } from '../repositories/chat.repository.js';
import { ProjectRepository } from '../repositories/project.repository.js';
import { RetrievalService } from './retrieval.service.js';
import { llmProvider } from '../lib/llm/index.js';
import { AppError } from '../middleware/errorHandler.js';

export class ChatService {
  constructor(
    private chatRepo: ChatRepository,
    private projectRepo: ProjectRepository,
    private retrievalService: RetrievalService
  ) {}

  async createChat(userId: string, projectId: string, title?: string) {
    const project = await this.projectRepo.findById(projectId);
    if (!project || project.userId !== userId) {
      throw new AppError(403, 'Unauthorized');
    }

    return this.chatRepo.createChat(userId, projectId, title);
  }

  async getChatById(chatId: string, userId: string) {
    const chat = await this.chatRepo.findChatById(chatId);
    if (!chat || chat.userId !== userId) {
      throw new AppError(403, 'Unauthorized');
    }
    return chat;
  }

  async getChatsByProjectId(projectId: string, userId: string, page = 1, limit = 10) {
    const project = await this.projectRepo.findById(projectId);
    if (!project || project.userId !== userId) {
      throw new AppError(403, 'Unauthorized');
    }

    const skip = (page - 1) * limit;
    return this.chatRepo.findChatsByProjectId(projectId, skip, limit);
  }

  async sendMessage(chatId: string, userId: string, message: string) {
    const chat = await this.chatRepo.findChatById(chatId);
    if (!chat || chat.userId !== userId) {
      throw new AppError(403, 'Unauthorized');
    }

    // Store user message
    await this.chatRepo.createMessage(chatId, 'USER', message);

    // Retrieve context
    const contexts = await this.retrievalService.retrieveContext(
      chat.projectId,
      message,
      5
    );

    // Build RAG prompt
    const contextTexts = contexts.map(ctx => ctx.text);
    const ragPrompt = await this.retrievalService.buildRAGPrompt(message, contextTexts);

    // Generate response
    const response = await llmProvider.generateCompletion(ragPrompt);

    // Store assistant message
    const assistantMsg = await this.chatRepo.createMessage(chatId, 'ASSISTANT', response);

    return {
      id: assistantMsg.id,
      message: response,
      context: contextTexts,
    };
  }

  async deleteChat(chatId: string, userId: string) {
    const chat = await this.chatRepo.findChatById(chatId);
    if (!chat || chat.userId !== userId) {
      throw new AppError(403, 'Unauthorized');
    }

    await this.chatRepo.deleteChat(chatId);
  }
}
