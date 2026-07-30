import { IAIProvider } from '@domain/ports';
import { AppError, ErrorCode } from '@domain/errors';
import { AIConfig } from '../config';
import { OpenAIAdapter } from './openai';
import { GeminiAdapter } from './gemini';
import { AnthropicAdapter } from './anthropic';

export function createProvider(config: AIConfig): IAIProvider {
  if (!config.apiKey || config.apiKey.trim().length === 0) {
    throw new AppError(
      ErrorCode.CONFIG_ERROR,
      `API key is required for provider ${config.provider}`,
      false,
    );
  }

  switch (config.provider) {
    case 'openai':
      return new OpenAIAdapter(config);
    case 'gemini':
      return new GeminiAdapter(config);
    case 'anthropic':
      return new AnthropicAdapter(config);
    default:
      throw new AppError(
        ErrorCode.CONFIG_ERROR,
        `Unsupported AI provider: ${(config as { provider: string }).provider}`,
        false,
      );
  }
}

export { OpenAIAdapter, GeminiAdapter, AnthropicAdapter };
