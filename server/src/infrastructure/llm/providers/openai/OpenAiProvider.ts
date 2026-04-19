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
    const [first] = await this.generateEmbeddings([text]);
    return first;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const input = texts.map((item) => item.trim()).filter((item) => item.length > 0);
    if (input.length !== texts.length) {
      throw new AppError("Cannot generate embeddings for empty text entries", 400);
    }

    const response = await this.client.embeddings.create({
      model: env.OPENAI_EMBEDDING_MODEL,
      input
    });

    const vectors = response.data.map((item) => item.embedding);
    if (vectors.length !== texts.length) {
      throw new AppError("OpenAI embedding response count mismatch", 502);
    }

    return vectors;
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
