import { IAIProvider } from '@domain/ports';
import { AppConfig } from '@infrastructure/config';
import { OpenAIAdapter } from './openai';
import { GeminiAdapter } from './gemini';
import { AnthropicAdapter } from './anthropic';
import { AppError, ErrorCode } from '@domain/errors';

export function createProvider(config: AppConfig): IAIProvider {
  switch (config.ai.provider) {
    case 'openai':
      return new OpenAIAdapter(config.ai);
    case 'gemini':
      return new GeminiAdapter(config.ai);
    case 'anthropic':
      return new AnthropicAdapter(config.ai);
    default:
      throw new AppError(
        ErrorCode.CONFIG_ERROR,
        `Unknown AI provider: ${(config.ai as { provider: string }).provider}`,
      );
  }
}

export { OpenAIAdapter, GeminiAdapter, AnthropicAdapter };
