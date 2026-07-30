import { GoogleGenerativeAI } from '@google/generative-ai';
import { IAIProvider, AIReviewRequest, AIReviewResponse } from '@domain/ports';
import { AppError, ErrorCode } from '@domain/errors';
import { logger } from '../logger';

export interface GeminiAdapterConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  timeoutMs?: number;
}

export class GeminiAdapter implements IAIProvider {
  readonly name = 'gemini';
  private readonly client: GoogleGenerativeAI;
  private readonly model: string;
  private readonly defaultTemperature: number;
  private readonly timeoutMs: number;

  constructor(config: GeminiAdapterConfig) {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new AppError(ErrorCode.CONFIG_ERROR, 'Gemini API key is required', false);
    }
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model;
    this.defaultTemperature = config.temperature ?? 0.1;
    this.timeoutMs = config.timeoutMs ?? 30000;
  }

  async review(request: AIReviewRequest): Promise<AIReviewResponse> {
    const startTime = Date.now();
    try {
      const model = this.client.getGenerativeModel({
        model: this.model,
        generationConfig: {
          temperature: request.temperature ?? this.defaultTemperature,
          responseMimeType: 'application/json',
        },
      });

      const prompt = `${request.systemPrompt}\n\n${request.userPrompt}`;

      const generatePromise = model.generateContent(prompt);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new AppError(ErrorCode.TIMEOUT, 'Gemini request timed out', true));
        }, this.timeoutMs);
      });

      const result = await Promise.race([generatePromise, timeoutPromise]);
      const response = await result.response;

      const content = response.text() ?? '';
      const tokensUsed = response.usageMetadata?.totalTokenCount ?? 0;
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
      if (error instanceof AppError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): AppError {
    const err = error as { status?: number; message?: string; name?: string };
    const cause = error instanceof Error ? error : undefined;

    if (err.name === 'AbortError' || err.message?.includes('timeout')) {
      return new AppError(ErrorCode.TIMEOUT, 'Gemini request timed out', true, cause);
    }

    if (err.status === 401 || err.message?.includes('API key')) {
      return new AppError(ErrorCode.AUTH_FAILED, 'Gemini authentication failed', false, cause);
    }

    if (err.status === 429 || err.message?.includes('429')) {
      return new AppError(ErrorCode.RATE_LIMIT, 'Gemini rate limit exceeded', true, cause);
    }

    const message = err.message ?? 'Unknown error';
    return new AppError(ErrorCode.PROVIDER_ERROR, `Gemini API error: ${message}`, true, cause);
  }
}
