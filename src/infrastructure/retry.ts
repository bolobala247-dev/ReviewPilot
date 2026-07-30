import { logger } from './logger';
import { AppError } from '@domain/errors';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
}

export async function retry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const initialDelayMs = opts.initialDelayMs ?? 1000;
  const maxDelayMs = opts.maxDelayMs ?? 15000;

  let attempt = 1;
  while (attempt <= maxAttempts) {
    try {
      return await fn();
    } catch (error: unknown) {
      const err = error as {
        status?: number;
        message?: string;
        response?: { headers?: Record<string, string> };
      };
      const isRetryable =
        error instanceof AppError
          ? error.isRetryable
          : Boolean((err.status && err.status === 429) || (err.status && err.status >= 500));

      if (!isRetryable || attempt >= maxAttempts) {
        throw error;
      }

      let delayMs = initialDelayMs * Math.pow(2, attempt - 1);
      delayMs += Math.random() * delayMs * 0.1;
      delayMs = Math.min(delayMs, maxDelayMs);

      if (err.response?.headers?.['retry-after']) {
        const retryAfterHeader = err.response.headers['retry-after'];
        const parsedSeconds = parseInt(retryAfterHeader, 10);
        if (!isNaN(parsedSeconds)) {
          delayMs = Math.max(delayMs, parsedSeconds * 1000);
        }
      }

      logger.warn(
        { attempt, maxAttempts, delayMs, error: err.message },
        'Retrying failed operation after delay',
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt++;
    }
  }

  throw new Error('Unexpected retry loop termination');
}
