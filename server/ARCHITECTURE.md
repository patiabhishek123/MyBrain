# MyBrain Backend Architecture

Production-grade RAG backend with clean architecture and comprehensive module organization.

## Folder Structure

```
server/
├── src/
│   ├── config/                 # Configuration management
│   │   └── index.ts
│   ├── middleware/             # Express middleware
│   │   ├── auth.ts             # JWT authentication
│   │   └── errorHandler.ts     # Error handling
│   ├── types/                  # TypeScript interfaces
│   │   └── index.ts
│   ├── lib/                    # Shared libraries & abstractions
│   │   ├── llm/                # LLM abstraction layer
│   │   │   ├── types.ts        # Interface definitions
│   │   │   ├── openai.provider.ts
│   │   │   └── index.ts        # Provider factory
│   │   └── vector-db/          # Vector database abstraction
│   │       ├── types.ts
│   │       ├── pinecone.provider.ts
│   │       └── index.ts
│   ├── repositories/           # Data access layer
│   │   ├── user.repository.ts
│   │   ├── project.repository.ts
│   │   ├── source.repository.ts
│   │   ├── embedding.repository.ts
│   │   └── chat.repository.ts
│   ├── services/               # Business logic layer
│   │   ├── auth.service.ts
│   │   ├── project.service.ts
│   │   ├── ingestion.service.ts
│   │   ├── embedding.service.ts
│   │   ├── retrieval.service.ts
│   │   └── chat.service.ts
│   ├── controllers/            # Route handlers
│   │   ├── auth.controller.ts
│   │   ├── project.controller.ts
│   │   ├── ingestion.controller.ts
│   │   └── chat.controller.ts
│   ├── routes/                 # API route definitions
│   │   ├── auth.routes.ts
│   │   ├── project.routes.ts
│   │   ├── ingestion.routes.ts
│   │   └── chat.routes.ts
│   ├── queues/                 # BullMQ job queues
│   │   └── embedding.queue.ts
│   ├── workers/                # BullMQ job workers
│   │   └── embedding.worker.ts
│   └── index.ts                # Application entry point
├── prisma/
│   └── schema.prisma           # Database schema
├── .env.example                # Environment variables template
├── package.json
├── tsconfig.json
└── README.md
```

## Architecture Layers

### 1. Routes Layer
Defines API endpoints and request routing.
- Location: `src/routes/`
- Dependency: Controllers

### 2. Controllers Layer
Handles HTTP requests and responses, delegates to services.
- Location: `src/controllers/`
- Responsibilities: Validation, request parsing, response formatting
- Dependency: Services

### 3. Services Layer
Contains business logic and orchestration.
- Location: `src/services/`
- Responsibilities: Complex operations, validation rules, workflow
- Dependency: Repositories, External libraries

### 4. Repositories Layer
Data access abstraction for database operations.
- Location: `src/repositories/`
- Responsibilities: CRUD operations, query building
- Dependency: Prisma Client

### 5. External Integrations
- **LLM Abstraction**: `src/lib/llm/` - Switchable provider interface (OpenAI, Cerebras, etc.)
- **Vector DB**: `src/lib/vector-db/` - Pinecone integration
- **Job Queue**: `src/queues/` - BullMQ queue definitions
- **Workers**: `src/workers/` - Async job processors

## Modules

### Auth Module
- **Files**: `auth.controller.ts`, `auth.service.ts`, `user.repository.ts`
- **Routes**: 
  - `POST /api/auth/register` - User registration
  - `POST /api/auth/login` - User login

### Projects Module
- **Files**: `project.controller.ts`, `project.service.ts`, `project.repository.ts`
- **Routes**:
  - `POST /api/projects` - Create project
  - `GET /api/projects` - List user's projects
  - `GET /api/projects/:id` - Get project details
  - `PUT /api/projects/:id` - Update project
  - `DELETE /api/projects/:id` - Delete project

### Sources/Ingestion Module
- **Files**: `ingestion.controller.ts`, `ingestion.service.ts`, `source.repository.ts`
- **Routes**:
  - `POST /api/sources` - Ingest source (text, URL, YouTube, PDF, file)
  - `GET /api/sources/project/:projectId` - List project sources
  - `DELETE /api/sources/:sourceId/project/:projectId` - Remove source

### Embeddings Module
- **Files**: `embedding.service.ts`, `embedding.repository.ts`
- **Components**: 
  - Embedding service for vector generation
  - Worker: `src/workers/embedding.worker.ts`
  - Queue: `src/queues/embedding.queue.ts`
- **Process**: 
  1. Source ingested → Job enqueued
  2. Worker processes embedding async
  3. Vector stored in Pinecone + PostgreSQL

### Retrieval (RAG) Module
- **Files**: `retrieval.service.ts`
- **Responsibilities**:
  - Query vector embedding
  - Retrieve similar contexts from Pinecone
  - Build RAG prompts

### Chat Module
- **Files**: `chat.controller.ts`, `chat.service.ts`, `chat.repository.ts`
- **Routes**:
  - `POST /api/chats` - Create chat session
  - `GET /api/chats/project/:projectId` - List project chats
  - `GET /api/chats/:chatId` - Get chat history
  - `POST /api/chats/:chatId/message` - Send message (triggers RAG)
  - `DELETE /api/chats/:chatId` - Delete chat

## LLM Abstraction Layer

**Location**: `src/lib/llm/`

The LLM abstraction provides a provider pattern to switch between different AI services:

```typescript
interface LLMProvider {
  generateCompletion(prompt: string): Promise<string>;
  generateEmbedding(text: string): Promise<number[]>;
  streamCompletion(prompt: string, onChunk: (chunk: string) => void): Promise<void>;
}
```

- **Current**: OpenAI provider
- **Extensible**: Add Cerebras, Anthropic, Ollama providers

## Job Queues & Workers

**Location**: `src/queues/` and `src/workers/`

### Embedding Queue
- **Queue**: `embedding.queue.ts`
- **Worker**: `embedding.worker.ts`
- **Redis**: Configured via `REDIS_URL`
- **Flow**: 
  1. Source ingested
  2. Job added to queue with retry logic
  3. Worker processes async embedding
  4. Results stored in DB and vector DB

## Database Schema

**Location**: `prisma/schema.prisma`

- **User** - Authentication & ownership
- **Project** - Knowledge organization
- **Source** - Data sources (text, URLs, PDFs, YouTube)
- **Embedding** - Stored vectors and metadata
- **Chat** - Conversation sessions
- **ChatMessage** - Message history

## Configuration

**Location**: `src/config/index.ts`

Environment variables:
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - Token signing key
- `OPENAI_API_KEY` - OpenAI API key
- `PINECONE_API_KEY` - Pinecone API key
- `REDIS_URL` - Redis connection for BullMQ
- `PORT` - Server port (default 5000)

## Development

```bash
npm install          # Install dependencies
npm run prisma:migrate  # Run migrations
npm run dev           # Start dev server with auto-reload
npm run prisma:studio   # Open Prisma Studio
```

## Dependency Injection

Services instantiate dependencies in route files:
```typescript
const userRepo = new UserRepository(prisma);
const authService = new AuthService(userRepo);
const authController = new AuthController(authService);
```

Easy to swap implementations for testing or provider changes.
