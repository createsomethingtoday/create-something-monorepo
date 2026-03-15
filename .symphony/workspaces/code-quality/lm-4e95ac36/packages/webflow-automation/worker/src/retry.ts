export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

export class RetryExhaustedError extends Error {
  readonly attempts: number;
  readonly lastError: unknown;

  constructor(operation: string, attempts: number, lastError: unknown) {
    const detail = lastError instanceof Error ? lastError.message : String(lastError);
    super(`${operation} failed after ${attempts} attempts: ${detail}`);
    this.name = 'RetryExhaustedError';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultShouldRetry(_error: unknown): boolean {
  return true;
}

function backoffDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
  const jitter = Math.floor(Math.random() * Math.ceil(baseDelayMs / 2));
  return Math.min(maxDelayMs, exp + jitter);
}

export async function withRetry<T>(
  operation: string,
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 250;
  const maxDelayMs = options.maxDelayMs ?? 2_500;
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;

      const retryable = shouldRetry(error);
      if (!retryable || attempt === maxAttempts) {
        throw new RetryExhaustedError(operation, attempt, error);
      }

      const delay = backoffDelay(attempt, baseDelayMs, maxDelayMs);
      await sleep(delay);
    }
  }

  throw new RetryExhaustedError(operation, maxAttempts, lastError);
}
