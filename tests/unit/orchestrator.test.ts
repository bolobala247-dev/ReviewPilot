import { ReviewOrchestrator } from '../../src/application/orchestrator';
import { IAIProvider } from '../../src/domain/ports';
import { GitHubAdapter } from '../../src/infrastructure/github';
import { AppConfig } from '../../src/infrastructure/config';

describe('ReviewOrchestrator', () => {
  it('should orchestrate review successfully', async () => {
    const mockProvider: IAIProvider = {
      name: 'mock-provider',
      review: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          comments: [{ line: 10, severity: 'SUGGESTION', message: 'Use const' }],
        }),
        tokensUsed: 150,
        model: 'mock-model',
      }),
    };

    const mockGitHub = {
      fetchPullRequest: jest.fn().mockResolvedValue({
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
      ai: { provider: 'openai', apiKey: 'test', model: 'test-model', temperature: 0.1 },
      github: { token: 'test' },
      review: { concurrency: 2, maxFileSizeBytes: 1000, ignorePatterns: [] },
      logging: { level: 'error' },
    };

    const orchestrator = new ReviewOrchestrator(mockProvider, mockGitHub, mockConfig);

    const report = await orchestrator.run({
      owner: 'octocat',
      repo: 'hello-world',
      prNumber: 1,
      provider: 'mock-provider',
    });

    expect(report.repo).toBe('octocat/hello-world');
    expect(report.comments).toHaveLength(1);
    expect(report.reviewedFiles).toContain('src/index.ts');
    expect(report.metadata.totalTokens).toBe(150);
  });
});
