import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

import { env } from "../../../config/env.js";

const pool = new Pool({
	connectionString: env.DATABASE_URL,
	max: 20,
	idleTimeoutMillis: 30_000
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
