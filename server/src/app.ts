import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { healthRouter } from "./shared/http/health.route.js";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));

app.use("/health", healthRouter);
