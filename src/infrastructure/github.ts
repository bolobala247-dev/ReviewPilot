import { Octokit } from '@octokit/rest';
import { FileDiff } from '@domain/types';
import { AppError, ErrorCode } from '@domain/errors';
import { logger } from './logger';

export interface GitHubConfig {
  token: string;
}

export class GitHubAdapter {
  private octokit: Octokit;

  constructor(config: GitHubConfig) {
    this.octokit = new Octokit({ auth: config.token });
  }

  async fetchPullRequest(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<{ prTitle: string; files: FileDiff[] }> {
    try {
      logger.info({ owner, repo, prNumber }, 'Fetching PR metadata and diffs from GitHub');

      const { data: pr } = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });

      const { data: pullFiles } = await this.octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
      });

      const files: FileDiff[] = pullFiles.map((file) => ({
        filename: file.filename,
        language: detectLanguage(file.filename),
        patch: file.patch ?? '',
        additions: file.additions,
        deletions: file.deletions,
      }));

      return {
        prTitle: pr.title,
        files,
      };
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 404) {
        throw new AppError(
          ErrorCode.GITHUB_ERROR,
          `Pull Request ${owner}/${repo}#${prNumber} not found`,
          false,
          error as Error,
        );
      }
      if (err.status === 401 || err.status === 403) {
        throw new AppError(
          ErrorCode.AUTH_FAILED,
          `GitHub authentication/permissions error for ${owner}/${repo}`,
          false,
          error as Error,
        );
      }
      throw new AppError(
        ErrorCode.GITHUB_ERROR,
        `Failed to fetch PR ${owner}/${repo}#${prNumber}: ${err.message}`,
        true,
        error as Error,
      );
    }
  }
}

function detectLanguage(filename: string): string {
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
