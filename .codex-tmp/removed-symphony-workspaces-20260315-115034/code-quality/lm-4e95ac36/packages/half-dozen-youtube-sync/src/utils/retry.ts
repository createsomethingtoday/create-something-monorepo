/**
 * Retry utility with exponential backoff
 * 
 * Handles transient failures for YouTube and Notion API calls.
 * Uses exponential backoff with jitter to avoid thundering herd.
 */

import { MAX_RETRIES, RETRY_BASE_DELAY, RETRY_MAX_DELAY } from '../config.js';

// =============================================================================
// Types
// =============================================================================

export interface RetryOptions {
  /** Maximum number of retry attempts (default: from config) */
  maxRetries?: number;
  /** Base delay in ms (default: from config) */
  baseDelay?: number;
  /** Maximum delay in ms (default: from config) */
  maxDelay?: number;
  /** Function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
  /** Called before each retry with attempt number and delay */
  onRetry?: (attempt: number, delay: number, error: unknown) => void;
}

// =============================================================================
// Default Retryable Check
// =============================================================================

/**
 * Default check for retryable errors.
 * Retries on rate limits (429), server errors (5xx), and network errors.
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Rate limit errors
    if (message.includes('429') || message.includes('rate limit') || message.includes('too many requests')) {
      return true;
    }

    // Server errors (5xx)
    if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
      return true;
    }

    // Network errors
    if (message.includes('econnreset') || message.includes('econnrefused') || message.includes('etimedout')) {
      return true;
    }

    // Notion-specific conflict
    if (message.includes('conflict')) {
      return true;
    }

    // YouTube-specific transient errors
    if (message.includes('unavailable') && !message.includes('video unavailable')) {
      return true;
    }
  }

  return false;
}

// =============================================================================
// Retry Implementation
// =============================================================================

/**
 * Execute a function with exponential backoff retry.
 * 
 * @param fn - Async function to execute
 * @param options - Retry configuration
 * @returns Result of the function
 * @throws Last error if all retries exhausted
 * 
 * @example
 * ```ts
 * const result = await withRetry(
 *   () => notionClient.pages.create({ ... }),
 *   { maxRetries: 3, onRetry: (n, d) => console.log(`Retry ${n} in ${d}ms`) }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = MAX_RETRIES,
    baseDelay = RETRY_BASE_DELAY,
    maxDelay = RETRY_MAX_DELAY,
    isRetryable = isRetryableError,
    onRetry
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted attempts or error isn't retryable
      if (attempt >= maxRetries || !isRetryable(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff + jitter
      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * baseDelay;
      const delay = Math.min(exponentialDelay + jitter, maxDelay);

      // Notify before retry
      if (onRetry) {
        onRetry(attempt + 1, delay, error);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}

/**
 * Convenience wrapper for Notion API calls with retry.
 */
export async function withNotionRetry<T>(fn: () => Promise<T>): Promise<T> {
  return withRetry(fn, {
    onRetry: (attempt, delay, error) => {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`Notion API retry ${attempt} in ${delay}ms: ${msg}`);
    }
  });
}

/**
 * Convenience wrapper for YouTube API calls with retry.
 */
export async function withYouTubeRetry<T>(fn: () => Promise<T>): Promise<T> {
  return withRetry(fn, {
    onRetry: (attempt, delay, error) => {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`YouTube API retry ${attempt} in ${delay}ms: ${msg}`);
    }
  });
}
