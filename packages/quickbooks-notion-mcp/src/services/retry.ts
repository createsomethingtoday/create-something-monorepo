import { logger } from "./logger.js";

// ── Retry with Exponential Backoff ──────────────────────────────────

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  retryableStatuses?: number[];
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  retryableStatuses: [429, 503, 502],
};

/**
 * Execute a fetch request with exponential backoff retry on transient errors.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const response = await fetch(url, init);

      if (response.ok || !opts.retryableStatuses.includes(response.status)) {
        return response;
      }

      // Retryable status — log and retry
      if (attempt < opts.maxRetries) {
        const delayMs = opts.baseDelayMs * Math.pow(2, attempt);
        logger.warn("Retryable API error, backing off", {
          status: response.status,
          attempt: attempt + 1,
          maxRetries: opts.maxRetries,
          delayMs,
          url: sanitizeUrl(url),
        });
        await sleep(delayMs);
      } else {
        // Final attempt failed with retryable status — return the response
        // so the caller can handle the error with its own error class
        return response;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < opts.maxRetries) {
        const delayMs = opts.baseDelayMs * Math.pow(2, attempt);
        logger.warn("Network error, retrying", {
          error: lastError.message,
          attempt: attempt + 1,
          maxRetries: opts.maxRetries,
          delayMs,
        });
        await sleep(delayMs);
      }
    }
  }

  throw lastError ?? new Error("Fetch failed after retries");
}

// ── Notion Throttle ─────────────────────────────────────────────────

/**
 * Simple throttle for Notion API calls (~3 req/sec).
 * Call before each Notion request during sync operations.
 */
let lastNotionRequestTime = 0;
const NOTION_MIN_INTERVAL_MS = 350; // ~3 req/sec with margin

export async function throttleNotionRequest(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastNotionRequestTime;

  if (elapsed < NOTION_MIN_INTERVAL_MS) {
    await sleep(NOTION_MIN_INTERVAL_MS - elapsed);
  }

  lastNotionRequestTime = Date.now();
}

// ── Helpers ─────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeUrl(url: string): string {
  // Remove query params that might contain tokens
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split("?")[0] ?? url;
  }
}
