import { describe, it, expect, vi } from 'vitest';
import { ReviewOrchestrator } from '@application/orchestrator';
import { IAIProvider } from '@domain/ports';
import { GitHubAdapter } from '@infrastructure/github';
import { AppConfig } from '@infrastructure/config';

describe('ReviewOrchestrator', () => {
  it('should orchestrate review successfully', async () => {
    const mockProvider: IAIProvider = {
      name: 'openai',
      review: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          comments: [{ line: 10, severity: 'SUGGESTION', message: 'Use const' }],
        }),
        metadata: {
          provider: 'openai',
          model: 'mock-model',
          tokensUsed: 150,
          durationMs: 10,
        },
      }),
    };

    const mockGitHub = {
      fetchPullRequest: vi.fn().mockResolvedValue({
        prTitle: 'Fix issue',
        files: [
          {
            filename: 'src/index.ts',
            language: 'typescript',
            patch: '@@ -1 +1 @@',
            additions: 1,
            deletions: 1,
          },
        ],
      }),
    } as unknown as GitHubAdapter;

    const mockConfig: AppConfig = {
      ai: {
        provider: 'openai',
        apiKey: 'test',
        model: 'test-model',
        temperature: 0.1,
        timeoutMs: 30000,
      },
      github: { token: 'test' },
      review: { concurrency: 2, maxFileSizeBytes: 1000, ignorePatterns: [] },
      logging: { level: 'error' },
    };

    const orchestrator = new ReviewOrchestrator(mockProvider, mockGitHub, mockConfig);

    const report = await orchestrator.run({
      owner: 'octocat',
      repo: 'hello-world',
      prNumber: 1,
      provider: 'openai',
    });

    expect(report.repo).toBe('octocat/hello-world');
    expect(report.comments).toHaveLength(1);
    expect(report.reviewedFiles).toContain('src/index.ts');
    expect(report.metadata.totalTokens).toBe(150);
  });
});
