import type { Chat, ChatMessage } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

export class ChatRepository {
  constructor(private prisma: PrismaClient) {}

  async createChat(userId: string, projectId: string, title?: string): Promise<Chat> {
    return this.prisma.chat.create({
      data: { userId, projectId, title },
    });
  }

  async findChatById(id: string): Promise<Chat | null> {
    return this.prisma.chat.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async findChatsByProjectId(projectId: string, skip = 0, take = 10): Promise<Chat[]> {
    return this.prisma.chat.findMany({
      where: { projectId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { messages: true },
    });
  }

  async updateChat(id: string, data: Partial<Chat>): Promise<Chat> {
    return this.prisma.chat.update({
      where: { id },
      data,
    });
  }

  async deleteChat(id: string): Promise<void> {
    await this.prisma.chat.delete({ where: { id } });
  }

  async createMessage(
    chatId: string,
    role: 'USER' | 'ASSISTANT',
    content: string
  ): Promise<ChatMessage> {
    return this.prisma.chatMessage.create({
      data: { chatId, role, content },
    });
  }

  async findMessagesByChatId(chatId: string): Promise<ChatMessage[]> {
    return this.prisma.chatMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
