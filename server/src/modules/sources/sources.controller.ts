import { SourceType, type Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import type { SourcesService } from "./sources.service.js";

const uploadSourceSchema = z.object({
  type: z.nativeEnum(SourceType),
  title: z.string().trim().min(1).max(300).optional(),
  externalRef: z.string().url().optional(),
  metadata: z.custom<Prisma.InputJsonValue>((value) => value !== undefined).optional()
});

export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  upload = async (req: Request, res: Response, _next: NextFunction) => {
    const input = uploadSourceSchema.parse(req.body);

    const source = await this.sourcesService.uploadSource({
      projectId: req.projectScope.projectId,
      userId: req.projectScope.userId,
      type: input.type,
      title: input.title,
      externalRef: input.externalRef,
      metadata: input.metadata
    });

    return res.status(202).json({
      sourceId: source.id,
      status: source.status
    });
  };
}
