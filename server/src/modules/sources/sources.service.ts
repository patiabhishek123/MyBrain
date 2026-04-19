import { SourceType, type Prisma } from "@prisma/client";

import { IngestionService } from "../ingestion/ingestion.service.js";

export interface UploadSourceInput {
  projectId: string;
  userId: string;
  type: SourceType;
  title?: string;
  externalRef?: string;
  metadata?: Prisma.InputJsonValue;
}

export class SourcesService {
  constructor(private readonly ingestionService: IngestionService) {}

  async uploadSource(input: UploadSourceInput) {
    return this.ingestionService.createSourceAndEnqueue(input);
  }
}
