import fs from 'fs';
import path from 'path';
import { IAIProvider } from '../domain/ports';
import { GitHubAdapter } from '../infrastructure/github';
import { AppConfig } from '../infrastructure/config';
import { ReviewRequest, ReviewReport, ReviewComment, FileDiff } from '../domain/types';
import { parseDiff, filterFiles } from './diff-parser';
import { buildPrompt } from './prompt-builder';
import { parseResponse } from './response-parser';
import { retry } from '../infrastructure/retry';
import { logger } from '../infrastructure/logger';

export class ReviewOrchestrator {
  constructor(
    private provider: IAIProvider,
    private github: GitHubAdapter,
    private config: AppConfig,
  ) {}

  async run(request: ReviewRequest): Promise<ReviewReport> {
    const startTime = Date.now();
    const log = logger.child({
      repo: `${request.owner}/${request.repo}`,
      pr: request.prNumber,
      provider: this.provider.name,
    });

    log.info('Starting AI code review orchestration');

    // Step 1: Fetch PR data from GitHub
    const prData = await this.github.fetchPullRequest(
      request.owner,
      request.repo,
      request.prNumber,
    );

    // Step 2: Parse and filter diffs
    const parsedFiles = parseDiff(prData.files);
    const { keep, skip } = filterFiles(
      parsedFiles,
      this.config.review.ignorePatterns,
      this.config.review.maxFileSizeBytes,
    );

    log.info(
      { totalFiles: parsedFiles.length, keepCount: keep.length, skipCount: skip.length },
      'Files filtered for review',
    );

    // Step 3: Load prompt templates
    const { systemPromptTemplate, userPromptTemplate } = this.loadPromptTemplates();

    // Step 4: Fan out reviews with bounded concurrency
    const allComments: ReviewComment[] = [];
    const reviewedFiles: string[] = [];
    const skippedFiles: string[] = [...skip];
    let totalTokens = 0;

    const concurrency = this.config.review.concurrency;
    const queue = [...keep];

    const worker = async () => {
      while (queue.length > 0) {
        const file = queue.shift();
        if (!file) break;

        const fileLog = log.child({ file: file.filename });
        fileLog.info('Reviewing file diff');

        try {
          const { systemPrompt, userPrompt } = buildPrompt(
            file,
            systemPromptTemplate,
            userPromptTemplate,
          );

          const response = await retry(() =>
            this.provider.review({
              systemPrompt,
              userPrompt,
              temperature: this.config.ai.temperature,
            }),
          );

          totalTokens += response.tokensUsed;
          const comments = parseResponse(response.content, file.filename);

          allComments.push(...comments);
          reviewedFiles.push(file.filename);

          fileLog.info(
            { commentsCount: comments.length, tokensUsed: response.tokensUsed },
            'File review complete',
          );
        } catch (err: any) {
          fileLog.error({ error: err.message }, 'Failed to review file, skipping');
          skippedFiles.push(`${file.filename} (error: ${err.message})`);
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, keep.length) }, () => worker());
    await Promise.all(workers);

    const durationMs = Date.now() - startTime;
    log.info({ reviewedCount: reviewedFiles.length, commentsCount: allComments.length, durationMs }, 'Review workflow completed');

    const summary = `Reviewed ${reviewedFiles.length} file(s) across ${prData.files.length} changed file(s). Found ${allComments.length} finding(s).`;

    return {
      repo: `${request.owner}/${request.repo}`,
      prNumber: request.prNumber,
      prTitle: prData.prTitle,
      comments: allComments,
      summary,
      reviewedFiles,
      skippedFiles,
      metadata: {
        provider: this.provider.name,
        model: this.config.ai.model,
        totalTokens,
        durationMs,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private loadPromptTemplates(): { systemPromptTemplate: string; userPromptTemplate: string } {
    const rootDir = process.cwd();
    const systemPath = path.join(rootDir, 'prompts', 'system.md');
    const userPath = path.join(rootDir, 'prompts', 'review-file.md');

    const systemPromptTemplate = fs.existsSync(systemPath)
      ? fs.readFileSync(systemPath, 'utf8')
      : 'You are an expert AI code reviewer. Return structured JSON with comments.';

    const userPromptTemplate = fs.existsSync(userPath)
      ? fs.readFileSync(userPath, 'utf8')
      : 'Review file {{filename}}:\n```diff\n{{patch}}\n```';

    return { systemPromptTemplate, userPromptTemplate };
  }
}
