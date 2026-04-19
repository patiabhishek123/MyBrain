import { prisma } from "../../infrastructure/db/prisma/client.js";
import type { LlmProvider } from "../../infrastructure/llm/core/LlmProvider.js";
import { pineconeIndex } from "../../infrastructure/vector/pinecone/client.js";
import { AppError } from "../../shared/errors/AppError.js";
import { ProjectAccessService } from "../projects/project-access.service.js";

export interface RetrieveContextInput {
  userId: string;
  projectId: string;
  query: string;
  topK?: number;
  rerank?: boolean;
}

export interface RankedChunkResult {
  rank: number;
  chunkId: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  score: number;
  vectorScore: number;
  rerankScore?: number;
}

interface InternalRankedItem {
  chunkId: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  vectorScore: number;
  rerankScore?: number;
  score: number;
}

const normalizeTerms = (text: string): string[] => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 1);
};

const lexicalOverlapScore = (query: string, content: string): number => {
  const queryTerms = new Set(normalizeTerms(query));
  if (queryTerms.size === 0) {
    return 0;
  }

  const contentTerms = new Set(normalizeTerms(content));
  let overlap = 0;

  for (const term of queryTerms) {
    if (contentTerms.has(term)) {
      overlap += 1;
    }
  }

  return overlap / queryTerms.size;
};

const extractChunkId = (match: { id: string; metadata?: Record<string, unknown> }): string => {
  const metadataChunkId = match.metadata?.chunkId;
  if (typeof metadataChunkId === "string" && metadataChunkId.length > 0) {
    return metadataChunkId;
  }

  return match.id.startsWith("chunk:") ? match.id.slice("chunk:".length) : match.id;
};

export class RetrievalService {
  constructor(
    private readonly llmProvider: LlmProvider,
    private readonly projectAccessService: ProjectAccessService
  ) {}

  async retrieve(input: RetrieveContextInput): Promise<RankedChunkResult[]> {
    const query = input.query.trim();
    if (!query) {
      throw new AppError("Query cannot be empty", 400);
    }

    await this.projectAccessService.assertProjectOwnership({
      userId: input.userId,
      projectId: input.projectId
    });

    const queryVector = await this.llmProvider.generateEmbedding(query);

    const topK = input.topK ?? 10;
    const pineconeResponse = await pineconeIndex.namespace(input.projectId).query({
      topK,
      vector: queryVector,
      includeMetadata: true,
      filter: {
        projectId: { $eq: input.projectId }
      } as Record<string, unknown>
    });

    const matches = pineconeResponse.matches ?? [];
    if (matches.length === 0) {
      return [];
    }

    const chunkIds = matches.map((match) => extractChunkId({
      id: match.id,
      metadata: (match.metadata ?? undefined) as Record<string, unknown> | undefined
    }));

    const chunks = await prisma.documentChunk.findMany({
      where: {
        id: { in: chunkIds },
        projectId: input.projectId,
        deletedAt: null
      },
      select: {
        id: true,
        sourceId: true,
        chunkIndex: true,
        content: true
      }
    });

    const chunkById = new Map(chunks.map((chunk) => [chunk.id, chunk]));

    const ranked: InternalRankedItem[] = matches
      .map((match) => {
        const chunkId = extractChunkId({
          id: match.id,
          metadata: (match.metadata ?? undefined) as Record<string, unknown> | undefined
        });
        const chunk = chunkById.get(chunkId);
        if (!chunk) {
          return null;
        }

        const vectorScore = typeof match.score === "number" ? match.score : 0;
        return {
          chunkId: chunk.id,
          sourceId: chunk.sourceId,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          vectorScore,
          score: vectorScore
        } satisfies InternalRankedItem;
      })
      .filter((item): item is InternalRankedItem => item !== null);

    if (input.rerank) {
      for (const item of ranked) {
        const rerankScore = lexicalOverlapScore(query, item.content);
        item.rerankScore = rerankScore;
        item.score = item.vectorScore * 0.8 + rerankScore * 0.2;
      }
    }

    ranked.sort((a, b) => b.score - a.score);

    return ranked.map((item, index) => ({
      rank: index + 1,
      chunkId: item.chunkId,
      sourceId: item.sourceId,
      chunkIndex: item.chunkIndex,
      content: item.content,
      score: Number(item.score.toFixed(6)),
      vectorScore: Number(item.vectorScore.toFixed(6)),
      rerankScore: item.rerankScore !== undefined ? Number(item.rerankScore.toFixed(6)) : undefined
    }));
  }
}
