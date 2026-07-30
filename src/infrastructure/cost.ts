export interface ModelPricing {
  /** USD per 1M input (prompt) tokens */
  inputPerMTok: number;
  /** USD per 1M output (completion) tokens */
  outputPerMTok: number;
}

// Public list prices (USD per 1M tokens). Longest-prefix match against the model name.
const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  'gpt-4o-mini': { inputPerMTok: 0.15, outputPerMTok: 0.6 },
  'gpt-4o': { inputPerMTok: 2.5, outputPerMTok: 10.0 },
  'gpt-4-turbo': { inputPerMTok: 10.0, outputPerMTok: 30.0 },
  // Google Gemini
  'gemini-1.5-flash': { inputPerMTok: 0.075, outputPerMTok: 0.3 },
  'gemini-1.5-pro': { inputPerMTok: 1.25, outputPerMTok: 5.0 },
  'gemini-2.0-flash': { inputPerMTok: 0.1, outputPerMTok: 0.4 },
  // Anthropic
  'claude-3-5-sonnet': { inputPerMTok: 3.0, outputPerMTok: 15.0 },
  'claude-3-5-haiku': { inputPerMTok: 0.8, outputPerMTok: 4.0 },
  'claude-3-opus': { inputPerMTok: 15.0, outputPerMTok: 75.0 },
};

// Conservative fallback per provider when the model has no explicit price entry.
const PROVIDER_DEFAULT_PRICING: Record<string, ModelPricing> = {
  openai: { inputPerMTok: 2.5, outputPerMTok: 10.0 },
  gemini: { inputPerMTok: 0.1, outputPerMTok: 0.4 },
  anthropic: { inputPerMTok: 3.0, outputPerMTok: 15.0 },
};

export function resolvePricing(provider: string, model: string): ModelPricing | undefined {
  const prefixes = Object.keys(MODEL_PRICING).sort((a, b) => b.length - a.length);
  for (const prefix of prefixes) {
    if (model.startsWith(prefix)) {
      return MODEL_PRICING[prefix];
    }
  }
  return PROVIDER_DEFAULT_PRICING[provider];
}

/**
 * Estimate the USD cost of a single AI call. Returns 0 when no pricing is known.
 * Estimation only — actual billing may differ (caching, tiering, price changes).
 */
export function estimateCostUsd(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = resolvePricing(provider, model);
  if (!pricing) {
    return 0;
  }
  const cost =
    (inputTokens / 1_000_000) * pricing.inputPerMTok +
    (outputTokens / 1_000_000) * pricing.outputPerMTok;
  return Number(cost.toFixed(6));
}
