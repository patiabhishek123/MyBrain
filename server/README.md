# MyBrain - Production Backend Architecture

A production-grade Retrieval-Augmented Generation (RAG) backend built with Node.js, Express, TypeScript, PostgreSQL, Prisma, Pinecone, and BullMQ.

## Features

✅ **Clean Architecture** - Routes → Controllers → Services → Repositories  
✅ **Modular Design** - 7 independent modules with clear responsibilities  
✅ **Dependency Injection** - Easily testable and swappable implementations  
✅ **LLM Abstraction** - Switch between OpenAI, Cerebras, or other providers  
✅ **Vector Database** - Pinecone integration for semantic search  
✅ **Job Queue** - BullMQ for async embedding processing  
✅ **Type-Safe** - Full TypeScript with strict mode  
✅ **Error Handling** - Centralized error management  

## Tech Stack

- **Node.js + Express** - Web framework
- **TypeScript** - Type safety
- **PostgreSQL + Prisma** - Database & ORM
- **Pinecone** - Vector database
- **OpenAI** - LLM provider (with abstraction)
- **BullMQ** - Job queue for background tasks
- **JWT** - Authentication
- **Redis** - Queue backend

## Modules

| Module | Purpose |
|--------|---------|
| **Auth** | User registration, login, JWT tokens |
| **Projects** | Create & manage knowledge projects |
| **Sources** | Ingest text, URLs, YouTube, PDFs, files |
| **Ingestion Pipeline** | Process and store sources |
| **Embeddings** | Generate & store vector embeddings |
| **Retrieval (RAG)** | Query vectors and build RAG prompts |
| **Chat** | Conversational interface with RAG |

## Folder Structure

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete folder layout and layer descriptions.

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Setup database
npm run prisma:migrate

# Start development server
npm run dev

# Open Prisma Studio
npm run prisma:studio
```

## API Endpoints

### Auth
```
POST   /api/auth/register     - Register user
POST   /api/auth/login        - Login user
```

### Projects
```
POST   /api/projects          - Create project
GET    /api/projects          - List user's projects
GET    /api/projects/:id      - Get project
PUT    /api/projects/:id      - Update project
DELETE /api/projects/:id      - Delete project
```

### Sources
```
POST   /api/sources           - Ingest source
GET    /api/sources/project/:projectId  - List sources
DELETE /api/sources/:sourceId/project/:projectId  - Delete source
```

### Chat
```
POST   /api/chats             - Create chat
GET    /api/chats/project/:projectId    - List chats
GET    /api/chats/:chatId     - Get chat history
POST   /api/chats/:chatId/message       - Send message (triggers RAG)
DELETE /api/chats/:chatId     - Delete chat
```

## LLM Abstraction

Switch providers easily:

```typescript
// src/lib/llm/index.ts
export const llmProvider = LLMFactory.createProvider('openai');
// Change to: LLMFactory.createProvider('cerebras')
```

Implement new providers by implementing the `LLMProvider` interface.

## Background Jobs

Embeddings are processed asynchronously via BullMQ:

1. Source ingested → Job enqueued
2. Worker processes embedding in background
3. Vector stored in Pinecone + PostgreSQL

See `src/workers/embedding.worker.ts` and `src/queues/embedding.queue.ts`

## Database Schema

- **User** - Auth & ownership
- **Project** - Knowledge organization
- **Source** - Data sources (text, URLs, PDFs, YouTube)
- **Embedding** - Vectors & metadata
- **Chat** - Conversation sessions
- **ChatMessage** - Message history

See `prisma/schema.prisma`

## Configuration

Required environment variables in `.env`:

```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
REDIS_URL=redis://localhost:6379
PORT=5000
```

## Development

```bash
npm run build      # Compile TypeScript
npm run dev        # Dev server with auto-reload
npm run type-check # Type checking
npm run prisma:migrate  # Run migrations
```

## Error Handling

Centralized error handler in `src/middleware/errorHandler.ts`:
- Catches async route errors
- Formats error responses
- Includes stack traces in development

## Next Steps

- [ ] Implement Pinecone client
- [ ] Implement OpenAI client (@openai/sdk)
- [ ] Add request validation (zod/joi)
- [ ] Setup logging (winston/pino)
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Setup CI/CD pipeline
- [ ] Add unit & integration tests
