import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReviewOrchestrator } from '@application/orchestrator';
import { IAIProvider } from '@domain/ports';
import { GitHubAdapter } from '@infrastructure/github';
import { AppConfig } from '@infrastructure/config';
import { AppError, ErrorCode } from '@domain/errors';

describe('ReviewOrchestrator', () => {
  let mockProvider: IAIProvider;
  let mockGitHub: GitHubAdapter;
  let mockConfig: AppConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProvider = {
      name: 'openai',
      review: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          comments: [
            { file: 'src/index.ts', line: 10, severity: 'SUGGESTION', message: 'Use const' },
          ],
        }),
        metadata: {
          provider: 'openai',
          model: 'mock-model',
          tokensUsed: 150,
          durationMs: 10,
        },
      }),
    };

    mockGitHub = {
      fetchPullRequest: vi.fn().mockResolvedValue({
        prTitle: 'Fix issue',
        files: [
          {
            filename: 'src/index.ts',
            language: 'typescript',
            patch: '@@ -1 +1 @@\n-let x = 1;\n+const x = 1;',
            additions: 1,
            deletions: 1,
          },
        ],
      }),
    } as unknown as GitHubAdapter;

    mockConfig = {
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
  });

  it('should execute review workflow sequentially and invoke AI Provider exactly once', async () => {
    const orchestrator = new ReviewOrchestrator(mockProvider, mockGitHub, mockConfig);

    const report = await orchestrator.review({
      owner: 'octocat',
      repo: 'hello-world',
      prNumber: 1,
      provider: 'openai',
    });

    expect(mockGitHub.fetchPullRequest).toHaveBeenCalledTimes(1);
    expect(mockProvider.review).toHaveBeenCalledTimes(1);
    expect(report.repo).toBe('octocat/hello-world');
    expect(report.comments).toHaveLength(1);
    expect(report.reviewedFiles).toEqual(['src/index.ts']);
    expect(report.metadata.totalTokens).toBe(150);
    expect(report.metadata.parseSucceeded).toBe(true);
    expect(report.metadata.parserStatus).toBe('success');
  });

  it('should propagate AppError when GitHub fetch fails', async () => {
    (mockGitHub.fetchPullRequest as ReturnType<typeof vi.fn>).mockRejectedValue(
      new AppError(ErrorCode.GITHUB_ERROR, 'PR Not Found', false),
    );

    const orchestrator = new ReviewOrchestrator(mockProvider, mockGitHub, mockConfig);

    await expect(
      orchestrator.review({
        owner: 'octocat',
        repo: 'hello-world',
        prNumber: 999,
        provider: 'openai',
      }),
    ).rejects.toThrow(AppError);

    expect(mockProvider.review).not.toHaveBeenCalled();
  });

  it('should propagate AppError when AI Provider fails', async () => {
    (mockProvider.review as ReturnType<typeof vi.fn>).mockRejectedValue(
      new AppError(ErrorCode.RATE_LIMIT, 'Rate limit exceeded', true),
    );

    const orchestrator = new ReviewOrchestrator(mockProvider, mockGitHub, mockConfig);

    await expect(
      orchestrator.review({
        owner: 'octocat',
        repo: 'hello-world',
        prNumber: 1,
        provider: 'openai',
      }),
    ).rejects.toThrow(AppError);
  });

  it('should handle parser failures with structured metadata (parseSucceeded: false, parserStatus: "failed")', async () => {
    (mockProvider.review as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: 'This AI response is raw text and not valid JSON',
      metadata: {
        provider: 'openai',
        model: 'mock-model',
        tokensUsed: 50,
      },
    });

    const orchestrator = new ReviewOrchestrator(mockProvider, mockGitHub, mockConfig);

    const report = await orchestrator.review({
      owner: 'octocat',
      repo: 'hello-world',
      prNumber: 1,
      provider: 'openai',
    });

    expect(report.comments).toEqual([]);
    expect(report.metadata.parseSucceeded).toBe(false);
    expect(report.metadata.parserStatus).toBe('failed');
  });

  it('should return empty report without calling AI Provider if PR has 0 changed files', async () => {
    (mockGitHub.fetchPullRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      prTitle: 'Empty PR',
      files: [],
    });

    const orchestrator = new ReviewOrchestrator(mockProvider, mockGitHub, mockConfig);

    const report = await orchestrator.review({
      owner: 'octocat',
      repo: 'hello-world',
      prNumber: 2,
      provider: 'openai',
    });

    expect(report.comments).toEqual([]);
    expect(report.reviewedFiles).toEqual([]);
    expect(mockProvider.review).not.toHaveBeenCalled();
  });

  it('should handle empty AI response string gracefully', async () => {
    (mockProvider.review as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: '',
      metadata: {
        provider: 'openai',
        model: 'mock-model',
        tokensUsed: 0,
      },
    });

    const orchestrator = new ReviewOrchestrator(mockProvider, mockGitHub, mockConfig);

    const report = await orchestrator.review({
      owner: 'octocat',
      repo: 'hello-world',
      prNumber: 1,
      provider: 'openai',
    });

    expect(report.comments).toEqual([]);
    expect(report.metadata.parseSucceeded).toBe(true);
    expect(report.metadata.parserStatus).toBe('success');
  });

  it('should collect execution metrics without altering the review workflow', async () => {
    (mockProvider.review as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify({ comments: [] }),
      metadata: {
        provider: 'openai',
        model: 'mock-model',
        tokensUsed: 150,
        inputTokens: 120,
        outputTokens: 30,
        durationMs: 10,
      },
    });

    const orchestrator = new ReviewOrchestrator(mockProvider, mockGitHub, mockConfig);

    const report = await orchestrator.review({
      owner: 'octocat',
      repo: 'hello-world',
      prNumber: 1,
      provider: 'openai',
    });

    expect(report.metrics).toBeDefined();
    expect(report.metrics?.promptChars).toBeGreaterThan(0);
    expect(report.metrics?.responseChars).toBeGreaterThan(0);
    expect(report.metrics?.inputTokens).toBe(120);
    expect(report.metrics?.outputTokens).toBe(30);
    expect(report.metrics?.totalTokens).toBe(150);
    expect(report.metrics?.estimatedCostUsd).toBeGreaterThanOrEqual(0);
    expect(report.metrics?.githubFetchMs).toBeGreaterThanOrEqual(0);
    expect(report.metrics?.promptBuildMs).toBeGreaterThanOrEqual(0);
    expect(report.metrics?.providerMs).toBeGreaterThanOrEqual(0);
    expect(report.metrics?.parserMs).toBeGreaterThanOrEqual(0);
    expect(report.metrics?.totalMs).toBe(report.metadata.durationMs);
  });

  it('should return zeroed metrics when PR has 0 reviewable files', async () => {
    (mockGitHub.fetchPullRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      prTitle: 'Empty PR',
      files: [],
    });

    const orchestrator = new ReviewOrchestrator(mockProvider, mockGitHub, mockConfig);

    const report = await orchestrator.review({
      owner: 'octocat',
      repo: 'hello-world',
      prNumber: 2,
      provider: 'openai',
    });

    expect(report.metrics).toBeDefined();
    expect(report.metrics?.promptChars).toBe(0);
    expect(report.metrics?.responseChars).toBe(0);
    expect(report.metrics?.totalTokens).toBe(0);
    expect(report.metrics?.estimatedCostUsd).toBe(0);
    expect(report.metrics?.providerMs).toBe(0);
  });

  it('should guarantee deterministic orchestration across multiple calls', async () => {
    const orchestrator = new ReviewOrchestrator(mockProvider, mockGitHub, mockConfig);

    const request = {
      owner: 'octocat',
      repo: 'hello-world',
      prNumber: 1,
      provider: 'openai',
    };

    const res1 = await orchestrator.review(request);
    const res2 = await orchestrator.review(request);

    expect(res1.comments).toEqual(res2.comments);
    expect(res1.reviewedFiles).toEqual(res2.reviewedFiles);
    expect(res1.skippedFiles).toEqual(res2.skippedFiles);
    expect(res1.summary).toEqual(res2.summary);
    expect(res1.metadata.parserStatus).toEqual(res2.metadata.parserStatus);
  });
});
