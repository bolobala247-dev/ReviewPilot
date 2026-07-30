import { logger } from './logger';
import { AppError } from '../domain/errors';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
}

export async function retry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const initialDelayMs = opts.initialDelayMs ?? 1000;
  const maxDelayMs = opts.maxDelayMs ?? 15000;

  let attempt = 1;
  while (attempt <= maxAttempts) {
    try {
      return await fn();
    } catch (error: any) {
      const isRetryable =
        error instanceof AppError ? error.isRetryable : Boolean(error?.status === 429 || error?.status >= 500);

      if (!isRetryable || attempt >= maxAttempts) {
        throw error;
      }

      let delayMs = initialDelayMs * Math.pow(2, attempt - 1);
      // Add 10% jitter
      delayMs += Math.random() * delayMs * 0.1;
      delayMs = Math.min(delayMs, maxDelayMs);

      // Check Retry-After header if present
      if (error?.response?.headers?.['retry-after']) {
        const retryAfterHeader = error.response.headers['retry-after'];
        const parsedSeconds = parseInt(retryAfterHeader, 10);
        if (!isNaN(parsedSeconds)) {
          delayMs = Math.max(delayMs, parsedSeconds * 1000);
        }
      }

      logger.warn(
        { attempt, maxAttempts, delayMs, error: error.message },
        'Retrying failed operation after delay',
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt++;
    }
  }

  throw new Error('Unexpected retry loop termination');
}
