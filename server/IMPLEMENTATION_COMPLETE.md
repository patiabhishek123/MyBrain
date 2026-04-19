## MyBrain Backend - Complete Architecture & Implementation

### Folder Structure

```
server/
├── src/
│   ├── config/
│   │   └── index.ts                    # Configuration management
│   ├── middleware/
│   │   ├── auth.ts                     # JWT authentication
│   │   └── errorHandler.ts             # Centralized error handling
│   ├── types/
│   │   └── index.ts                    # Shared TypeScript interfaces
│   ├── lib/
│   │   ├── llm/
│   │   │   ├── types.ts                # LLM interface definitions
│   │   │   ├── openai.provider.ts      # OpenAI implementation
│   │   │   └── index.ts                # Provider factory pattern
│   │   └── vector-db/
│   │       ├── types.ts                # Vector DB interface
│   │       ├── pinecone.provider.ts    # Pinecone implementation
│   │       └── index.ts                # Vector store singleton
│   ├── repositories/
│   │   ├── user.repository.ts          # User data access
│   │   ├── project.repository.ts       # Project data access
│   │   ├── source.repository.ts        # Source data access
│   │   ├── embedding.repository.ts     # Embedding data access
│   │   └── chat.repository.ts          # Chat & messages data access
│   ├── services/
│   │   ├── auth.service.ts             # Auth business logic
│   │   ├── project.service.ts          # Project operations
│   │   ├── ingestion.service.ts        # Source ingestion
│   │   ├── embedding.service.ts        # Embedding generation
│   │   ├── retrieval.service.ts        # RAG retrieval logic
│   │   └── chat.service.ts             # Chat operations with RAG
│   ├── controllers/
│   │   ├── auth.controller.ts          # Auth routes handler
│   │   ├── project.controller.ts       # Project routes handler
│   │   ├── ingestion.controller.ts     # Ingestion routes handler
│   │   └── chat.controller.ts          # Chat routes handler
│   ├── routes/
│   │   ├── auth.routes.ts              # /api/auth endpoints
│   │   ├── project.routes.ts           # /api/projects endpoints
│   │   ├── ingestion.routes.ts         # /api/sources endpoints
│   │   └── chat.routes.ts              # /api/chats endpoints
│   ├── queues/
│   │   └── embedding.queue.ts          # BullMQ job queue
│   ├── workers/
│   │   └── embedding.worker.ts         # BullMQ job worker
│   └── index.ts                        # Express app entry point
│
├── prisma/
│   └── schema.prisma                   # Database schema (Postgres)
│
├── .env.example                        # Environment variables template
├── package.json                        # Dependencies & scripts
├── tsconfig.json                       # TypeScript config
├── ARCHITECTURE.md                     # Detailed architecture docs
└── README.md                           # Quick start guide
```

### Module Breakdown

#### 1. Auth Module
- **Entry**: `POST /api/auth/register`, `POST /api/auth/login`
- **Layer Flow**:
  - Controller: Input validation, response formatting
  - Service: Password hashing, token generation, user validation
  - Repository: User CRUD operations
  - Database: User table

#### 2. Projects Module
- **Entry**: `POST|GET|PUT|DELETE /api/projects`
- **Purpose**: Create and organize knowledge projects
- **Authorization**: JWT token required

#### 3. Sources/Ingestion Module
- **Entry**: `POST|GET|DELETE /api/sources`
- **Types Supported**: TEXT, URL, YOUTUBE, PDF, FILE
- **Flow**:
  1. Source created via API
  2. Enqueued to BullMQ embedding queue
  3. Worker processes embedding async
  4. Vectors stored in PostgreSQL + Pinecone

#### 4. Embeddings Module
- **Components**:
  - `EmbeddingService`: Orchestrates embedding process
  - `embedding.queue.ts`: Job queue configuration
  - `embedding.worker.ts`: Async job processor
- **Process**: Source → LLM embedding → Vector storage

#### 5. Retrieval (RAG) Module
- **RetrievalService**:
  - Query embedding generation
  - Vector similarity search in Pinecone
  - Context enrichment from PostgreSQL
  - RAG prompt building
- **Used By**: Chat service for context retrieval

#### 6. Chat Module
- **Entry**: `POST|GET|DELETE /api/chats`, `POST /api/chats/:id/message`
- **RAG Flow**:
  1. User sends message
  2. Retrieve similar contexts
  3. Build RAG prompt with contexts
  4. Generate LLM response
  5. Store in chat history

#### 7. LLM Abstraction Layer
- **Location**: `src/lib/llm/`
- **Interface**:
  ```typescript
  interface LLMProvider {
    generateCompletion(prompt: string): Promise<string>;
    generateEmbedding(text: string): Promise<number[]>;
    streamCompletion(prompt: string, onChunk: (chunk: string) => void): Promise<void>;
  }
  ```
- **Current Implementation**: OpenAI
- **Extensible For**: Cerebras, Anthropic, Ollama, etc.
- **Provider Pattern**: `LLMFactory.createProvider('openai')`

### Architecture Layers

```
Request → Route → Controller → Service → Repository → Database
                      ↓
              Middleware (Auth, Error)
                      ↓
              External Libraries (LLM, Vector DB)
```

#### Layer Responsibilities

| Layer | Responsibility | File Location |
|-------|-----------------|---------------|
| **Routes** | Define API endpoints | `src/routes/` |
| **Controllers** | HTTP request/response handling | `src/controllers/` |
| **Services** | Business logic & orchestration | `src/services/` |
| **Repositories** | Data access abstraction | `src/repositories/` |
| **Middleware** | Cross-cutting concerns | `src/middleware/` |
| **Libraries** | External integrations | `src/lib/` |

### Background Processing

**BullMQ Job Queue**:
- **Queue File**: `src/queues/embedding.queue.ts`
- **Worker File**: `src/workers/embedding.worker.ts`
- **Redis Backend**: Configured via `REDIS_URL`

**Flow**:
1. Source ingested → `enqueueEmbedding(sourceId)`
2. Job added to queue with retry (3 attempts, exponential backoff)
3. Worker picks up job and processes
4. Results stored in DB + vector DB

### Database Schema

**Tables**:
- `users` - User accounts
- `projects` - Knowledge projects
- `sources` - Data sources
- `embeddings` - Stored vectors
- `chats` - Conversation sessions
- `chat_messages` - Message history

**Key Relationships**:
- User → Projects (1:N)
- Project → Sources (1:N)
- Source → Embeddings (1:N)
- User → Chats (1:N)
- Project → Chats (1:N)
- Chat → Messages (1:N)

### Configuration

**Environment Variables** (see `.env.example`):
```
DATABASE_URL=postgresql://user:pass@host:5432/mybrain
JWT_SECRET=your-secret-key
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-west-4
PINECONE_INDEX_NAME=mybrain-index
REDIS_URL=redis://localhost:6379
PORT=5000
NODE_ENV=development
```

### Dependency Injection Pattern

Services and controllers are instantiated in route files for easy testing:

```typescript
// src/routes/auth.routes.ts
const userRepo = new UserRepository(prisma);
const authService = new AuthService(userRepo);
const authController = new AuthController(authService);

router.post('/register', authController.register);
```

**Benefits**:
- Easy to mock/replace implementations
- Clear dependency tree
- Testable architecture
- No global state

### Error Handling

**Centralized Error Handler** (`src/middleware/errorHandler.ts`):
- Catches all async route errors
- Formats error responses
- Includes stack traces in development
- Custom `AppError` class for typed errors

```typescript
throw new AppError(404, 'Resource not found');
// Returns: { success: false, error: 'Resource not found' }
```

### API Structure

```
GET  /health                                        # Health check
POST /api/auth/register                            # Register user
POST /api/auth/login                               # Login user
POST /api/projects                                 # Create project
GET  /api/projects                                 # List projects
GET  /api/projects/:id                             # Get project
PUT  /api/projects/:id                             # Update project
DELETE /api/projects/:id                           # Delete project
POST /api/sources                                  # Ingest source
GET  /api/sources/project/:projectId               # List sources
DELETE /api/sources/:sourceId/project/:projectId   # Delete source
POST /api/chats                                    # Create chat
GET  /api/chats/project/:projectId                 # List chats
GET  /api/chats/:chatId                            # Get chat
POST /api/chats/:chatId/message                    # Send message
DELETE /api/chats/:chatId                          # Delete chat
```

### Getting Started

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start dev server
npm run dev

# Open Prisma Studio
npm run prisma:studio
```

### Production Deployment Checklist

- [ ] Install all packages: `npm install`
- [ ] Setup PostgreSQL database
- [ ] Setup Redis for BullMQ
- [ ] Setup Pinecone vector database
- [ ] Setup OpenAI API key
- [ ] Configure environment variables
- [ ] Run Prisma migrations
- [ ] Build TypeScript: `npm run build`
- [ ] Start server: `npm start`
- [ ] Setup SSL/TLS certificates
- [ ] Setup monitoring & logging
- [ ] Setup CI/CD pipeline
- [ ] Add request validation (zod/joi)
- [ ] Add API documentation (Swagger)
- [ ] Add unit & integration tests

### Future Enhancements

- [ ] Support for additional LLM providers (Cerebras, Anthropic, Ollama)
- [ ] Streaming responses via WebSockets
- [ ] Advanced permission system (project sharing)
- [ ] Rate limiting & request throttling
- [ ] Advanced search with filters
- [ ] Export/backup functionality
- [ ] Analytics & usage metrics
- [ ] Multi-language support
