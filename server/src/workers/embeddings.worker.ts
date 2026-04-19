import { Worker, type Job } from "bullmq";

import { createLlmProvider } from "../infrastructure/llm/core/LlmFactory.js";
import { redisConnection } from "../infrastructure/queue/bullmq/connection.js";
import { QUEUE_NAMES } from "../infrastructure/queue/bullmq/queues.js";
import { EmbeddingsService } from "../modules/embeddings/embeddings.service.js";
import { embeddingJobSchema, type EmbeddingJob } from "../modules/ingestion/ingestion.jobs.js";

const embeddingsService = new EmbeddingsService(createLlmProvider());

const processEmbeddingJob = async (job: Job<EmbeddingJob>) => {
  const data = embeddingJobSchema.parse(job.data);
  await embeddingsService.processBatch(data);
};

export const embeddingsWorker = new Worker<EmbeddingJob>(
  QUEUE_NAMES.EMBEDDINGS,
  async (job) => processEmbeddingJob(job),
  {
    connection: redisConnection,
    concurrency: 8
  }
);

embeddingsWorker.on("failed", async (job, error) => {
  if (!job) {
    return;
  }

  const attempts = job.opts.attempts ?? 1;
  const attemptsExhausted = job.attemptsMade >= attempts;
  if (!attemptsExhausted) {
    return;
  }

  const message = error instanceof Error ? error.message : "Unknown embedding error";
  await embeddingsService.markBatchFailed(job.data, message);
});
