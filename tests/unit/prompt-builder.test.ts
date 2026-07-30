import { describe, it, expect } from 'vitest';
import { buildPrompt } from '@application/prompt-builder';
import { FileDiff } from '@domain/types';

describe('PromptBuilder', () => {
  const sysTemplate = 'You are a code reviewer.';
  const userTemplate = 'PR Title: {{PR_TITLE}}\n\nFiles:\n{{FILES}}';

  it('should build a prompt for a PR with a single file', () => {
    const files: FileDiff[] = [
      {
        filename: 'src/math.ts',
        language: 'typescript',
        patch: '+ return a + b;',
        additions: 1,
        deletions: 0,
      },
    ];

    const res = buildPrompt({
      prTitle: 'Fix math addition',
      files,
      systemTemplate: sysTemplate,
      userTemplate,
    });

    expect(res.systemPrompt).toBe('You are a code reviewer.');
    expect(res.userPrompt).toContain('PR Title: Fix math addition');
    expect(res.userPrompt).toContain('### File: src/math.ts');
    expect(res.userPrompt).toContain('+ return a + b;');
    expect(res.truncated).toBe(false);
  });

  it('should build a prompt for a PR with multiple files', () => {
    const files: FileDiff[] = [
      {
        filename: 'src/a.ts',
        language: 'typescript',
        patch: '+ const a = 1;',
        additions: 1,
        deletions: 0,
      },
      {
        filename: 'src/b.ts',
        language: 'typescript',
        patch: '+ const b = 2;',
        additions: 1,
        deletions: 0,
      },
    ];

    const res = buildPrompt({
      prTitle: 'Add variables',
      files,
      systemTemplate: sysTemplate,
      userTemplate,
    });

    expect(res.userPrompt).toContain('### File: src/a.ts');
    expect(res.userPrompt).toContain('### File: src/b.ts');
    expect(res.truncated).toBe(false);
  });

  it('should handle undefined or empty patch gracefully', () => {
    const files: FileDiff[] = [
      {
        filename: 'assets/image.png',
        language: 'plaintext',
        patch: undefined as unknown as string,
        additions: 0,
        deletions: 0,
      },
    ];

    const res = buildPrompt({
      prTitle: 'Add image asset',
      files,
      systemTemplate: sysTemplate,
      userTemplate,
    });

    expect(res.userPrompt).toContain('### File: assets/image.png');
    expect(res.userPrompt).toContain('```diff\n\n```');
  });

  it('should handle empty PR with zero files', () => {
    const res = buildPrompt({
      prTitle: 'Empty Pull Request',
      files: [],
      systemTemplate: sysTemplate,
      userTemplate,
    });

    expect(res.userPrompt).toBe('PR Title: Empty Pull Request\n\nFiles:');
    expect(res.truncated).toBe(false);
  });

  it('should apply limits and truncate large PRs exceeding maxFiles or maxTotalChars', () => {
    const files: FileDiff[] = Array.from({ length: 10 }, (_, i) => ({
      filename: `file_${i + 1}.ts`,
      language: 'typescript',
      patch: `+ content line ${i + 1}`,
      additions: 1,
      deletions: 0,
    }));

    // Limit to max 3 files
    const resFiles = buildPrompt({
      prTitle: 'Large PR file limit',
      files,
      systemTemplate: sysTemplate,
      userTemplate,
      limits: { maxFiles: 3 },
    });

    expect(resFiles.truncated).toBe(true);
    expect(resFiles.userPrompt).toContain('file_1.ts');
    expect(resFiles.userPrompt).toContain('file_3.ts');
    expect(resFiles.userPrompt).not.toContain('file_4.ts');

    // Limit by maxTotalChars
    const resChars = buildPrompt({
      prTitle: 'Large PR char limit',
      files,
      systemTemplate: sysTemplate,
      userTemplate,
      limits: { maxTotalChars: 250 },
    });

    expect(resChars.truncated).toBe(true);
  });

  it('should guarantee immutable input by not mutating original files or options', () => {
    const originalFile: FileDiff = Object.freeze({
      filename: 'src/immutable.ts',
      language: 'typescript',
      patch: '+ const immutable = true;',
      additions: 1,
      deletions: 0,
    });

    const files = Object.freeze([originalFile]);
    const input = Object.freeze({
      prTitle: 'Immutable Test',
      files,
      systemTemplate: sysTemplate,
      userTemplate,
    });

    expect(() => buildPrompt(input)).not.toThrow();
    expect(files[0]?.filename).toBe('src/immutable.ts');
  });

  it('should produce bit-for-bit deterministic output for identical inputs', () => {
    const files: FileDiff[] = [
      {
        filename: 'src/det.ts',
        language: 'typescript',
        patch: '+ console.log("det");',
        additions: 1,
        deletions: 0,
      },
    ];

    const input = {
      prTitle: 'Deterministic PR',
      files,
      systemTemplate: sysTemplate,
      userTemplate,
    };

    const res1 = buildPrompt(input);
    const res2 = buildPrompt(input);

    expect(res1.systemPrompt).toBe(res2.systemPrompt);
    expect(res1.userPrompt).toBe(res2.userPrompt);
    expect(res1.truncated).toBe(res2.truncated);
  });

  it('should escape markdown code fences inside diff patches safely', () => {
    const files: FileDiff[] = [
      {
        filename: 'README.md',
        language: 'markdown',
        patch: '+ ```js\n+ console.log("nested");\n+ ```',
        additions: 3,
        deletions: 0,
      },
    ];

    const res = buildPrompt({
      prTitle: 'Fix README code block',
      files,
      systemTemplate: sysTemplate,
      userTemplate,
    });

    expect(res.userPrompt).toContain('~~~js');
    expect(res.userPrompt).toContain('~~~');
  });
});
