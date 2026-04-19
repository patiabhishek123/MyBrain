import { Queue } from 'bullmq';
import { config } from '../config/index.js';

const embeddingQueue = new Queue('embeddings', {
  connection: {
    host: new URL(config.redis.url).hostname,
    port: parseInt(new URL(config.redis.url).port || '6379'),
  },
});

export async function enqueueEmbedding(sourceId: string) {
  try {
    const job = await embeddingQueue.add('embed', { sourceId }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
    });
    console.log(`Enqueued embedding job: ${job.id}`);
    return job;
  } catch (error) {
    console.error(`Failed to enqueue embedding: ${error}`);
    throw error;
  }
}

export default embeddingQueue;
