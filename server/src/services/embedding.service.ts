import { EmbeddingRepository } from '../repositories/embedding.repository.js';
import { SourceRepository } from '../repositories/source.repository.js';
import { llmProvider } from '../lib/llm/index.js';
import { vectorStore } from '../lib/vector-db/index.js';
import { AppError } from '../middleware/errorHandler.js';

export class EmbeddingService {
  constructor(
    private embeddingRepo: EmbeddingRepository,
    private sourceRepo: SourceRepository
  ) {}

  async embedSource(sourceId: string) {
    const source = await this.sourceRepo.findById(sourceId);
    if (!source) {
      throw new AppError(404, 'Source not found');
    }

    try {
      // Generate embedding
      const vector = await llmProvider.generateEmbedding(source.content);

      // Store in database
      const embedding = await this.embeddingRepo.create(
        sourceId,
        source.projectId,
        source.content,
        vector,
        { sourceTitle: source.title, sourceType: source.type }
      );

      // Upsert to vector DB
      await vectorStore.upsertEmbeddings([
        {
          id: embedding.id,
          values: vector,
          metadata: {
            sourceId: source.id,
            projectId: source.projectId,
            title: source.title,
          },
        },
      ]);

      return embedding;
    } catch (error) {
      throw new AppError(500, `Embedding failed: ${error}`);
    }
  }

  async getEmbeddingsBySourceId(sourceId: string) {
    return this.embeddingRepo.findBySourceId(sourceId);
  }

  async getEmbeddingsByProjectId(projectId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    return this.embeddingRepo.findByProjectId(projectId, skip, limit);
  }
}
