import { getCloudflareEnv } from '../../vendor/core/runtime';

const WORKER_URL = 'https://gsap-validation-worker.createsomething.workers.dev/crawlWebsite';
const WORKER_SERVICE_URL = 'https://gsap-validation-worker.internal/crawlWebsite';
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
      unicornStudioDetected?: boolean;
      unicornStudioCount?: number;
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
  unicornStudioDetected: boolean;
  raw: Record<string, unknown>;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
  fetcher: typeof fetch = fetch
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetcher(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function postWorker(payload: Record<string, unknown>, timeoutMs: number) {
  const env = await getCloudflareEnv();
  const validationWorker = env?.GSAP_VALIDATION_WORKER;
  const workerUrl = validationWorker ? WORKER_SERVICE_URL : WORKER_URL;
  const workerFetch = validationWorker
    ? (validationWorker.fetch.bind(validationWorker) as typeof fetch)
    : fetch;

  const response = await fetchWithTimeout(
    workerUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    },
    timeoutMs,
    workerFetch
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

function extractHttpStatus(error?: string) {
  if (typeof error !== 'string') {
    return null;
  }

  const match = error.match(/HTTP error:\s*(\d{3})/i);
  return match ? Number(match[1]) : null;
}

function toDisplayPath(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}` || '/';
  } catch {
    return url;
  }
}

function formatReferrers(referrers?: string[]) {
  if (!Array.isArray(referrers) || referrers.length === 0) {
    return '';
  }

  const displayReferrers = referrers.map(toDisplayPath);
  if (displayReferrers.length === 1) {
    return displayReferrers[0];
  }
  if (displayReferrers.length === 2) {
    return `${displayReferrers[0]} and ${displayReferrers[1]}`;
  }

  return `${displayReferrers[0]}, ${displayReferrers[1]}, and ${displayReferrers.length - 2} more page${displayReferrers.length - 2 === 1 ? '' : 's'}`;
}

function buildRequestFailureMessage(
  failedPage: PublishedUrlValidationSummary['pageResults'][number] | undefined
) {
  if (!failedPage) {
    return 'Some published pages could not be fetched during the published-site crawl.';
  }

  const status = extractHttpStatus(failedPage.error);
  if (status === 404 && failedPage.url) {
    const linkedFrom = formatReferrers(failedPage.referrers);
    return linkedFrom
      ? `Broken internal link detected: ${failedPage.url} returned 404 during the published-site crawl. Linked from ${linkedFrom}. Remove or fix that link and validate again.`
      : `Broken internal link detected: ${failedPage.url} returned 404 during the published-site crawl. Remove or fix that link and validate again.`;
  }

  if (failedPage.url && failedPage.error) {
    return `Some published pages could not be fetched, starting with ${failedPage.url} (${failedPage.error}).`;
  }

  if (failedPage.url) {
    return `Some published pages could not be fetched, starting with ${failedPage.url}.`;
  }

  return 'Some published pages could not be fetched during the published-site crawl.';
}

function addUniqueIssue(issues: string[], message: string | undefined) {
  const normalized = typeof message === 'string' ? message.trim() : '';
  if (!normalized || issues.includes(normalized)) {
    return;
  }

  issues.push(normalized);
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
    throw new Error(
      typeof data.error === 'string'
        ? data.error
        : 'Validation service returned an invalid response.'
    );
  }

  const pageResults = Array.isArray(data.pageResults)
    ? (data.pageResults as PublishedUrlValidationSummary['pageResults'])
    : [];
  const siteResults = (
    typeof data.siteResults === 'object' && data.siteResults
      ? (data.siteResults as Record<string, unknown>)
      : {}
  ) as Record<string, unknown>;

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
  const unicornStudioDetected = pageResults.some(
    (page) =>
      page.summary?.unicornStudioDetected === true ||
      page.details?.flaggedCode?.some(
        (item) =>
          item.policy === 'custom-code-third-party-unicorn-studio' ||
          /unicorn studio/i.test(item.message || '')
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
    legacyIx2Detected,
    unicornStudioDetected
  };
}

export function getPublishedUrlValidationIssues(summary: PublishedUrlValidationSummary) {
  const issues: string[] = [];

  if (summary.passed) {
    return issues;
  }

  if (summary.siteResults.pageCount === 0 || summary.siteResults.analyzedCount === 0) {
    return [
      'No published pages were crawled. Confirm the site is public and try validation again.'
    ];
  }

  if (summary.siteResults.incomplete) {
    return ['The full published-site crawl did not finish. Try validation again in a minute.'];
  }

  if (summary.siteResults.requestFailureCount > 0) {
    return [buildRequestFailureMessage(summary.pageResults.find((page) => page.success === false))];
  }

  if (summary.legacyIx2Detected) {
    addUniqueIssue(issues, LEGACY_IX2_VALIDATION_MESSAGE);
  }

  for (const page of summary.pageResults) {
    if (page.success === false || page.passed !== false) {
      continue;
    }

    for (const flagged of page.details?.flaggedCode || []) {
      addUniqueIssue(issues, flagged.message);
    }
  }

  const failedPage = summary.pageResults.find(
    (page) => page.success !== false && page.passed === false
  );
  addUniqueIssue(issues, failedPage?.error);

  if (issues.length === 0) {
    issues.push('The published site did not pass the marketplace validation checks.');
  }

  return issues;
}

export function buildPublishedUrlValidationMessage(summary: PublishedUrlValidationSummary) {
  if (summary.passed) {
    return summary.siteResults.passedCount > 0
      ? `Published site validated across ${summary.siteResults.passedCount} page${summary.siteResults.passedCount === 1 ? '' : 's'}.`
      : 'Published site validated.';
  }

  const issues = getPublishedUrlValidationIssues(summary);
  if (issues.length === 1) {
    return issues[0];
  }

  return `Published URL validation found ${issues.length} blocking issues: ${issues
    .map((issue, index) => `${index + 1}. ${issue}`)
    .join(' ')}`;
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
        const data = (await postWorker({ url, instanceId }, POLL_TIMEOUT_MS)) as Record<
          string,
          unknown
        >;

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
        const typedError =
          error instanceof Error ? error : new Error('Validation workflow failed.');
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
