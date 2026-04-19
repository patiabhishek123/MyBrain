export interface LLMProvider {
  generateCompletion(prompt: string): Promise<string>;
  generateEmbedding(text: string): Promise<number[]>;
  streamCompletion(prompt: string, onChunk: (chunk: string) => void): Promise<void>;
}

export interface EmbeddingResponse {
  embedding: number[];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface CompletionResponse {
  content: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
}
