import { ReviewReport, ReviewSeverity } from '../domain/types';

export function renderMarkdown(report: ReviewReport): string {
  const lines: string[] = [];

  lines.push(`# Code Review Report: ${report.repo}#${report.prNumber}`);
  lines.push(`**PR Title:** ${report.prTitle}\n`);

  lines.push(`## Overview`);
  lines.push(report.summary || 'No summary provided.');
  lines.push('');

  lines.push(`### Metadata`);
  lines.push(`- **Provider:** ${report.metadata.provider}`);
  lines.push(`- **Model:** ${report.metadata.model}`);
  lines.push(`- **Total Tokens:** ${report.metadata.totalTokens}`);
  lines.push(`- **Duration:** ${report.metadata.durationMs}ms`);
  lines.push(`- **Timestamp:** ${report.metadata.timestamp}`);
  lines.push(`- **Reviewed Files (${report.reviewedFiles.length}):** ${report.reviewedFiles.join(', ') || 'None'}`);
  if (report.skippedFiles.length > 0) {
    lines.push(`- **Skipped Files (${report.skippedFiles.length}):** ${report.skippedFiles.join(', ')}`);
  }
  lines.push('');

  lines.push(`## Review Findings (${report.comments.length})`);
  lines.push('');

  if (report.comments.length === 0) {
    lines.push('✨ No issues found! Code looks good.');
    return lines.join('\n');
  }

  // Group by file
  const commentsByFile = new Map<string, typeof report.comments>();
  for (const comment of report.comments) {
    const list = commentsByFile.get(comment.file) ?? [];
    list.push(comment);
    commentsByFile.set(comment.file, list);
  }

  for (const [file, fileComments] of commentsByFile.entries()) {
    lines.push(`### File: \`${file}\``);
    lines.push('');

    for (const c of fileComments) {
      const badge = getSeverityBadge(c.severity);
      lines.push(`- **Line ${c.line}** ${badge} ${c.message}`);
      if (c.suggestion) {
        lines.push('  ```suggestion');
        lines.push(`  ${c.suggestion.split('\n').join('\n  ')}`);
        lines.push('  ```');
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

function getSeverityBadge(severity: ReviewSeverity): string {
  switch (severity) {
    case ReviewSeverity.CRITICAL:
      return '🔴 `[CRITICAL]`';
    case ReviewSeverity.WARNING:
      return '🟠 `[WARNING]`';
    case ReviewSeverity.SUGGESTION:
      return '🔵 `[SUGGESTION]`';
    case ReviewSeverity.PRAISE:
      return '🟢 `[PRAISE]`';
    default:
      return '⚪ `[INFO]`';
  }
}
