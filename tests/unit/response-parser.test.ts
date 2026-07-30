import { describe, it, expect } from 'vitest';
import { parseResponse } from '@application/response-parser';
import { ReviewSeverity } from '@domain/types';

describe('ResponseParser', () => {
  it('should parse valid JSON response correctly', () => {
    const raw = JSON.stringify({
      comments: [
        {
          file: 'src/main.ts',
          line: 15,
          severity: 'CRITICAL',
          message: 'Null dereference vulnerability',
          suggestion: 'if (obj) obj.do();',
        },
      ],
    });

    const comments = parseResponse(raw, 'src/main.ts');
    expect(comments).toHaveLength(1);
    expect(comments[0]?.severity).toBe(ReviewSeverity.CRITICAL);
    expect(comments[0]?.line).toBe(15);
    expect(comments[0]?.suggestion).toBe('if (obj) obj.do();');
  });

  it('should handle markdown fenced JSON response', () => {
    const raw =
      '```json\n{\n  "comments": [\n    {\n      "line": 5,\n      "severity": "WARNING",\n      "message": "Potential memory leak"\n    }\n  ]\n}\n```';

    const comments = parseResponse(raw, 'src/main.ts');
    expect(comments).toHaveLength(1);
    expect(comments[0]?.severity).toBe(ReviewSeverity.WARNING);
    expect(comments[0]?.file).toBe('src/main.ts');
  });

  it('should return empty list for empty or whitespace-only response', () => {
    expect(parseResponse('', 'src/main.ts')).toEqual([]);
    expect(parseResponse('   ', 'src/main.ts')).toEqual([]);
  });

  it('should return empty list for malformed or non-JSON content without generating fallbacks', () => {
    const raw = 'This file has a typo on line 10.';
    const comments = parseResponse(raw, 'src/main.ts');
    expect(comments).toEqual([]);
  });

  it('should return empty list when comments key is missing or not an array', () => {
    expect(parseResponse('{"status": "ok"}', 'src/main.ts')).toEqual([]);
    expect(parseResponse('{"comments": "none"}', 'src/main.ts')).toEqual([]);
  });

  it('should default unknown severity strings to SUGGESTION', () => {
    const raw = JSON.stringify({
      comments: [
        {
          file: 'src/main.ts',
          line: 10,
          severity: 'HIGH_IMPORTANT',
          message: 'Check type conversion',
        },
      ],
    });

    const comments = parseResponse(raw, 'src/main.ts');
    expect(comments).toHaveLength(1);
    expect(comments[0]?.severity).toBe(ReviewSeverity.SUGGESTION);
  });

  it('should deduplicate findings using filename, line, severity, and message', () => {
    const raw = JSON.stringify({
      comments: [
        {
          file: 'src/app.ts',
          line: 20,
          severity: 'WARNING',
          message: 'Unused variable',
        },
        {
          file: 'src/app.ts',
          line: 20,
          severity: 'WARNING',
          message: 'Unused variable',
        },
        {
          file: 'src/app.ts',
          line: 20,
          severity: 'CRITICAL',
          message: 'Unused variable',
        },
      ],
    });

    const comments = parseResponse(raw, 'src/app.ts');
    expect(comments).toHaveLength(2);
    expect(comments[0]?.severity).toBe(ReviewSeverity.WARNING);
    expect(comments[1]?.severity).toBe(ReviewSeverity.CRITICAL);
  });

  it('should handle unicode characters in filename, message, and suggestion', () => {
    const raw = JSON.stringify({
      comments: [
        {
          file: 'src/xử_lý.ts',
          line: 42,
          severity: 'PRAISE',
          message: 'Tối ưu hóa bộ nhớ rất tốt 🚀',
          suggestion: '// Thêm comment tiếng Việt',
        },
      ],
    });

    const comments = parseResponse(raw, 'src/default.ts');
    expect(comments).toHaveLength(1);
    expect(comments[0]?.file).toBe('src/xử_lý.ts');
    expect(comments[0]?.message).toBe('Tối ưu hóa bộ nhớ rất tốt 🚀');
    expect(comments[0]?.suggestion).toBe('// Thêm comment tiếng Việt');
  });

  it('should parse large responses with many comments deterministically', () => {
    const commentsList = Array.from({ length: 500 }, (_, i) => ({
      file: `src/file_${i}.ts`,
      line: i + 1,
      severity: 'WARNING',
      message: `Issue number ${i}`,
    }));

    const raw = JSON.stringify({ comments: commentsList });

    const res1 = parseResponse(raw, 'src/main.ts');
    const res2 = parseResponse(raw, 'src/main.ts');

    expect(res1).toHaveLength(500);
    expect(res1).toEqual(res2);
  });
});
