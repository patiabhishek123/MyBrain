import type { Source } from "@prisma/client";

import { sourceIngestionQueue } from "../../infrastructure/queue/bullmq/queues.js";
import { sourceIngestionJobSchema } from "./ingestion.jobs.js";

export class IngestionQueueProducer {
  async enqueueSourceIngestion(source: Pick<Source, "id" | "projectId" | "updatedAt">, sourceVersion?: string | number) {
    const payload = sourceIngestionJobSchema.parse({
      sourceId: source.id,
      projectId: source.projectId,
      sourceVersion: sourceVersion ?? source.updatedAt.getTime()
    });

    await sourceIngestionQueue.add("source.ingest", payload, {
      jobId: `ingest:${payload.sourceId}:${payload.sourceVersion}`
    });

    return payload;
  }
}
