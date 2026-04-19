import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { authRouter } from "./modules/auth/auth.route.js";
import { projectsRouter } from "./modules/projects/projects.route.js";
import { errorMiddleware } from "./shared/middleware/error.middleware.js";
import { healthRouter } from "./shared/http/health.route.js";

export const app = express();

app.disable("x-powered-by");

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));

app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/projects", projectsRouter);

app.use(errorMiddleware);
