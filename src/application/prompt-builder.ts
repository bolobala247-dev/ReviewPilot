import fs from 'fs';
import path from 'path';
import { FileDiff } from '@domain/types';

export interface PromptLimits {
  maxFiles?: number;
  maxTotalChars?: number;
}

export interface BuildPromptOptions {
  prTitle: string;
  files: readonly FileDiff[];
  systemTemplate?: string | undefined;
  userTemplate?: string | undefined;
  limits?: PromptLimits;
}

export interface PromptResult {
  systemPrompt: string;
  userPrompt: string;
  truncated: boolean;
}

const DEFAULT_MAX_FILES = 50;
const DEFAULT_MAX_TOTAL_CHARS = 200_000;

export function buildPrompt(options: BuildPromptOptions): PromptResult {
  const maxFiles = options.limits?.maxFiles ?? DEFAULT_MAX_FILES;
  const maxTotalChars = options.limits?.maxTotalChars ?? DEFAULT_MAX_TOTAL_CHARS;

  const defaultTemplates = loadDefaultTemplates();
  const systemTemplateStr = options.systemTemplate ?? defaultTemplates.systemTemplate;
  const userTemplateStr = options.userTemplate ?? defaultTemplates.userTemplate;

  const systemPrompt = systemTemplateStr.trim();

  let truncated = false;
  const filesToInclude = options.files.slice(0, maxFiles);
  if (filesToInclude.length < options.files.length) {
    truncated = true;
  }

  const fileBlocks: string[] = [];
  let currentLength = 0;

  for (const file of filesToInclude) {
    const formattedFile = formatSingleFile(file);
    if (currentLength + formattedFile.length > maxTotalChars && fileBlocks.length > 0) {
      truncated = true;
      break;
    }
    fileBlocks.push(formattedFile);
    currentLength += formattedFile.length;
  }

  if (fileBlocks.length === 0 && filesToInclude.length > 0) {
    const firstFile = filesToInclude[0];
    if (firstFile) {
      const formatted = formatSingleFile(firstFile);
      fileBlocks.push(formatted.substring(0, maxTotalChars));
      truncated = true;
    }
  }

  const filesContent = fileBlocks.join('\n\n');

  const userPrompt = userTemplateStr
    .split('{{PR_TITLE}}')
    .join(options.prTitle)
    .split('{{FILES}}')
    .join(filesContent)
    .trim();

  return {
    systemPrompt,
    userPrompt,
    truncated,
  };
}

function loadDefaultTemplates(): { systemTemplate: string; userTemplate: string } {
  const rootDir = process.cwd();
  const systemPath = path.join(rootDir, 'prompts', 'system.md');
  const userPath = path.join(rootDir, 'prompts', 'review-file.md');

  const systemTemplate = fs.existsSync(systemPath)
    ? fs.readFileSync(systemPath, 'utf8')
    : 'You are an expert AI code reviewer. Return structured JSON with comments.';

  const userTemplate = fs.existsSync(userPath)
    ? fs.readFileSync(userPath, 'utf8')
    : 'Please review the following Pull Request:\n\nPR Title: {{PR_TITLE}}\n\nChanged Files:\n\n{{FILES}}';

  return { systemTemplate, userTemplate };
}

function formatSingleFile(file: FileDiff): string {
  const patch =
    file.patch !== undefined
      ? escapeMarkdownFences(file.patch)
      : 'Binary file or patch unavailable.';
  return `### File: ${file.filename}\nLanguage: ${file.language}\nAdditions: ${file.additions}, Deletions: ${file.deletions}\n\`\`\`diff\n${patch}\n\`\`\``;
}

function escapeMarkdownFences(content: string): string {
  if (content.includes('```')) {
    return content.replace(/```/g, '~~~');
  }
  return content;
}
