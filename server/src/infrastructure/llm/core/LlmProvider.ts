export interface LlmProvider {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  generateChatCompletion(prompt: string): Promise<string>;
}
