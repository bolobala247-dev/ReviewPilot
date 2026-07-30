import OpenAI from 'openai';
import { IAIProvider, AIReviewRequest, AIReviewResponse } from '@domain/ports';
import { AppError, ErrorCode } from '@domain/errors';
import { logger } from '../logger';

export interface OpenAIAdapterConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  timeoutMs?: number;
}

export class OpenAIAdapter implements IAIProvider {
  readonly name = 'openai';
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

  async review(request: AIReviewRequest): Promise<AIReviewResponse> {
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
      const durationMs = Date.now() - startTime;

      logger.info(
        { provider: this.name, model: this.model, durationMs, tokensUsed },
        'AI review completed',
      );

      return {
        content,
        tokensUsed,
        model: this.model,
      };
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): AppError {
    const err = error as { status?: number; code?: string; message?: string; name?: string };
    const cause = error instanceof Error ? error : undefined;

    if (err.name === 'APIConnectionTimeoutError' || err.code === 'ETIMEDOUT') {
      return new AppError(ErrorCode.TIMEOUT, 'OpenAI request timed out', true, cause);
    }

    if (err.status === 401) {
      return new AppError(ErrorCode.AUTH_FAILED, 'OpenAI authentication failed', false, cause);
    }

    if (err.status === 429) {
      return new AppError(ErrorCode.RATE_LIMIT, 'OpenAI rate limit exceeded', true, cause);
    }

    const message = err.message ?? 'Unknown error';
    return new AppError(ErrorCode.PROVIDER_ERROR, `OpenAI API error: ${message}`, true, cause);
  }
}
