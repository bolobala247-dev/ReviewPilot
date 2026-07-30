export interface AIReviewRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

export interface AIReviewResponse {
  content: string;
  tokensUsed: number;
  model: string;
}

export interface IAIProvider {
  readonly name: string;
  review(request: AIReviewRequest): Promise<AIReviewResponse>;
}
