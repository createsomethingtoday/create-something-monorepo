const WORKER_URL = 'https://gsap-validation-worker.createsomething.workers.dev/crawlWebsite';
const DIRECT_TIMEOUT_MS = 14_000;
const START_TIMEOUT_MS = 45_000;
const POLL_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 5_000;
const MAX_RETRIES = 3;
const POLL_RETRIES = 3;
const RETRYABLE_STATUS = new Set([502, 503, 504]);

const VALIDATION_OPTIONS = {
  maxDepth: 10,
  maxPages: 1000
} as const;

const ASYNC_VALIDATION_OPTIONS = {
  ...VALIDATION_OPTIONS,
  async: true
} as const;

export const LEGACY_IX2_VALIDATION_MESSAGE =
  'Legacy Webflow IX2 interactions detected. As of May 1, 2026, Marketplace templates submitted with IX2 interactions are rejected. Rebuild interactions with Webflow Interactions powered by GSAP (IX3), publish again, and rerun validation.';

export interface PublishedUrlValidationSummary {
  pageResults: Array<{
    url?: string;
    success?: boolean;
    passed?: boolean;
    error?: string;
    referrers?: string[];
    summary?: {
      validGsapCount?: number;
      flaggedCodeCount?: number;
      securityRiskCount?: number;
      legacyIx2Detected?: boolean;
      legacyIx2Count?: number;
      passed?: boolean;
    };
    details?: {
      flaggedCode?: Array<{
        message?: string;
        policy?: string;
      }>;
    };
  }>;
  siteResults: {
    pageCount: number;
    analyzedCount: number;
    passedCount: number;
    failedCount: number;
    requestFailureCount: number;
    validationFailureCount: number;
    incomplete: boolean;
  };
  passed: boolean;
  gsapDetected: boolean;
  legacyIx2Detected: boolean;
  raw: Record<string, unknown>;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function postWorker(payload: Record<string, unknown>, timeoutMs: number) {
  const response = await fetchWithTimeout(
    WORKER_URL,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    },
    timeoutMs
  );

  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok) {
    const error = new Error(
      typeof data?.error === 'string' ? data.error : `Worker HTTP ${response.status}`
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  if (!data) {
    throw new Error('Validation service returned an invalid response.');
  }

  return data;
}

function isRetryableWorkerError(error: Error) {
  const status = (error as Error & { status?: number }).status;
  return (
    error.name !== 'AbortError' &&
    (error instanceof TypeError || (typeof status === 'number' && RETRYABLE_STATUS.has(status)))
  );
}

export function normalizePublishedUrl(rawValue: string): string {
  if (typeof rawValue !== 'string' || rawValue.trim() === '') {
    throw new Error('Published URL is required.');
  }

  const trimmed = rawValue.trim();
  const matched = trimmed.match(/https:\/\/[a-z0-9-]+\.webflow\.io(?:\/[^\s]*)?/i);
  const candidate = matched ? matched[0] : trimmed;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('Enter a valid published Webflow URL.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error("URL must start with 'https://'.");
  }

  if (!parsed.hostname.toLowerCase().endsWith('.webflow.io')) {
    throw new Error("URL must use a '.webflow.io' hostname.");
  }

  parsed.hash = '';
  if (!parsed.pathname) {
    parsed.pathname = '/';
  }

  return parsed.toString();
}

function summarizeWorkerResponse(data: Record<string, unknown>): PublishedUrlValidationSummary {
  if (data.success !== true) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Validation service returned an invalid response.');
  }

  const pageResults = Array.isArray(data.pageResults)
    ? (data.pageResults as PublishedUrlValidationSummary['pageResults'])
    : [];
  const siteResults = (typeof data.siteResults === 'object' && data.siteResults
    ? (data.siteResults as Record<string, unknown>)
    : {}) as Record<string, unknown>;

  const analyzedCount =
    typeof siteResults.analyzedCount === 'number'
      ? siteResults.analyzedCount
      : pageResults.filter((page) => page.success !== false).length;
  const passedCount =
    typeof siteResults.passedCount === 'number'
      ? siteResults.passedCount
      : pageResults.filter((page) => page.success !== false && page.passed).length;
  const requestFailureCount =
    typeof siteResults.requestFailureCount === 'number'
      ? siteResults.requestFailureCount
      : pageResults.filter((page) => page.success === false).length;
  const validationFailureCount =
    typeof siteResults.validationFailureCount === 'number'
      ? siteResults.validationFailureCount
      : pageResults.filter((page) => page.success !== false && !page.passed).length;
  const failedCount =
    typeof siteResults.failedCount === 'number'
      ? siteResults.failedCount
      : requestFailureCount + validationFailureCount;
  const pageCount =
    typeof siteResults.pageCount === 'number' ? siteResults.pageCount : pageResults.length;
  const crawlStats =
    typeof data.crawlStats === 'object' && data.crawlStats
      ? (data.crawlStats as Record<string, unknown>)
      : {};
  const incomplete =
    siteResults.incomplete === true ||
    crawlStats.partial === true ||
    crawlStats.truncatedByPageLimit === true;
  const passed =
    data.passed === true &&
    failedCount === 0 &&
    analyzedCount === pageCount &&
    pageCount > 0 &&
    !incomplete;
  const gsapDetected = pageResults.some((page) => (page.summary?.validGsapCount || 0) > 0);
  const legacyIx2Detected = pageResults.some(
    (page) =>
      page.summary?.legacyIx2Detected === true ||
      page.details?.flaggedCode?.some(
        (item) => item.policy === 'ix2-rejected' || /legacy webflow ix2/i.test(item.message || '')
      )
  );

  return {
    raw: data,
    pageResults,
    siteResults: {
      pageCount,
      analyzedCount,
      passedCount,
      failedCount,
      requestFailureCount,
      validationFailureCount,
      incomplete
    },
    passed,
    gsapDetected,
    legacyIx2Detected
  };
}

async function startWorkflow(url: string) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await postWorker({ url, ...ASYNC_VALIDATION_OPTIONS }, START_TIMEOUT_MS);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Validation could not be started.');
      const retryable = isRetryableWorkerError(lastError);

      if (!retryable || attempt === MAX_RETRIES || lastError.name === 'AbortError') {
        throw lastError;
      }
    }
  }

  throw lastError || new Error('Validation could not be started.');
}

async function runDirectValidation(url: string) {
  return await postWorker({ url, ...VALIDATION_OPTIONS }, DIRECT_TIMEOUT_MS);
}

async function pollWorkflow(url: string, instanceId: string) {
  const startedAt = Date.now();

  while (true) {
    if (Date.now() - startedAt > 10 * 60 * 1000) {
      throw new Error('Validation timed out while waiting for the full project crawl to finish.');
    }

    for (let attempt = 1; attempt <= POLL_RETRIES; attempt += 1) {
      try {
        const data = (await postWorker(
          { url, instanceId },
          POLL_TIMEOUT_MS
        )) as Record<string, unknown>;

        if (data.success === true && Array.isArray(data.pageResults)) {
          return data;
        }

        const status = typeof data.status === 'string' ? data.status : 'running';
        if (status === 'complete' && typeof data.output === 'object' && data.output) {
          return data.output as Record<string, unknown>;
        }

        if (status === 'errored' || status === 'error' || status === 'terminated') {
          throw new Error(
            typeof data.error === 'string' ? data.error : 'Validation workflow failed.'
          );
        }
        break;
      } catch (error) {
        const typedError = error instanceof Error ? error : new Error('Validation workflow failed.');
        const status = (typedError as Error & { status?: number }).status;
        const retryable =
          typedError.name === 'AbortError' ||
          typedError instanceof TypeError ||
          (typeof status === 'number' && RETRYABLE_STATUS.has(status));

        if (!retryable || attempt === POLL_RETRIES) {
          throw typedError;
        }

        await sleep(1000 * attempt);
      }
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

export async function runPublishedUrlValidation(input: string): Promise<{
  normalizedUrl: string;
  summary: PublishedUrlValidationSummary;
}> {
  const normalizedUrl = normalizePublishedUrl(input);
  try {
    const workerData = await runDirectValidation(normalizedUrl);
    return {
      normalizedUrl,
      summary: summarizeWorkerResponse(workerData)
    };
  } catch (error) {
    const typedError = error instanceof Error ? error : new Error('Validation failed.');
    if (typedError.name === 'AbortError') {
      throw new Error('Published URL validation took longer than expected. Try again in a minute.');
    }
    if (!isRetryableWorkerError(typedError)) {
      throw typedError;
    }
  }

  const startData = await startWorkflow(normalizedUrl);

  if (!startData || typeof startData.instanceId !== 'string') {
    throw new Error('Validation service did not return a workflow instance.');
  }

  const workerData = await pollWorkflow(normalizedUrl, startData.instanceId);
  return {
    normalizedUrl,
    summary: summarizeWorkerResponse(workerData)
  };
}
