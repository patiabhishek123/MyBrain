export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface EmbeddingRequest {
  text: string;
  metadata?: Record<string, unknown>;
}

export interface ChatQuery {
  message: string;
  projectId: string;
}

export interface ChatResponse {
  id: string;
  message: string;
  context: string[];
}

export interface IngestSourceRequest {
  title: string;
  type: 'TEXT' | 'URL' | 'YOUTUBE' | 'PDF' | 'FILE';
  content: string;
  projectId: string;
}
