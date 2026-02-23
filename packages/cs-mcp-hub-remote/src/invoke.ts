import type { CapabilityClass, RetryProfile } from './policy';

export type InvokePath = 'legacy_proxy' | 'broker';

export type RetryExecutionInput<T> = {
  call: (attempt: number) => Promise<T>;
  retryProfile: RetryProfile;
  capabilityClass: CapabilityClass;
  idempotencyKey?: string;
  path: InvokePath;
};

export type RetryExecutionResult<T> = {
  result: T;
  attempts: number;
  retried: boolean;
};

export async function executeWithRetry<T>(input: RetryExecutionInput<T>): Promise<RetryExecutionResult<T>> {
  const {
    call,
    retryProfile,
    capabilityClass,
    idempotencyKey,
    path,
  } = input;

  const retryEnabledForWrite = capabilityClass !== 'write' && capabilityClass !== 'mixed'
    ? true
    : Boolean(idempotencyKey) && path === 'broker';

  const maxAttempts = retryEnabledForWrite ? retryProfile.maxAttempts : 1;

  let attempt = 0;
  let lastError: unknown;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const result = await call(attempt);
      if (shouldRetryResult(result, retryProfile) && attempt < maxAttempts) {
        await delay(nextBackoffMs(attempt, retryProfile));
        continue;
      }

      return {
        result,
        attempts: attempt,
        retried: attempt > 1,
      };
    } catch (error) {
      lastError = error;
      if (!shouldRetryError(error, retryProfile) || attempt >= maxAttempts) {
        throw error;
      }

      await delay(nextBackoffMs(attempt, retryProfile));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError ?? 'Unknown invocation error'));
}

function shouldRetryResult(result: unknown, profile: RetryProfile): boolean {
  if (!isMcpErrorResult(result)) {
    return false;
  }

  const message = extractMcpErrorText(result).toLowerCase();
  if (profile.nonRetryableErrorSubstrings.some((needle) => message.includes(needle))) {
    return false;
  }

  if (containsRetryableStatusCode(message, profile.retryableStatusCodes)) {
    return true;
  }

  return profile.retryableErrorSubstrings.some((needle) => message.includes(needle));
}

function shouldRetryError(error: unknown, profile: RetryProfile): boolean {
  const message = toErrorMessage(error).toLowerCase();

  if (profile.nonRetryableErrorSubstrings.some((needle) => message.includes(needle))) {
    return false;
  }

  if (containsRetryableStatusCode(message, profile.retryableStatusCodes)) {
    return true;
  }

  return profile.retryableErrorSubstrings.some((needle) => message.includes(needle));
}

function containsRetryableStatusCode(message: string, statusCodes: number[]): boolean {
  return statusCodes.some((status) => {
    const token = String(status);
    return message.includes(` ${token}`) || message.includes(`http ${token}`) || message.includes(`status ${token}`);
  });
}

function nextBackoffMs(attempt: number, profile: RetryProfile): number {
  const exponential = Math.min(
    profile.maxDelayMs,
    profile.baseDelayMs * (2 ** Math.max(0, attempt - 1)),
  );

  if (!profile.jitter) {
    return exponential;
  }

  const jitterFactor = 0.5 + Math.random() * 0.5;
  return Math.floor(exponential * jitterFactor);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, ms));
  });
}

function isMcpErrorResult(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return (value as Record<string, unknown>).isError === true;
}

function extractMcpErrorText(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return '';
  }

  const content = (value as Record<string, unknown>).content;
  if (!Array.isArray(content)) {
    return '';
  }

  for (const item of content) {
    if (!item || typeof item !== 'object') continue;
    const text = (item as Record<string, unknown>).text;
    if (typeof text === 'string' && text.trim().length > 0) {
      return text;
    }
  }

  return '';
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error ?? '');
}
