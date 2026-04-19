import type { LlmProvider } from "../../infrastructure/llm/core/LlmProvider.js";
import { RetrievalService } from "../retrieval/retrieval.service.js";

export interface ChatRequestInput {
  userId: string;
  projectId: string;
  query: string;
}

export interface ChatSource {
  rank: number;
  chunkId: string;
  sourceId: string;
  chunkIndex: number;
  score: number;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
}

const buildRagPrompt = (query: string, contextChunks: string[]): string => {
  const context = contextChunks.map((chunk, index) => `[${index + 1}] ${chunk}`).join("\n\n");

  return [
    "System:",
    '"You must answer ONLY from the provided context. If the answer is not present in the context, say you do not have enough context."',
    "",
    "Context:",
    context || "<no-context>",
    "",
    "User:",
    query
  ].join("\n");
};

export class ChatService {
  constructor(
    private readonly retrievalService: RetrievalService,
    private readonly llmProvider: LlmProvider
  ) {}

  async chat(input: ChatRequestInput): Promise<ChatResponse> {
    const query = input.query.trim();

    const rankedChunks = await this.retrievalService.retrieve({
      userId: input.userId,
      projectId: input.projectId,
      query,
      topK: 10,
      rerank: true
    });

    const prompt = buildRagPrompt(
      query,
      rankedChunks.map((item) => item.content)
    );

    const answer = await this.llmProvider.generateChatCompletion(prompt);

    return {
      answer,
      sources: rankedChunks.map((item) => ({
        rank: item.rank,
        chunkId: item.chunkId,
        sourceId: item.sourceId,
        chunkIndex: item.chunkIndex,
        score: item.score
      }))
    };
  }
}
