import { createLlmProvider } from "../infrastructure/llm/core/LlmFactory.js";
import { ChatService } from "../modules/chat/chat.service.js";

export interface AppContainer {
  chatService: ChatService;
}

export const buildContainer = (): AppContainer => {
  const llmProvider = createLlmProvider();

  return {
    chatService: new ChatService(llmProvider)
  };
};
