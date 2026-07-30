import { describe, it, expect } from 'vitest';
import { buildPrompt } from '@application/prompt-builder';
import { FileDiff } from '@domain/types';

describe('PromptBuilder', () => {
  it('should interpolate variables into prompt templates', () => {
    const file: FileDiff = {
      filename: 'src/math.ts',
      language: 'typescript',
      patch: '+ return a + b;',
      additions: 1,
      deletions: 0,
    };

    const sysTemp = 'You are a code reviewer.';
    const userTemp = 'Review {{filename}} ({{language}}): {{patch}}';

    const res = buildPrompt(file, sysTemp, userTemp);

    expect(res.systemPrompt).toBe('You are a code reviewer.');
    expect(res.userPrompt).toBe('Review src/math.ts (typescript): + return a + b;');
  });
});
