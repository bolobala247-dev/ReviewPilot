import { FileDiff } from '@domain/types';

export function parseDiff(rawFiles: FileDiff[]): FileDiff[] {
  return rawFiles.map((file) => ({
    filename: file.filename,
    language: file.language || 'plaintext',
    patch: file.patch || '',
    additions: file.additions || 0,
    deletions: file.deletions || 0,
  }));
}

export function filterFiles(
  files: FileDiff[],
  ignorePatterns: string[],
  maxFileSizeBytes: number,
): { keep: FileDiff[]; skip: string[] } {
  const keep: FileDiff[] = [];
  const skip: string[] = [];

  for (const file of files) {
    if (!file.patch || file.patch.trim().length === 0) {
      skip.push(`${file.filename} (empty patch)`);
      continue;
    }

    if (Buffer.byteLength(file.patch, 'utf8') > maxFileSizeBytes) {
      skip.push(`${file.filename} (exceeds max size ${maxFileSizeBytes} bytes)`);
      continue;
    }

    if (shouldIgnore(file.filename, ignorePatterns)) {
      skip.push(`${file.filename} (matched ignore pattern)`);
      continue;
    }

    keep.push(file);
  }

  return { keep, skip };
}

function shouldIgnore(filename: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*');
    const regex = new RegExp(`^${regexPattern}$`);
    if (regex.test(filename) || filename.endsWith(pattern.replace(/^\*/, ''))) {
      return true;
    }
  }
  return false;
}
