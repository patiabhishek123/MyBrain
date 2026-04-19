import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import type { ChatService } from "./chat.service.js";

const chatSchema = z.object({
  query: z.string().trim().min(1).max(10_000)
});

export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  createAnswer = async (req: Request, res: Response, _next: NextFunction) => {
    const { query } = chatSchema.parse(req.body);

    const result = await this.chatService.chat({
      userId: req.projectScope.userId,
      projectId: req.projectScope.projectId,
      query
    });

    return res.status(200).json(result);
  };
}
