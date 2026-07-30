import { parseResponse } from '../../src/application/response-parser';
import { ReviewSeverity } from '../../src/domain/types';

describe('ResponseParser', () => {
  it('should parse valid JSON response', () => {
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
    expect(comments[0].severity).toBe(ReviewSeverity.CRITICAL);
    expect(comments[0].line).toBe(15);
    expect(comments[0].suggestion).toBe('if (obj) obj.do();');
  });

  it('should handle markdown fenced JSON response', () => {
    const raw = '```json\n{\n  "comments": [\n    {\n      "line": 5,\n      "severity": "WARNING",\n      "message": "Potential memory leak"\n    }\n  ]\n}\n```';

    const comments = parseResponse(raw, 'src/main.ts');
    expect(comments).toHaveLength(1);
    expect(comments[0].severity).toBe(ReviewSeverity.WARNING);
  });

  it('should fallback gracefully for non-JSON content', () => {
    const raw = 'This file has a typo on line 10.';
    const comments = parseResponse(raw, 'src/main.ts');

    expect(comments).toHaveLength(1);
    expect(comments[0].severity).toBe(ReviewSeverity.WARNING);
    expect(comments[0].message).toBe(raw);
  });
});
