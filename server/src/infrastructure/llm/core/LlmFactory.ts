import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/AppError.js";
import { OpenAiProvider } from "../providers/openai/OpenAiProvider.js";
import type { LlmProvider } from "./LlmProvider.js";

export const createLlmProvider = (): LlmProvider => {
  switch (env.LLM_PROVIDER) {
    case "openai":
      return new OpenAiProvider();
    case "cerebras":
      throw new AppError("Cerebras provider is not implemented yet", 500);
    default:
      throw new AppError("Unsupported LLM provider", 500);
  }
};
