import { ResourceStatus, SourceType, type Prisma } from "@prisma/client";

import { prisma } from "../../infrastructure/db/prisma/client.js";
import { AppError } from "../../shared/errors/AppError.js";
import { ProjectAccessService } from "../projects/project-access.service.js";
import { IngestionQueueProducer } from "./ingestion.producer.js";

export interface CreateSourceInput {
  projectId: string;
  userId: string;
  type: SourceType;
  title?: string;
  externalRef?: string;
  metadata?: Prisma.InputJsonValue;
}

export class IngestionService {
  constructor(
    private readonly projectAccessService: ProjectAccessService,
    private readonly ingestionQueueProducer: IngestionQueueProducer
  ) {}

  async createSourceAndEnqueue(input: CreateSourceInput) {
    await this.projectAccessService.assertProjectOwnership({
      userId: input.userId,
      projectId: input.projectId
    });

    if (input.type === SourceType.URL || input.type === SourceType.YOUTUBE) {
      if (!input.externalRef) {
        throw new AppError("externalRef is required for URL/YOUTUBE source", 400);
      }
    }

    if (input.type === SourceType.TEXT) {
      const hasRawText = typeof input.metadata === "object" && input.metadata !== null && "rawText" in input.metadata;
      if (!hasRawText) {
        throw new AppError("metadata.rawText is required for TEXT source", 400);
      }
    }

    const source = await prisma.source.create({
      data: {
        projectId: input.projectId,
        type: input.type,
        title: input.title,
        externalRef: input.externalRef,
        metadata: input.metadata,
        status: ResourceStatus.PROCESSING
      }
    });

    await this.ingestionQueueProducer.enqueueSourceIngestion(source);

    return source;
  }
}
