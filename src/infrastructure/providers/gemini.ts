import { GoogleGenerativeAI } from '@google/generative-ai';
import { IAIProvider, AIReviewRequest, AIReviewResponse } from '@domain/ports';
import { AppError, ErrorCode } from '@domain/errors';

export interface GeminiAdapterConfig {
  apiKey: string;
  model: string;
  temperature?: number;
}

export class GeminiAdapter implements IAIProvider {
  readonly name = 'gemini';
  private client: GoogleGenerativeAI;
  private model: string;
  private defaultTemperature: number;

  constructor(config: GeminiAdapterConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model;
    this.defaultTemperature = config.temperature ?? 0.1;
  }

  async review(request: AIReviewRequest): Promise<AIReviewResponse> {
    try {
      const model = this.client.getGenerativeModel({
        model: this.model,
        generationConfig: {
          temperature: request.temperature ?? this.defaultTemperature,
          responseMimeType: 'application/json',
        },
      });

      const prompt = `${request.systemPrompt}\n\n${request.userPrompt}`;
      const result = await model.generateContent(prompt);
      const response = await result.response;

      const content = response.text() ?? '{}';
      const tokensUsed = response.usageMetadata?.totalTokenCount ?? 0;

      return {
        content,
        tokensUsed,
        model: this.model,
      };
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 429 || err.message?.includes('429')) {
        throw new AppError(
          ErrorCode.RATE_LIMIT,
          'Gemini rate limit exceeded',
          true,
          error as Error,
        );
      }
      if (err.status === 401 || err.message?.includes('API key')) {
        throw new AppError(
          ErrorCode.AUTH_FAILED,
          'Gemini authentication failed',
          false,
          error as Error,
        );
      }
      throw new AppError(
        ErrorCode.PROVIDER_ERROR,
        `Gemini API error: ${err.message}`,
        true,
        error as Error,
      );
    }
  }
}
