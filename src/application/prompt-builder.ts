import { FileDiff } from '@domain/types';

export interface PromptResult {
  systemPrompt: string;
  userPrompt: string;
}

export function buildPrompt(
  file: FileDiff,
  systemTemplate: string,
  userTemplate: string,
): PromptResult {
  const userPrompt = userTemplate
    .replace(/{{filename}}/g, file.filename)
    .replace(/{{language}}/g, file.language)
    .replace(/{{additions}}/g, String(file.additions))
    .replace(/{{deletions}}/g, String(file.deletions))
    .replace(/{{patch}}/g, file.patch);

  return {
    systemPrompt: systemTemplate.trim(),
    userPrompt: userPrompt.trim(),
  };
}
