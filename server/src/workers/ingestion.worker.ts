import { ResourceStatus, SourceType, type Source } from "@prisma/client";
import { Worker, type Job } from "bullmq";

import { prisma } from "../infrastructure/db/prisma/client.js";
import { redisConnection } from "../infrastructure/queue/bullmq/connection.js";
import { embeddingsQueue, QUEUE_NAMES } from "../infrastructure/queue/bullmq/queues.js";
import { AppError } from "../shared/errors/AppError.js";
import { embeddingJobSchema, sourceIngestionJobSchema, type SourceIngestionJob } from "../modules/ingestion/ingestion.jobs.js";

const htmlStripRegex = /<[^>]*>/g;

const normalizeText = (text: string): string => {
  return text
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim();
};

const chunkText = (text: string, chunkSize = 1_200, overlap = 200): string[] => {
  if (!text.trim()) {
    return [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const slice = text.slice(start, end).trim();
    if (slice.length > 0) {
      chunks.push(slice);
    }

    if (end === text.length) {
      break;
    }

    start = Math.max(0, end - overlap);
  }

  return chunks;
};

const extractSourceContent = async (source: Source): Promise<string> => {
  if (source.type === SourceType.TEXT) {
    const rawText = (source.metadata as Record<string, unknown> | null)?.rawText;
    if (typeof rawText !== "string" || !rawText.trim()) {
      throw new AppError("TEXT source missing metadata.rawText", 400);
    }
    return rawText;
  }

  if (source.type === SourceType.YOUTUBE) {
    const transcript = (source.metadata as Record<string, unknown> | null)?.transcript;
    if (typeof transcript === "string" && transcript.trim()) {
      return transcript;
    }
    throw new AppError("YOUTUBE source missing metadata.transcript", 400);
  }

  if (source.type === SourceType.URL) {
    if (!source.externalRef) {
      throw new AppError("URL source missing externalRef", 400);
    }

    const response = await fetch(source.externalRef, {
      method: "GET",
      headers: { "user-agent": "MyBrain-Ingestion-Worker/1.0" }
    });

    if (!response.ok) {
      throw new AppError(`Failed to fetch URL content (${response.status})`, 502);
    }

    const html = await response.text();
    return html.replace(htmlStripRegex, " ");
  }

  throw new AppError(`Unsupported source type: ${source.type}`, 400);
};

const failSource = async (sourceId: string, message: string) => {
  await prisma.source.updateMany({
    where: { id: sourceId },
    data: {
      status: ResourceStatus.FAILED,
      errorMessage: message
    }
  });
};

const processIngestionJob = async (job: Job<SourceIngestionJob>) => {
  const data = sourceIngestionJobSchema.parse(job.data);

  const source = await prisma.source.findFirst({
    where: {
      id: data.sourceId,
      projectId: data.projectId,
      deletedAt: null
    }
  });

  if (!source) {
    return;
  }

  try {
    const extracted = await extractSourceContent(source);
    const cleaned = normalizeText(extracted);
    const chunks = chunkText(cleaned);

    await prisma.$transaction(async (tx) => {
      await tx.documentChunk.deleteMany({
        where: {
          sourceId: source.id,
          projectId: source.projectId
        }
      });

      if (chunks.length > 0) {
        await tx.documentChunk.createMany({
          data: chunks.map((chunk, index) => ({
            projectId: source.projectId,
            sourceId: source.id,
            chunkIndex: index,
            content: chunk,
            tokenCount: Math.ceil(chunk.length / 4),
            status: ResourceStatus.PROCESSING,
            metadata: {
              stage: "chunked",
              sourceVersion: data.sourceVersion
            }
          }))
        });
      }

      await tx.source.update({
        where: { id: source.id },
        data: {
          status: ResourceStatus.READY,
          errorMessage: null,
          metadata: {
            ...(source.metadata as Record<string, unknown> | null),
            ingestion: {
              chunkCount: chunks.length,
              sourceVersion: data.sourceVersion,
              completedAt: new Date().toISOString()
            }
          }
        }
      });
    });

    if (chunks.length > 0) {
      await embeddingsQueue.addBulk(
        chunks.map((_chunk, index) => {
          const payload = embeddingJobSchema.parse({
            sourceId: source.id,
            projectId: source.projectId,
            chunkIndex: index,
            sourceVersion: data.sourceVersion
          });

          return {
            name: "chunk.embed",
            data: payload,
            opts: {
              jobId: `embed:${payload.sourceId}:${payload.chunkIndex}:${payload.sourceVersion}`
            }
          };
        })
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingestion error";
    await failSource(source.id, message);
    throw error;
  }
};

export const ingestionWorker = new Worker<SourceIngestionJob>(
  QUEUE_NAMES.SOURCE_INGESTION,
  async (job) => processIngestionJob(job),
  {
    connection: redisConnection,
    concurrency: 4
  }
);

ingestionWorker.on("failed", async (job, error) => {
  if (!job) {
    return;
  }

  const message = error instanceof Error ? error.message : "Unknown ingestion error";
  await failSource(job.data.sourceId, message);
});
