import { ReviewComment, ReviewSeverity } from '../domain/types';
import { logger } from '../infrastructure/logger';

export function parseResponse(rawContent: string, filename: string): ReviewComment[] {
  if (!rawContent || rawContent.trim().length === 0) {
    return [];
  }

  // Strategy 1: Direct JSON parse
  try {
    const cleaned = stripMarkdownCodeBlocks(rawContent);
    const parsed = JSON.parse(cleaned);
    const comments = extractCommentsFromObject(parsed, filename);
    if (comments.length > 0) {
      return comments;
    }
  } catch (err) {
    logger.debug({ filename, error: (err as Error).message }, 'Direct JSON parsing failed, attempting fallback regex parsing');
  }

  // Strategy 2: Regex extract JSON array or object
  try {
    const jsonMatch = rawContent.match(/\{[\s\S]*"comments"[\s\S]*\}/) || rawContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const comments = extractCommentsFromObject(parsed, filename);
      if (comments.length > 0) {
        return comments;
      }
    }
  } catch (err) {
    logger.debug({ filename, error: (err as Error).message }, 'Regex JSON extraction failed');
  }

  // Strategy 3: Text fallback
  logger.warn({ filename }, 'Failed to parse structured JSON from LLM response; creating fallback comment');
  return [
    {
      file: filename,
      line: 1,
      severity: ReviewSeverity.WARNING,
      message: rawContent.trim(),
    },
  ];
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

function extractCommentsFromObject(obj: any, filename: string): ReviewComment[] {
  const rawList = Array.isArray(obj) ? obj : Array.isArray(obj?.comments) ? obj.comments : [];
  const results: ReviewComment[] = [];

  for (const item of rawList) {
    if (typeof item === 'object' && item !== null && item.message) {
      results.push({
        file: item.file || filename,
        line: typeof item.line === 'number' ? item.line : 1,
        severity: parseSeverity(item.severity),
        message: String(item.message),
        suggestion: item.suggestion ? String(item.suggestion) : undefined,
      });
    }
  }

  return results;
}

function parseSeverity(val: any): ReviewSeverity {
  const str = String(val).toUpperCase();
  if (str in ReviewSeverity) {
    return ReviewSeverity[str as keyof typeof ReviewSeverity];
  }
  if (str.includes('CRIT') || str.includes('ERR')) return ReviewSeverity.CRITICAL;
  if (str.includes('WARN')) return ReviewSeverity.WARNING;
  if (str.includes('PRAISE') || str.includes('GOOD')) return ReviewSeverity.PRAISE;
  return ReviewSeverity.SUGGESTION;
}
