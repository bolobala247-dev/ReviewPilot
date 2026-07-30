import Anthropic from '@anthropic-ai/sdk';
import { IAIProvider, AIReviewRequest, AIReviewResponse } from '@domain/ports';
import { AppError, ErrorCode } from '@domain/errors';

export interface AnthropicAdapterConfig {
  apiKey: string;
  model: string;
  temperature?: number;
}

export class AnthropicAdapter implements IAIProvider {
  readonly name = 'anthropic';
  private client: Anthropic;
  private model: string;
  private defaultTemperature: number;

  constructor(config: AnthropicAdapterConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model;
    this.defaultTemperature = config.temperature ?? 0.1;
  }

  async review(request: AIReviewRequest): Promise<AIReviewResponse> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        temperature: request.temperature ?? this.defaultTemperature,
        system: request.systemPrompt,
        messages: [{ role: 'user', content: request.userPrompt }],
      });

      const contentBlock = response.content[0];
      const content = contentBlock?.type === 'text' ? contentBlock.text : '{}';
      const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

      return {
        content,
        tokensUsed,
        model: this.model,
      };
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 429) {
        throw new AppError(
          ErrorCode.RATE_LIMIT,
          'Anthropic rate limit exceeded',
          true,
          error as Error,
        );
      }
      if (err.status === 401) {
        throw new AppError(
          ErrorCode.AUTH_FAILED,
          'Anthropic authentication failed',
          false,
          error as Error,
        );
      }
      if (err.status && err.status >= 500) {
        throw new AppError(
          ErrorCode.TIMEOUT,
          'Anthropic server error/timeout',
          true,
          error as Error,
        );
      }
      throw new AppError(
        ErrorCode.PROVIDER_ERROR,
        `Anthropic API error: ${err.message}`,
        true,
        error as Error,
      );
    }
  }
}
