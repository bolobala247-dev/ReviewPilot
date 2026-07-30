import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubAdapter } from '@infrastructure/github';
import { ErrorCode, AppError } from '@domain/errors';
import { retry } from '@infrastructure/retry';

const mockGet = vi.fn();
const mockListFiles = vi.fn();
const mockPaginate = vi.fn();

vi.mock('@octokit/rest', () => {
  return {
    Octokit: vi.fn().mockImplementation(() => ({
      pulls: {
        get: mockGet,
        listFiles: mockListFiles,
      },
      paginate: mockPaginate,
    })),
  };
});

describe('GitHubAdapter', () => {
  let adapter: GitHubAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new GitHubAdapter({ token: 'ghp_fake_test_token' });
  });

  it('should fetch PR metadata and files successfully', async () => {
    mockGet.mockResolvedValue({
      data: { title: 'Add new feature' },
    });

    mockPaginate.mockResolvedValue([
      {
        filename: 'src/main.ts',
        additions: 10,
        deletions: 2,
        patch: '@@ -1,2 +1,10 @@\n+const x = 1;',
      },
      {
        filename: 'README.md',
        additions: 5,
        deletions: 0,
        patch: '@@ -1,1 +1,6 @@\n+# Title',
      },
    ]);

    const result = await adapter.fetchPullRequest('owner', 'repo', 42);

    expect(result.prTitle).toBe('Add new feature');
    expect(result.files).toHaveLength(2);
    expect(result.files[0]).toEqual({
      filename: 'src/main.ts',
      language: 'typescript',
      patch: '@@ -1,2 +1,10 @@\n+const x = 1;',
      additions: 10,
      deletions: 2,
    });
    expect(result.files[1]).toEqual({
      filename: 'README.md',
      language: 'markdown',
      patch: '@@ -1,1 +1,6 @@\n+# Title',
      additions: 5,
      deletions: 0,
    });
  });

  it('should handle missing PR (404) with non-retryable AppError', async () => {
    mockGet.mockRejectedValue({ status: 404, message: 'Not Found' });

    try {
      await adapter.fetchPullRequest('owner', 'repo', 999);
      expect.fail('Should have thrown AppError');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.code).toBe(ErrorCode.GITHUB_ERROR);
      expect(appErr.isRetryable).toBe(false);
      expect(appErr.message).toContain('Pull Request owner/repo#999 not found');
    }
  });

  it('should handle unauthorized token (401/403) with non-retryable AppError', async () => {
    mockGet.mockRejectedValue({ status: 401, message: 'Bad credentials' });

    try {
      await adapter.fetchPullRequest('owner', 'repo', 1);
      expect.fail('Should have thrown AppError');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.code).toBe(ErrorCode.AUTH_FAILED);
      expect(appErr.isRetryable).toBe(false);
    }
  });

  it('should handle rate limit (429) with retryable AppError', async () => {
    mockGet.mockRejectedValue({ status: 429, message: 'Rate limit exceeded' });

    try {
      await adapter.fetchPullRequest('owner', 'repo', 1);
      expect.fail('Should have thrown AppError');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.code).toBe(ErrorCode.RATE_LIMIT);
      expect(appErr.isRetryable).toBe(true);
    }
  });

  it('should handle empty PR (0 changed files)', async () => {
    mockGet.mockResolvedValue({
      data: { title: 'Empty PR' },
    });
    mockPaginate.mockResolvedValue([]);

    const result = await adapter.fetchPullRequest('owner', 'repo', 5);

    expect(result.prTitle).toBe('Empty PR');
    expect(result.files).toHaveLength(0);
  });

  it('should handle binary files and files without patch', async () => {
    mockGet.mockResolvedValue({
      data: { title: 'PR with binary image' },
    });

    mockPaginate.mockResolvedValue([
      {
        filename: 'assets/logo.png',
        additions: 0,
        deletions: 0,
        patch: undefined, // Binary file has no patch string
      },
    ]);

    const result = await adapter.fetchPullRequest('owner', 'repo', 10);

    expect(result.files).toHaveLength(1);
    expect(result.files[0]).toEqual({
      filename: 'assets/logo.png',
      language: 'plaintext',
      patch: undefined,
      additions: 0,
      deletions: 0,
    });
  });

  it('should handle renamed files correctly', async () => {
    mockGet.mockResolvedValue({
      data: { title: 'Rename file PR' },
    });

    mockPaginate.mockResolvedValue([
      {
        filename: 'src/new-name.ts',
        previous_filename: 'src/old-name.ts',
        additions: 2,
        deletions: 2,
        patch: '@@ -1,2 +1,2 @@\n-old\n+new',
      },
    ]);

    const result = await adapter.fetchPullRequest('owner', 'repo', 12);

    expect(result.files).toHaveLength(1);
    expect(result.files[0]?.filename).toBe('src/new-name.ts');
    expect(result.files[0]?.patch).toBe('@@ -1,2 +1,2 @@\n-old\n+new');
  });

  it('should handle pagination boundaries (exact 100 files and 101 files)', async () => {
    mockGet.mockResolvedValue({
      data: { title: 'Large PR' },
    });

    // Generate 101 mock files
    const mock101Files = Array.from({ length: 101 }, (_, i) => ({
      filename: `src/file_${i + 1}.ts`,
      additions: 1,
      deletions: 0,
      patch: `+line ${i + 1}`,
    }));

    mockPaginate.mockResolvedValue(mock101Files);

    const result = await adapter.fetchPullRequest('owner', 'repo', 100);

    expect(mockPaginate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        owner: 'owner',
        repo: 'repo',
        pull_number: 100,
        per_page: 100,
      }),
    );
    expect(result.files).toHaveLength(101);
    expect(result.files[100]?.filename).toBe('src/file_101.ts');
  });

  it('should support integration with retry() utility when transient errors occur', async () => {
    mockGet
      .mockRejectedValueOnce({ status: 500, message: 'Internal Server Error' })
      .mockResolvedValueOnce({ data: { title: 'Recovered PR' } });

    mockPaginate.mockResolvedValue([
      { filename: 'src/index.ts', additions: 1, deletions: 0, patch: '+code' },
    ]);

    const result = await retry(() => adapter.fetchPullRequest('owner', 'repo', 15), {
      maxAttempts: 2,
      initialDelayMs: 10,
    });

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(result.prTitle).toBe('Recovered PR');
    expect(result.files).toHaveLength(1);
  });
});
