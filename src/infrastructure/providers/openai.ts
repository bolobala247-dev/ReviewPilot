import OpenAI from 'openai';
import { IAIProvider, AIReviewRequest, AIResponse } from '@domain/ports';
import { AppError, ErrorCode } from '@domain/errors';
import { logger } from '../logger';

export interface OpenAIAdapterConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  timeoutMs?: number;
}

export class OpenAIAdapter implements IAIProvider {
  readonly name = 'openai' as const;
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly defaultTemperature: number;
  private readonly timeoutMs: number;

  constructor(config: OpenAIAdapterConfig) {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new AppError(ErrorCode.CONFIG_ERROR, 'OpenAI API key is required', false);
    }
    this.client = new OpenAI({
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
      const response = await this.client.chat.completions.create(
        {
          model: this.model,
          temperature: request.temperature ?? this.defaultTemperature,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt },
          ],
          response_format: { type: 'json_object' },
        },
        {
          timeout: this.timeoutMs,
        },
      );

      const firstChoice = response.choices[0];
      const content = firstChoice?.message?.content ?? '';
      const tokensUsed = response.usage?.total_tokens ?? 0;
      const inputTokens = response.usage?.prompt_tokens ?? 0;
      const outputTokens = response.usage?.completion_tokens ?? 0;
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
          inputTokens,
          outputTokens,
          durationMs,
        },
      };
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): AppError {
    const status = getErrorStatus(error);
    const code = getErrorCode(error);
    const name = getErrorName(error);
    const message = getErrorMessage(error);
    const cause = error instanceof Error ? error : undefined;

    if (name === 'APIConnectionTimeoutError' || code === 'ETIMEDOUT') {
      return new AppError(ErrorCode.TIMEOUT, 'OpenAI request timed out', true, cause);
    }

    if (status === 401) {
      return new AppError(ErrorCode.AUTH_FAILED, 'OpenAI authentication failed', false, cause);
    }

    if (status === 429) {
      return new AppError(ErrorCode.RATE_LIMIT, 'OpenAI rate limit exceeded', true, cause);
    }

    return new AppError(ErrorCode.PROVIDER_ERROR, `OpenAI API error: ${message}`, true, cause);
  }
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const s = (error as { status: unknown }).status;
    return typeof s === 'number' ? s : undefined;
  }
  return undefined;
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const c = (error as { code: unknown }).code;
    return typeof c === 'string' ? c : undefined;
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
