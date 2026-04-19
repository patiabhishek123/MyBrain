export interface LlmProvider {
  generateEmbedding(text: string): Promise<number[]>;
  generateChatCompletion(prompt: string): Promise<string>;
}
