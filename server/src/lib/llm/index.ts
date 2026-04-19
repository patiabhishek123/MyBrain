import { LLMProvider } from './types.js';
import { OpenAIProvider } from './openai.provider.js';

// Abstraction to easily switch providers (e.g., Cerebras, Anthropic)
class LLMFactory {
  static createProvider(provider: 'openai' = 'openai'): LLMProvider {
    switch (provider) {
      case 'openai':
        return new OpenAIProvider();
      default:
        return new OpenAIProvider();
    }
  }
}

export const llmProvider = LLMFactory.createProvider('openai');
export { LLMProvider };
