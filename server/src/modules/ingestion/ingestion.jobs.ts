import { z } from "zod";

const sourceVersionSchema = z.union([z.string().min(1), z.number().int().nonnegative()]);

export const sourceIngestionJobSchema = z.object({
  sourceId: z.string().min(1),
  projectId: z.string().min(1),
  sourceVersion: sourceVersionSchema
});

export const embeddingJobSchema = z.object({
  sourceId: z.string().min(1),
  projectId: z.string().min(1),
  chunkIndex: z.number().int().nonnegative(),
  sourceVersion: sourceVersionSchema
});

export type SourceIngestionJob = z.infer<typeof sourceIngestionJobSchema>;
export type EmbeddingJob = z.infer<typeof embeddingJobSchema>;
