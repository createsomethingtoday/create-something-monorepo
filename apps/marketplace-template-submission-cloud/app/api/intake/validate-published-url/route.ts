import { jsonNoStore } from '../../../../lib/server/responses';
import {
  buildPublishedUrlValidationMessage,
  getPublishedUrlValidationIssues,
  normalizePublishedUrl,
  runPublishedUrlValidation
} from '../../../../lib/intake/published-url';
import { analyzePublishedTemplate } from '../../../../lib/intake/template-analyzer';
import { runValidatorAppSubmissionPreflight } from '../../../../lib/intake/validator-app';

const ANALYZER_WAIT_TIMEOUT_MS = 10_000;
const ROUTE_RESPONSE_BUDGET_MS = 16_000;
type ValidatePublishedUrlBody = {
  url?: string;
  includeAutofill?: boolean;
};

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
    const validatorPreflight = result.summary.passed
      ? await runValidatorAppSubmissionPreflight(result.normalizedUrl)
      : null;
    let autofill: Awaited<ReturnType<typeof analyzePublishedTemplate>> | null = null;

    if (
      result.summary.passed &&
      (!validatorPreflight?.required || validatorPreflight.passed) &&
      shouldAnalyze
    ) {
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

    const publishedIssues = getPublishedUrlValidationIssues(result.summary);
    const validatorIssues =
      validatorPreflight?.required && !validatorPreflight.passed ? validatorPreflight.issues : [];
    const passed =
      result.summary.passed && (!validatorPreflight?.required || validatorPreflight.passed);

    return jsonNoStore({
      passed,
      message:
        validatorPreflight?.required && !validatorPreflight.passed
          ? validatorPreflight.message
          : buildPublishedUrlValidationMessage(result.summary),
      validationIssues: [...publishedIssues, ...validatorIssues],
      normalizedUrl: result.normalizedUrl,
      gsapDetected: result.summary.gsapDetected,
      legacyIx2Detected: result.summary.legacyIx2Detected,
      unicornStudioDetected: result.summary.unicornStudioDetected,
      siteResults: result.summary.siteResults,
      ...(includePageResults ? { pageResults: result.summary.pageResults } : {}),
      validatorPreflight,
      autofill: autofill?.autofill,
      screenshotCount: autofill?.screenshotCount ?? 0,
      screenshotsDownloadUrl: autofill?.screenshotsDownloadUrl,
      autofillWarning
    }, { status: passed ? 200 : 400 });
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
