import OpenAI from 'openai';
import { IAIProvider, AIReviewRequest, AIReviewResponse } from '@domain/ports';
import { AppError, ErrorCode } from '@domain/errors';

export interface OpenAIAdapterConfig {
  apiKey: string;
  model: string;
  temperature?: number;
}

export class OpenAIAdapter implements IAIProvider {
  readonly name = 'openai';
  private client: OpenAI;
  private model: string;
  private defaultTemperature: number;

  constructor(config: OpenAIAdapterConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model;
    this.defaultTemperature = config.temperature ?? 0.1;
  }

  async review(request: AIReviewRequest): Promise<AIReviewResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        temperature: request.temperature ?? this.defaultTemperature,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content ?? '{}';
      const tokensUsed = response.usage?.total_tokens ?? 0;

      return {
        content,
        tokensUsed,
        model: this.model,
      };
    } catch (error: unknown) {
      const err = error as { status?: number; code?: string; message?: string };
      if (err.status === 429) {
        throw new AppError(
          ErrorCode.RATE_LIMIT,
          'OpenAI rate limit exceeded',
          true,
          error as Error,
        );
      }
      if (err.status === 401) {
        throw new AppError(
          ErrorCode.AUTH_FAILED,
          'OpenAI authentication failed',
          false,
          error as Error,
        );
      }
      if (err.code === 'ETIMEDOUT' || (err.status && err.status >= 500)) {
        throw new AppError(
          ErrorCode.TIMEOUT,
          'OpenAI connection timeout/error',
          true,
          error as Error,
        );
      }
      throw new AppError(
        ErrorCode.PROVIDER_ERROR,
        `OpenAI API error: ${err.message}`,
        true,
        error as Error,
      );
    }
  }
}
