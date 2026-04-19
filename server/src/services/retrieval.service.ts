import { EmbeddingRepository } from '../repositories/embedding.repository.js';
import { llmProvider } from '../lib/llm/index.js';
import { vectorStore } from '../lib/vector-db/index.js';
import { AppError } from '../middleware/errorHandler.js';

export class RetrievalService {
  constructor(private embeddingRepo: EmbeddingRepository) {}

  async retrieveContext(projectId: string, query: string, topK = 5) {
    try {
      // Generate query embedding
      const queryVector = await llmProvider.generateEmbedding(query);

      // Query vector DB
      const results = await vectorStore.queryEmbeddings(queryVector, {
        topK,
      });

      // Enrich with DB data
      const enrichedResults = await Promise.all(
        results.map(async result => {
          const embedding = await this.embeddingRepo.findBySourceId(
            result.metadata?.sourceId as string
          );
          return {
            id: result.id,
            score: result.score,
            text: embedding[0]?.text || '',
            metadata: result.metadata,
          };
        })
      );

      return enrichedResults;
    } catch (error) {
      throw new AppError(500, `Retrieval failed: ${error}`);
    }
  }

  async buildRAGPrompt(query: string, contexts: string[]): Promise<string> {
    const contextStr = contexts.join('\n---\n');
    return `Based on the following context, answer the question:

Context:
${contextStr}

Question: ${query}

Answer:`;
  }
}
