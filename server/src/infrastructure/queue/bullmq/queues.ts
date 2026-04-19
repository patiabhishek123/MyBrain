import { Queue } from "bullmq";

import { redisConnection } from "./connection.js";

export const QUEUE_NAMES = {
  SOURCE_INGESTION: "source.ingestion",
  EMBEDDINGS: "source.embeddings"
} as const;

export const sourceIngestionQueue = new Queue(QUEUE_NAMES.SOURCE_INGESTION, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 2_000 },
    removeOnComplete: 1_000,
    removeOnFail: 10_000
  }
});

export const embeddingsQueue = new Queue(QUEUE_NAMES.EMBEDDINGS, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 2_000 },
    removeOnComplete: 1_000,
    removeOnFail: 10_000
  }
});
