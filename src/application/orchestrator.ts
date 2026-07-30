import { IAIProvider } from '@domain/ports';
import { ReviewRequest, ReviewReport, ReviewComment } from '@domain/types';
import { GitHubAdapter } from '@infrastructure/github';
import { AppConfig } from '@infrastructure/config';
import { parseDiff, filterFiles } from './diff-parser';
import { buildPrompt } from './prompt-builder';
import { parseResponse } from './response-parser';
import { logger } from '@infrastructure/logger';

export class ReviewOrchestrator {
  constructor(
    private provider: IAIProvider,
    private github: GitHubAdapter,
    private config: AppConfig,
  ) {}

  async review(request: ReviewRequest): Promise<ReviewReport> {
    const startTime = Date.now();
    const log = logger.child({
      repo: `${request.owner}/${request.repo}`,
      pr: request.prNumber,
      provider: this.provider.name,
    });

    log.info('Starting AI code review orchestration');

    const prData = await this.github.fetchPullRequest(
      request.owner,
      request.repo,
      request.prNumber,
    );

    const parsedFiles = parseDiff(prData.files);
    const { keep, skip } = filterFiles(
      parsedFiles,
      this.config.review.ignorePatterns,
      this.config.review.maxFileSizeBytes,
    );

    const skippedFiles: string[] = [...skip];

    if (keep.length === 0) {
      const durationMs = Date.now() - startTime;
      log.info(
        { reviewedCount: 0, commentsCount: 0, durationMs },
        'Review workflow completed with zero files to review',
      );

      return {
        repo: `${request.owner}/${request.repo}`,
        prNumber: request.prNumber,
        prTitle: prData.prTitle,
        comments: [],
        summary: `Reviewed 0 file(s) across ${prData.files.length} changed file(s). Found 0 finding(s).`,
        reviewedFiles: [],
        skippedFiles,
        metadata: {
          provider: this.provider.name,
          model: this.config.ai.model,
          totalTokens: 0,
          durationMs,
          timestamp: new Date().toISOString(),
          parseSucceeded: true,
          parserStatus: 'success',
        },
      };
    }

    const { systemPrompt, userPrompt } = buildPrompt({
      prTitle: prData.prTitle,
      files: keep,
      limits: {
        maxFileSizeBytes: this.config.review.maxFileSizeBytes,
      } as unknown as { maxFiles?: number; maxTotalChars?: number },
    });

    const response = await this.provider.review({
      systemPrompt,
      userPrompt,
      temperature: this.config.ai.temperature,
    });

    const defaultFilename = keep[0]?.filename ?? 'unknown';
    const comments: ReviewComment[] = parseResponse(response.content, defaultFilename);

    const parseSucceeded =
      response.content.trim() === ''
        ? true
        : comments.length > 0 || isSuccessEmptyComments(response.content);

    const parserStatus: 'success' | 'failed' = parseSucceeded ? 'success' : 'failed';
    const reviewedFiles: string[] = keep.map((f) => f.filename);
    const totalTokens = response.metadata.tokensUsed ?? 0;
    const durationMs = Date.now() - startTime;

    log.info(
      { reviewedCount: reviewedFiles.length, commentsCount: comments.length, durationMs },
      'Review workflow completed',
    );

    const summary = `Reviewed ${reviewedFiles.length} file(s) across ${prData.files.length} changed file(s). Found ${comments.length} finding(s).`;

    return {
      repo: `${request.owner}/${request.repo}`,
      prNumber: request.prNumber,
      prTitle: prData.prTitle,
      comments,
      summary,
      reviewedFiles,
      skippedFiles,
      metadata: {
        provider: this.provider.name,
        model: this.config.ai.model,
        totalTokens,
        durationMs,
        timestamp: new Date().toISOString(),
        parseSucceeded,
        parserStatus,
      },
    };
  }
}

function isSuccessEmptyComments(content: string): boolean {
  try {
    const cleaned = content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    const parsed = JSON.parse(cleaned);
    return typeof parsed === 'object' && parsed !== null && Array.isArray(parsed.comments);
  } catch {
    return false;
  }
}
