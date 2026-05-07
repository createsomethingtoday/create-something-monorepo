import { jsonNoStore } from '../../../../lib/server/responses';
import {
  LEGACY_IX2_VALIDATION_MESSAGE,
  normalizePublishedUrl,
  runPublishedUrlValidation
} from '../../../../lib/intake/published-url';
import { analyzePublishedTemplate } from '../../../../lib/intake/template-analyzer';

const ANALYZER_WAIT_TIMEOUT_MS = 10_000;
const ROUTE_RESPONSE_BUDGET_MS = 16_000;
type PublishedPageResult = Awaited<
  ReturnType<typeof runPublishedUrlValidation>
>['summary']['pageResults'][number];
type ValidatePublishedUrlBody = {
  url?: string;
  includeAutofill?: boolean;
};

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

function buildRequestFailureMessage(failedPage: PublishedPageResult | undefined) {
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

function buildValidationMessage(result: Awaited<ReturnType<typeof runPublishedUrlValidation>>) {
  const { summary } = result;

  if (summary.passed) {
    return summary.siteResults.passedCount > 0
      ? `Published site validated across ${summary.siteResults.passedCount} page${summary.siteResults.passedCount === 1 ? '' : 's'}.`
      : 'Published site validated.';
  }

  if (summary.siteResults.pageCount === 0 || summary.siteResults.analyzedCount === 0) {
    return 'No published pages were crawled. Confirm the site is public and try validation again.';
  }

  if (summary.siteResults.incomplete) {
    return 'The full published-site crawl did not finish. Try validation again in a minute.';
  }

  if (summary.siteResults.requestFailureCount > 0) {
    return buildRequestFailureMessage(summary.pageResults.find((page) => page.success === false));
  }

  if (summary.legacyIx2Detected) {
    return LEGACY_IX2_VALIDATION_MESSAGE;
  }

  if (summary.siteResults.validationFailureCount > 0) {
    const failedPage = summary.pageResults.find((page) => page.success !== false && page.passed === false);
    const flaggedMessage = failedPage?.details?.flaggedCode?.find((item) => item.message)?.message;

    if (flaggedMessage) {
      return flaggedMessage;
    }

    if (failedPage?.error) {
      return failedPage.error;
    }

    return 'The published site did not pass the marketplace validation checks.';
  }

  return 'The published site did not pass the marketplace validation checks.';
}

function toAutofillWarning(error: unknown): string {
  const message = error instanceof Error ? error.message : '';

  if (/abort|timed out/i.test(message)) {
    return 'Template suggestions timed out. Continue filling the remaining fields manually.';
  }

  return 'Template suggestions are temporarily unavailable. Continue filling the remaining fields manually.';
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const body = (await request.json().catch(() => ({}))) as ValidatePublishedUrlBody;

  try {
    const includePageResults = new URL(request.url).searchParams.get('includePageResults') === '1';
    const normalizedUrl = normalizePublishedUrl(body.url || '');
    let autofillWarning: string | undefined;

    const shouldAnalyze = body.includeAutofill === true;
    const autofillPromise = shouldAnalyze
      ? analyzePublishedTemplate(normalizedUrl).catch((error) => {
          autofillWarning = toAutofillWarning(error);
          return null;
        })
      : Promise.resolve(null);

    const result = await runPublishedUrlValidation(normalizedUrl);
    let autofill: Awaited<ReturnType<typeof analyzePublishedTemplate>> | null = null;

    if (result.summary.passed && shouldAnalyze) {
      const analyzerWaitMs = Math.max(
        0,
        Math.min(ANALYZER_WAIT_TIMEOUT_MS, ROUTE_RESPONSE_BUDGET_MS - (Date.now() - startedAt))
      );
      const analyzerResult = await Promise.race([
        autofillPromise,
        sleep(analyzerWaitMs).then(() => 'timeout' as const)
      ]);

      if (analyzerResult === 'timeout') {
        autofillWarning =
          autofillWarning ||
          'Template suggestions are taking longer than expected. Continue filling the remaining fields manually.';
      } else {
        autofill = analyzerResult;
      }
    }

    return jsonNoStore({
      passed: result.summary.passed,
      message: buildValidationMessage(result),
      normalizedUrl: result.normalizedUrl,
      gsapDetected: result.summary.gsapDetected,
      legacyIx2Detected: result.summary.legacyIx2Detected,
      siteResults: result.summary.siteResults,
      ...(includePageResults ? { pageResults: result.summary.pageResults } : {}),
      autofill: autofill?.autofill,
      screenshotCount: autofill?.screenshotCount ?? 0,
      screenshotsDownloadUrl: autofill?.screenshotsDownloadUrl,
      autofillWarning
    });
  } catch (error) {
    return jsonNoStore(
      {
        passed: false,
        message: error instanceof Error ? error.message : 'Validation failed.'
      },
      { status: 400 }
    );
  }
}
