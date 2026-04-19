import { ResourceStatus } from "@prisma/client";

import { env } from "../../config/env.js";
import { prisma } from "../../infrastructure/db/prisma/client.js";
import type { LlmProvider } from "../../infrastructure/llm/core/LlmProvider.js";
import { pineconeIndex } from "../../infrastructure/vector/pinecone/client.js";
import { embeddingJobSchema, type EmbeddingJob } from "../ingestion/ingestion.jobs.js";

const EMBEDDING_BATCH_SIZE = 32;

export class EmbeddingsService {
  constructor(private readonly llmProvider: LlmProvider) {}

  async processBatch(trigger: EmbeddingJob) {
    const data = embeddingJobSchema.parse(trigger);

    const chunks = await prisma.documentChunk.findMany({
      where: {
        sourceId: data.sourceId,
        projectId: data.projectId,
        deletedAt: null,
        pineconeId: null
      },
      orderBy: {
        chunkIndex: "asc"
      },
      take: EMBEDDING_BATCH_SIZE
    });

    if (chunks.length === 0) {
      return { processed: 0 };
    }

    const vectors = await this.llmProvider.generateEmbeddings(chunks.map((chunk) => chunk.content));

    await pineconeIndex.namespace(data.projectId).upsert(
      chunks.map((chunk, index) => ({
        id: `chunk:${chunk.id}`,
        values: vectors[index],
        metadata: {
          projectId: chunk.projectId,
          sourceId: chunk.sourceId,
          chunkId: chunk.id
        }
      }))
    );

    await prisma.$transaction(
      chunks.map((chunk) =>
        prisma.documentChunk.updateMany({
          where: {
            id: chunk.id,
            pineconeId: null
          },
          data: {
            pineconeId: `chunk:${chunk.id}`,
            pineconeNamespace: chunk.projectId,
            embeddingModel: env.OPENAI_EMBEDDING_MODEL,
            embeddingDimension: vectors[0]?.length,
            status: ResourceStatus.READY,
            metadata: {
              ...(chunk.metadata as Record<string, unknown> | null),
              embedding: {
                indexedAt: new Date().toISOString()
              }
            }
          }
        })
      )
    );

    return { processed: chunks.length };
  }

  async markBatchFailed(trigger: EmbeddingJob, reason: string) {
    const data = embeddingJobSchema.parse(trigger);

    await prisma.documentChunk.updateMany({
      where: {
        sourceId: data.sourceId,
        projectId: data.projectId,
        deletedAt: null,
        pineconeId: null
      },
      data: {
        status: ResourceStatus.FAILED,
        metadata: {
          embeddingError: {
            reason,
            failedAt: new Date().toISOString()
          }
        }
      }
    });
  }
}
