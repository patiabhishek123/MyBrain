import type { LlmProvider } from "../../infrastructure/llm/core/LlmProvider.js";

export class ChatService {
  constructor(private readonly llmProvider: LlmProvider) {}

  async answerPrompt(prompt: string) {
    const [answer, embedding] = await Promise.all([
      this.llmProvider.generateChatCompletion(prompt),
      this.llmProvider.generateEmbedding(prompt)
    ]);

    return {
      answer,
      embeddingDimensions: embedding.length
    };
  }
}
