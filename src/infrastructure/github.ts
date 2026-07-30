import { Octokit } from '@octokit/rest';
import { FileDiff } from '@domain/types';
import { AppError, ErrorCode } from '@domain/errors';
import { logger } from './logger';

export interface GitHubConfig {
  token: string;
}

export class GitHubAdapter {
  private readonly octokit: Octokit;

  constructor(config: GitHubConfig) {
    this.octokit = new Octokit({ auth: config.token });
  }

  async fetchPullRequest(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<{ prTitle: string; files: FileDiff[] }> {
    logger.info({ owner, repo, prNumber }, 'Fetching PR metadata and files from GitHub');

    try {
      const { data: pr } = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });

      const pullFiles = await this.octokit.paginate(this.octokit.pulls.listFiles, {
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
      });

      const files: FileDiff[] = pullFiles.map((file) => ({
        filename: file.filename,
        language: getFileLanguage(file.filename),
        patch: file.patch ?? '',
        additions: file.additions,
        deletions: file.deletions,
      }));

      logger.info(
        { owner, repo, prNumber, fileCount: files.length },
        'Successfully fetched PR metadata and files',
      );

      return {
        prTitle: pr.title,
        files,
      };
    } catch (error: unknown) {
      throw this.handleOctokitError(error, owner, repo, prNumber);
    }
  }

  private handleOctokitError(
    error: unknown,
    owner: string,
    repo: string,
    prNumber: number,
  ): AppError {
    const err = error as { status?: number; message?: string };
    const cause = error instanceof Error ? error : undefined;

    if (err.status === 404) {
      return new AppError(
        ErrorCode.GITHUB_ERROR,
        `Pull Request ${owner}/${repo}#${prNumber} not found`,
        false,
        cause,
      );
    }

    if (err.status === 401 || err.status === 403) {
      return new AppError(
        ErrorCode.AUTH_FAILED,
        `GitHub authentication/permissions error for ${owner}/${repo}`,
        false,
        cause,
      );
    }

    if (err.status === 429) {
      return new AppError(ErrorCode.RATE_LIMIT, 'GitHub API rate limit exceeded', true, cause);
    }

    const message = err.message ?? 'Unknown error';
    return new AppError(
      ErrorCode.GITHUB_ERROR,
      `Failed to fetch PR ${owner}/${repo}#${prNumber}: ${message}`,
      true,
      cause,
    );
  }
}

function getFileLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    go: 'go',
    rs: 'rust',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    cs: 'csharp',
    html: 'html',
    css: 'css',
    json: 'json',
    yml: 'yaml',
    yaml: 'yaml',
    md: 'markdown',
    sql: 'sql',
    sh: 'bash',
  };
  return langMap[ext] ?? 'plaintext';
}
