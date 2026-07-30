import { ReviewComment, ReviewSeverity } from '@domain/types';

export function parseResponse(rawContent: string, defaultFilename: string): ReviewComment[] {
  if (!rawContent || rawContent.trim().length === 0) {
    return [];
  }

  try {
    const cleaned = stripMarkdownCodeBlocks(rawContent);
    const parsed: unknown = JSON.parse(cleaned);

    if (typeof parsed !== 'object' || parsed === null) {
      return [];
    }

    const obj = parsed as Record<string, unknown>;
    if (!Array.isArray(obj['comments'])) {
      return [];
    }

    const comments: ReviewComment[] = [];
    const seen = new Set<string>();

    for (const item of obj['comments']) {
      if (typeof item !== 'object' || item === null) continue;
      const commentObj = item as Record<string, unknown>;

      if (typeof commentObj['message'] !== 'string' || commentObj['message'].trim().length === 0) {
        continue;
      }

      const file =
        typeof commentObj['file'] === 'string' && commentObj['file'].trim().length > 0
          ? commentObj['file']
          : defaultFilename;

      const line =
        typeof commentObj['line'] === 'number' && commentObj['line'] > 0
          ? Math.floor(commentObj['line'])
          : 1;

      const severity = parseSeverity(commentObj['severity']);
      const message = commentObj['message'].trim();

      const dedupeKey = `${file}:${line}:${severity}:${message}`;
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);

      const comment: ReviewComment = {
        file,
        line,
        severity,
        message,
      };

      if (typeof commentObj['suggestion'] === 'string' && commentObj['suggestion'].length > 0) {
        comment.suggestion = commentObj['suggestion'];
      }

      comments.push(comment);
    }

    return comments;
  } catch {
    return [];
  }
}

function stripMarkdownCodeBlocks(text: string): string {
  let trimmed = text.trim();
  if (trimmed.startsWith('```json')) {
    trimmed = trimmed.substring(7);
  } else if (trimmed.startsWith('```')) {
    trimmed = trimmed.substring(3);
  }
  if (trimmed.endsWith('```')) {
    trimmed = trimmed.substring(0, trimmed.length - 3);
  }
  return trimmed.trim();
}

function parseSeverity(val: unknown): ReviewSeverity {
  if (typeof val === 'string') {
    const upper = val.toUpperCase();
    if (Object.values(ReviewSeverity).includes(upper as ReviewSeverity)) {
      return upper as ReviewSeverity;
    }
  }
  return ReviewSeverity.SUGGESTION;
}
