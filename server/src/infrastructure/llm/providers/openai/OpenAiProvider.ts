import OpenAI from "openai";

import { env } from "../../../../config/env.js";
import { AppError } from "../../../../shared/errors/AppError.js";
import type { LlmProvider } from "../../core/LlmProvider.js";

export class OpenAiProvider implements LlmProvider {
  private readonly client: OpenAI;

  constructor(apiKey = env.OPENAI_API_KEY) {
    this.client = new OpenAI({ apiKey });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const input = text.trim();
    if (!input) {
      throw new AppError("Cannot generate embedding for empty text", 400);
    }

    const response = await this.client.embeddings.create({
      model: env.OPENAI_EMBEDDING_MODEL,
      input
    });

    const vector = response.data[0]?.embedding;
    if (!vector) {
      throw new AppError("OpenAI embedding response was empty", 502);
    }

    return vector;
  }

  async generateChatCompletion(prompt: string): Promise<string> {
    const input = prompt.trim();
    if (!input) {
      throw new AppError("Prompt cannot be empty", 400);
    }

    const response = await this.client.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages: [{ role: "user", content: input }],
      temperature: 0.2
    });

    const output = response.choices[0]?.message?.content?.trim();
    if (!output) {
      throw new AppError("OpenAI chat completion response was empty", 502);
    }

    return output;
  }
}
