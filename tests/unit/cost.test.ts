import { describe, it, expect } from 'vitest';
import { estimateCostUsd, resolvePricing } from '@infrastructure/cost';

describe('Cost Estimation', () => {
  describe('resolvePricing', () => {
    it('should resolve exact model prefixes', () => {
      expect(resolvePricing('openai', 'gpt-4o')).toEqual({
        inputPerMTok: 2.5,
        outputPerMTok: 10.0,
      });
      expect(resolvePricing('anthropic', 'claude-3-5-sonnet-20240620')).toEqual({
        inputPerMTok: 3.0,
        outputPerMTok: 15.0,
      });
    });

    it('should prefer the longest matching prefix (gpt-4o-mini over gpt-4o)', () => {
      expect(resolvePricing('openai', 'gpt-4o-mini-2024-07-18')).toEqual({
        inputPerMTok: 0.15,
        outputPerMTok: 0.6,
      });
    });

    it('should fall back to provider default for unknown models', () => {
      expect(resolvePricing('gemini', 'gemini-3.6-flash')).toEqual({
        inputPerMTok: 0.1,
        outputPerMTok: 0.4,
      });
    });

    it('should return undefined for unknown provider and model', () => {
      expect(resolvePricing('unknown-provider', 'unknown-model')).toBeUndefined();
    });
  });

  describe('estimateCostUsd', () => {
    it('should compute cost from input and output token pricing', () => {
      // gpt-4o: $2.50/1M in + $10.00/1M out
      const cost = estimateCostUsd('openai', 'gpt-4o', 1_000_000, 100_000);
      expect(cost).toBeCloseTo(2.5 + 1.0, 6);
    });

    it('should return 0 for zero tokens', () => {
      expect(estimateCostUsd('openai', 'gpt-4o', 0, 0)).toBe(0);
    });

    it('should return 0 when no pricing is known', () => {
      expect(estimateCostUsd('unknown-provider', 'mystery-model', 5000, 500)).toBe(0);
    });

    it('should round to 6 decimal places', () => {
      const cost = estimateCostUsd('gemini', 'gemini-1.5-flash', 4200, 512);
      expect(cost).toBe(Number(((4200 / 1e6) * 0.075 + (512 / 1e6) * 0.3).toFixed(6)));
    });
  });
});
