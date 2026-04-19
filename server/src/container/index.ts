import { createLlmProvider } from "../infrastructure/llm/core/LlmFactory.js";
import { ChatService } from "../modules/chat/chat.service.js";
import { ProjectAccessService } from "../modules/projects/project-access.service.js";
import { RetrievalService } from "../modules/retrieval/retrieval.service.js";

export interface AppContainer {
  chatService: ChatService;
}

export const buildContainer = (): AppContainer => {
  const llmProvider = createLlmProvider();
  const projectAccessService = new ProjectAccessService();
  const retrievalService = new RetrievalService(llmProvider, projectAccessService);

  return {
    chatService: new ChatService(retrievalService, llmProvider)
  };
};
