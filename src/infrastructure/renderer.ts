import { ReviewReport, ReviewSeverity } from '@domain/types';

export function renderPlainText(report: ReviewReport): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════');
  lines.push('  ReviewPilot — Code Review Report');
  lines.push('═══════════════════════════════════════');
  lines.push('');
  lines.push(`  Repository:     ${report.repo}`);
  lines.push(`  Pull Request:   #${report.prNumber} — ${report.prTitle}`);
  lines.push(`  Provider:       ${report.metadata.provider} (${report.metadata.model})`);
  lines.push(`  Duration:       ${report.metadata.durationMs}ms`);
  lines.push(`  Files Reviewed: ${report.reviewedFiles.length}`);
  lines.push(`  Files Skipped:  ${report.skippedFiles.length}`);
  lines.push(`  Total Comments: ${report.comments.length}`);

  if (report.metadata.parserStatus === 'failed') {
    lines.push('  Parser Status:  FAILED (AI response could not be parsed)');
  }

  lines.push('');

  if (report.comments.length === 0) {
    lines.push('  No findings.');
  } else {
    lines.push('───────────────────────────────────────');
    lines.push('  Findings');
    lines.push('───────────────────────────────────────');
    lines.push('');

    const commentsByFile = groupCommentsByFile(report.comments);

    for (const [file, fileComments] of commentsByFile.entries()) {
      lines.push(`  ${file}`);
      lines.push('');

      for (const c of fileComments) {
        const tag = severityTag(c.severity);
        lines.push(`    Line ${c.line} ${tag} ${c.message}`);
        if (c.suggestion) {
          lines.push(`      Suggestion: ${c.suggestion}`);
        }
      }

      lines.push('');
    }
  }

  lines.push('───────────────────────────────────────');
  lines.push('  ✨ Review complete.');
  lines.push('');

  return lines.join('\n');
}

function groupCommentsByFile(
  comments: ReviewReport['comments'],
): Map<string, ReviewReport['comments']> {
  const map = new Map<string, ReviewReport['comments']>();
  for (const comment of comments) {
    const list = map.get(comment.file) ?? [];
    list.push(comment);
    map.set(comment.file, list);
  }
  return map;
}

function severityTag(severity: ReviewSeverity): string {
  switch (severity) {
    case ReviewSeverity.CRITICAL:
      return '[CRITICAL]';
    case ReviewSeverity.WARNING:
      return '[WARNING]';
    case ReviewSeverity.SUGGESTION:
      return '[SUGGESTION]';
    case ReviewSeverity.PRAISE:
      return '[PRAISE]';
    default:
      return '[INFO]';
  }
}
