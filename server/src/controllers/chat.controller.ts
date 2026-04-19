import type { Request, Response } from 'express';
import { ChatService } from '../services/chat.service.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

export class ChatController {
  constructor(private chatService: ChatService) {}

  create = asyncHandler(async (req: Request, res: Response) => {
    const { projectId, title } = req.body;
    const userId = req.userId!;

    if (!projectId) {
      throw new AppError(400, 'Project ID required');
    }

    const chat = await this.chatService.createChat(userId, projectId, title);

    res.status(201).json({
      success: true,
      data: chat,
    });
  });

  getChats = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const chats = await this.chatService.getChatsByProjectId(projectId, userId, page, limit);

    res.status(200).json({
      success: true,
      data: chats,
    });
  });

  getChat = asyncHandler(async (req: Request, res: Response) => {
    const { chatId } = req.params;
    const userId = req.userId!;

    const chat = await this.chatService.getChatById(chatId, userId);

    res.status(200).json({
      success: true,
      data: chat,
    });
  });

  sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const { chatId } = req.params;
    const { message } = req.body;
    const userId = req.userId!;

    if (!message) {
      throw new AppError(400, 'Message required');
    }

    const response = await this.chatService.sendMessage(chatId, userId, message);

    res.status(200).json({
      success: true,
      data: response,
    });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    const { chatId } = req.params;
    const userId = req.userId!;

    await this.chatService.deleteChat(chatId, userId);

    res.status(204).json();
  });
}
