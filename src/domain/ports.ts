export type AIProvider = 'openai' | 'gemini' | 'anthropic';

export interface AIReviewRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

export interface AIResponseMetadata {
  provider: AIProvider;
  model: string;
  tokensUsed?: number;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
}

export interface AIResponse {
  content: string;
  metadata: AIResponseMetadata;
}

// Backward compatibility alias for AIResponse
export type AIReviewResponse = AIResponse;

export interface IAIProvider {
  readonly name: AIProvider;
  review(request: AIReviewRequest): Promise<AIResponse>;
}
