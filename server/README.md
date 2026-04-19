# MyBrain Backend

Production-ready backend scaffold for a multi-tenant RAG system.

## Stack
- Node.js + Express + TypeScript
- Prisma + PostgreSQL
- Adapter-based Prisma client (`@prisma/adapter-pg`)

## Structure
- `src/app.ts` - Express middleware and route registration
- `src/main.ts` - process bootstrap
- `src/config` - env and runtime config
- `src/infrastructure` - Prisma, Pinecone, LLM providers, queues
- `src/modules` - clean architecture modules (`routes -> controllers -> services -> repositories`)
- `src/workers` - queue workers
- `prisma/schema.prisma` - data model
- `prisma.config.ts` - datasource and migrations config

## Next steps
1. Install dependencies: `npm install`
2. Generate Prisma client: `npm run prisma:generate`
3. Create migration: `npm run prisma:migrate:dev -- --name init`
4. Start server: `npm run dev`
