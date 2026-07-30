import Anthropic from '@anthropic-ai/sdk';
import { IAIProvider, AIReviewRequest, AIResponse } from '@domain/ports';
import { AppError, ErrorCode } from '@domain/errors';
import { logger } from '../logger';

export interface AnthropicAdapterConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  timeoutMs?: number;
}

export class AnthropicAdapter implements IAIProvider {
  readonly name = 'anthropic' as const;
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly defaultTemperature: number;
  private readonly timeoutMs: number;

  constructor(config: AnthropicAdapterConfig) {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new AppError(ErrorCode.CONFIG_ERROR, 'Anthropic API key is required', false);
    }
    this.client = new Anthropic({
      apiKey: config.apiKey,
      timeout: config.timeoutMs ?? 30000,
    });
    this.model = config.model;
    this.defaultTemperature = config.temperature ?? 0.1;
    this.timeoutMs = config.timeoutMs ?? 30000;
  }

  async review(request: AIReviewRequest): Promise<AIResponse> {
    const startTime = Date.now();
    try {
      const response = await this.client.messages.create(
        {
          model: this.model,
          max_tokens: 4096,
          temperature: request.temperature ?? this.defaultTemperature,
          system: request.systemPrompt,
          messages: [{ role: 'user', content: request.userPrompt }],
        },
        {
          timeout: this.timeoutMs,
        },
      );

      const textBlocks = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text);

      const content = textBlocks.join('\n');
      const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);
      const durationMs = Date.now() - startTime;

      logger.info(
        { provider: this.name, model: this.model, durationMs, tokensUsed },
        'AI review completed',
      );

      return {
        content,
        metadata: {
          provider: this.name,
          model: this.model,
          tokensUsed,
          durationMs,
        },
      };
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): AppError {
    const status = getErrorStatus(error);
    const name = getErrorName(error);
    const message = getErrorMessage(error);
    const cause = error instanceof Error ? error : undefined;

    if (name === 'APIConnectionTimeoutError' || message.includes('timeout')) {
      return new AppError(ErrorCode.TIMEOUT, 'Anthropic request timed out', true, cause);
    }

    if (status === 401) {
      return new AppError(ErrorCode.AUTH_FAILED, 'Anthropic authentication failed', false, cause);
    }

    if (status === 429) {
      return new AppError(ErrorCode.RATE_LIMIT, 'Anthropic rate limit exceeded', true, cause);
    }

    return new AppError(ErrorCode.PROVIDER_ERROR, `Anthropic API error: ${message}`, true, cause);
  }
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const s = (error as { status: unknown }).status;
    return typeof s === 'number' ? s : undefined;
  }
  return undefined;
}

function getErrorName(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.name;
  }
  if (typeof error === 'object' && error !== null && 'name' in error) {
    const n = (error as { name: unknown }).name;
    return typeof n === 'string' ? n : undefined;
  }
  return undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const m = (error as { message: unknown }).message;
    return typeof m === 'string' ? m : 'Unknown error';
  }
  return 'Unknown error';
}
