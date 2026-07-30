import { describe, it, expect } from 'vitest';
import { parseDiff, filterFiles } from '@application/diff-parser';
import { FileDiff } from '@domain/types';

describe('DiffParser', () => {
  it('should format raw diffs correctly', () => {
    const raw: FileDiff[] = [
      {
        filename: 'src/index.ts',
        language: 'typescript',
        patch: '@@ -1 +1 @@',
        additions: 1,
        deletions: 1,
      },
    ];

    const result = parseDiff(raw);
    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe('src/index.ts');
  });

  it('should filter files based on size and ignore patterns', () => {
    const files: FileDiff[] = [
      {
        filename: 'package-lock.json',
        language: 'json',
        patch: 'lockfile contents',
        additions: 10,
        deletions: 5,
      },
      {
        filename: 'src/app.ts',
        language: 'typescript',
        patch: 'const x = 1;',
        additions: 1,
        deletions: 0,
      },
      {
        filename: 'large.ts',
        language: 'typescript',
        patch: 'a'.repeat(200),
        additions: 5,
        deletions: 0,
      },
    ];

    const ignorePatterns = ['*lock.json'];
    const maxSizeBytes = 100;

    const { keep, skip } = filterFiles(files, ignorePatterns, maxSizeBytes);

    expect(keep).toHaveLength(1);
    expect(keep[0].filename).toBe('src/app.ts');
    expect(skip).toHaveLength(2);
  });
});
