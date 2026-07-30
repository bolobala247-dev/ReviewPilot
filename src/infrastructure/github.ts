import { Octokit } from '@octokit/rest';
import { FileDiff } from '@domain/types';
import { AppError, ErrorCode } from '@domain/errors';
import { getFileLanguage } from './language';
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
        patch: file.patch ?? undefined,
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
      throw this.handleError(error, owner, repo, prNumber);
    }
  }

  private handleError(error: unknown, owner: string, repo: string, prNumber: number): AppError {
    const status = getErrorStatus(error);
    const message = getErrorMessage(error);
    const cause = error instanceof Error ? error : undefined;

    if (status === 404) {
      return new AppError(
        ErrorCode.GITHUB_ERROR,
        `Pull Request ${owner}/${repo}#${prNumber} not found`,
        false,
        cause,
      );
    }

    if (status === 401 || status === 403) {
      return new AppError(
        ErrorCode.AUTH_FAILED,
        `GitHub authentication/permissions error for ${owner}/${repo}`,
        false,
        cause,
      );
    }

    if (status === 429) {
      return new AppError(ErrorCode.RATE_LIMIT, 'GitHub API rate limit exceeded', true, cause);
    }

    return new AppError(
      ErrorCode.GITHUB_ERROR,
      `Failed to fetch PR ${owner}/${repo}#${prNumber}: ${message}`,
      true,
      cause,
    );
  }
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status: unknown }).status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = (error as { message: unknown }).message;
    return typeof msg === 'string' ? msg : 'Unknown error';
  }
  return 'Unknown error';
}
