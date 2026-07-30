export enum ReviewSeverity {
  CRITICAL = 'CRITICAL',
  WARNING = 'WARNING',
  SUGGESTION = 'SUGGESTION',
  PRAISE = 'PRAISE',
}

export interface FileDiff {
  filename: string;
  language: string;
  patch?: string | undefined;
  additions: number;
  deletions: number;
}

export interface ReviewComment {
  file: string;
  line: number;
  severity: ReviewSeverity;
  message: string;
  suggestion?: string | undefined;
}

export interface ReviewReport {
  repo: string;
  prNumber: number;
  prTitle: string;
  comments: ReviewComment[];
  summary: string;
  reviewedFiles: string[];
  skippedFiles: string[];
  metadata: {
    provider: string;
    model: string;
    totalTokens: number;
    inputTokens?: number | undefined;
    outputTokens?: number | undefined;
    durationMs: number;
    timestamp: string;
    parseSucceeded?: boolean | undefined;
    parserStatus?: 'success' | 'failed' | undefined;
  };
}

export interface ReviewRequest {
  owner: string;
  repo: string;
  prNumber: number;
  provider: string;
}
