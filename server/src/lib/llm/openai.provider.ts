import OpenAI from '@openai/sdk';
import { config } from '../../config/index.js';
import { LLMProvider, CompletionResponse } from './types.js';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async generateCompletion(prompt: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      throw new Error(`OpenAI completion error: ${error}`);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      throw new Error(`OpenAI embedding error: ${error}`);
    }
  }

  async streamCompletion(
    prompt: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    try {
      const stream = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          onChunk(content);
        }
      }
    } catch (error) {
      throw new Error(`OpenAI streaming error: ${error}`);
    }
  }
}
