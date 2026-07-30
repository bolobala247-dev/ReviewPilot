import { z } from 'zod';
import dotenv from 'dotenv';
import { AppError, ErrorCode } from '@domain/errors';

dotenv.config();

export const ConfigSchema = z.object({
  ai: z.object({
    provider: z.enum(['openai', 'gemini', 'anthropic']).default('openai'),
    apiKey: z.string().min(1, 'AICR_AI_API_KEY is required'),
    model: z.string().default('gpt-4o'),
    temperature: z.number().min(0).max(2).default(0.1),
    timeoutMs: z.number().min(1000).default(30000),
  }),
  github: z.object({
    token: z.string().min(1, 'AICR_GITHUB_TOKEN is required'),
  }),
  review: z.object({
    concurrency: z.number().min(1).max(10).default(5),
    maxFileSizeBytes: z.number().default(100_000),
    ignorePatterns: z
      .array(z.string())
      .default(['*.lock', '*.min.js', 'dist/**', 'node_modules/**']),
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }),
});

export type AppConfig = z.infer<typeof ConfigSchema>;
export type AIConfig = AppConfig['ai'];

export function loadConfig(overrides: Record<string, unknown> = {}): AppConfig {
  const ignoreRaw = overrides.ignorePatterns ?? process.env.AICR_IGNORE_PATTERNS;
  const ignorePatterns =
    typeof ignoreRaw === 'string'
      ? ignoreRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : Array.isArray(ignoreRaw)
        ? ignoreRaw
        : undefined;

  const rawConfig = {
    ai: {
      provider: overrides.provider ?? process.env.AICR_AI_PROVIDER ?? 'openai',
      apiKey: overrides.apiKey ?? process.env.AICR_AI_API_KEY,
      model:
        overrides.model ??
        process.env.AICR_AI_MODEL ??
        (process.env.AICR_AI_PROVIDER === 'gemini'
          ? 'gemini-3.6-flash'
          : process.env.AICR_AI_PROVIDER === 'anthropic'
            ? 'claude-3-5-sonnet-20240620'
            : 'gpt-4o'),
      temperature: process.env.AICR_AI_TEMPERATURE ? Number(process.env.AICR_AI_TEMPERATURE) : 0.1,
      timeoutMs: process.env.AICR_AI_TIMEOUT ? Number(process.env.AICR_AI_TIMEOUT) : 30000,
    },
    github: {
      token: overrides.githubToken ?? process.env.AICR_GITHUB_TOKEN,
    },
    review: {
      concurrency: process.env.AICR_REVIEW_CONCURRENCY
        ? Number(process.env.AICR_REVIEW_CONCURRENCY)
        : 5,
      maxFileSizeBytes: process.env.AICR_MAX_FILE_SIZE
        ? Number(process.env.AICR_MAX_FILE_SIZE)
        : 100_000,
      ignorePatterns,
    },
    logging: {
      level: process.env.AICR_LOG_LEVEL ?? 'info',
    },
  };

  try {
    return ConfigSchema.parse(rawConfig);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new AppError(ErrorCode.CONFIG_ERROR, `Invalid Configuration: ${messages}`, false, err);
    }
    throw err;
  }
}
