export interface VectorStoreConfig {
  apiKey: string;
  environment?: string;
  indexName: string;
}

export interface UpsertOptions {
  namespace?: string;
  metadata?: Record<string, unknown>;
}

export interface QueryOptions {
  namespace?: string;
  topK?: number;
}

export interface QueryResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
  values?: number[];
}
