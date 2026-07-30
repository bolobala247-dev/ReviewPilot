import { IAIProvider } from '@domain/ports';
import { ReviewRequest, ReviewReport, ReviewComment, ExecutionMetrics } from '@domain/types';
import { GitHubAdapter } from '@infrastructure/github';
import { AppConfig } from '@infrastructure/config';
import { estimateCostUsd } from '@infrastructure/cost';
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

    const fetchStart = Date.now();
    const prData = await this.github.fetchPullRequest(
      request.owner,
      request.repo,
      request.prNumber,
    );
    const githubFetchMs = Date.now() - fetchStart;

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

      const metrics: ExecutionMetrics = {
        promptChars: 0,
        responseChars: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        githubFetchMs,
        promptBuildMs: 0,
        providerMs: 0,
        parserMs: 0,
        totalMs: durationMs,
      };

      return {
        repo: `${request.owner}/${request.repo}`,
        prNumber: request.prNumber,
        prTitle: prData.prTitle,
        comments: [],
        summary: `Reviewed 0 file(s) across ${prData.files.length} changed file(s). Found 0 finding(s).`,
        reviewedFiles: [],
        skippedFiles,
        metrics,
        metadata: {
          provider: this.provider.name,
          model: this.config.ai.model,
          totalTokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          durationMs,
          timestamp: new Date().toISOString(),
          parseSucceeded: true,
          parserStatus: 'success',
        },
      };
    }

    const promptBuildStart = Date.now();
    const { systemPrompt, userPrompt } = buildPrompt({
      prTitle: prData.prTitle,
      files: keep,
      limits: {
        maxFileSizeBytes: this.config.review.maxFileSizeBytes,
      } as unknown as { maxFiles?: number; maxTotalChars?: number },
    });
    const promptBuildMs = Date.now() - promptBuildStart;

    const providerStart = Date.now();
    const response = await this.provider.review({
      systemPrompt,
      userPrompt,
      temperature: this.config.ai.temperature,
    });
    const providerMs = Date.now() - providerStart;

    const defaultFilename = keep[0]?.filename ?? 'unknown';
    const parserStart = Date.now();
    const comments: ReviewComment[] = parseResponse(response.content, defaultFilename);
    const parserMs = Date.now() - parserStart;

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

    const inputTokens = response.metadata.inputTokens ?? 0;
    const outputTokens = response.metadata.outputTokens ?? 0;

    const metrics: ExecutionMetrics = {
      promptChars: systemPrompt.length + userPrompt.length,
      responseChars: response.content.length,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCostUsd: estimateCostUsd(
        this.provider.name,
        this.config.ai.model,
        inputTokens,
        outputTokens,
      ),
      githubFetchMs,
      promptBuildMs,
      providerMs,
      parserMs,
      totalMs: durationMs,
    };

    return {
      repo: `${request.owner}/${request.repo}`,
      prNumber: request.prNumber,
      prTitle: prData.prTitle,
      comments,
      summary,
      reviewedFiles,
      skippedFiles,
      metrics,
      metadata: {
        provider: this.provider.name,
        model: this.config.ai.model,
        totalTokens,
        inputTokens,
        outputTokens,
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
