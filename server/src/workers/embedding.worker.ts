import type { Job } from 'bullmq';
import { Worker } from 'bullmq';
import { config } from '../config/index.js';
import { PrismaClient } from '@prisma/client';
import { EmbeddingService } from '../services/embedding.service.js';
import { EmbeddingRepository } from '../repositories/embedding.repository.js';
import { SourceRepository } from '../repositories/source.repository.js';

const prisma = new PrismaClient();
const embeddingRepo = new EmbeddingRepository(prisma);
const sourceRepo = new SourceRepository(prisma);
const embeddingService = new EmbeddingService(embeddingRepo, sourceRepo);

// Initialize worker
const worker = new Worker(
  'embeddings',
  async (job: Job) => {
    console.log(`Processing embedding job ${job.id}`);
    try {
      const { sourceId } = job.data;
      await embeddingService.embedSource(sourceId);
      return { success: true, sourceId };
    } catch (error) {
      console.error(`Embedding job failed: ${error}`);
      throw error;
    }
  },
  {
    connection: {
      host: new URL(config.redis.url).hostname,
      port: parseInt(new URL(config.redis.url).port || '6379'),
    },
  }
);

worker.on('completed', job => {
  console.log(`✓ Embedding job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`✗ Embedding job ${job?.id} failed: ${err.message}`);
});

export default worker;
