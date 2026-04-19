export enum SourceType {
  FILE = "FILE",
  URL = "URL",
  YOUTUBE = "YOUTUBE",
  TEXT = "TEXT",
  MARKDOWN = "MARKDOWN",
  PDF = "PDF",
  DOCX = "DOCX"
}

export type ResourceStatus = "PROCESSING" | "READY" | "FAILED";

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Source {
  id: string;
  projectId: string;
  type: SourceType;
  status: ResourceStatus;
  title: string | null;
  externalRef: string | null;
  checksum: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ChatSourceCitation {
  rank: number;
  chunkId: string;
  sourceId: string;
  chunkIndex: number;
  score: number;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSourceCitation[];
}
