import { jsonNoStore } from '../../../../lib/server/responses';
import {
  normalizePublishedUrl,
  runPublishedUrlValidation
} from '../../../../lib/intake/published-url';
import { analyzePublishedTemplate } from '../../../../lib/intake/template-analyzer';

const ANALYZER_WAIT_TIMEOUT_MS = 8_000;

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
    const failedPage = summary.pageResults.find((page) => page.success === false);
    if (failedPage?.url) {
      return `Some published pages could not be crawled, starting with ${failedPage.url}. Try validation again in a minute.`;
    }
    return 'Some published pages could not be crawled. Try validation again in a minute.';
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
  const body = (await request.json().catch(() => ({}))) as { url?: string };

  try {
    const normalizedUrl = normalizePublishedUrl(body.url || '');
    let autofillWarning: string | undefined;

    const autofillPromise = analyzePublishedTemplate(normalizedUrl).catch((error) => {
      autofillWarning = toAutofillWarning(error);
      return null;
    });

    const result = await runPublishedUrlValidation(normalizedUrl);
    let autofill: Awaited<ReturnType<typeof analyzePublishedTemplate>> | null = null;

    if (result.summary.passed) {
      const analyzerResult = await Promise.race([
        autofillPromise,
        sleep(ANALYZER_WAIT_TIMEOUT_MS).then(() => 'timeout' as const)
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
      siteResults: result.summary.siteResults,
      pageResults: result.summary.pageResults,
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
