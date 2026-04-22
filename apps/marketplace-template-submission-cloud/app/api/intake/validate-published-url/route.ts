import { jsonNoStore } from '../../../../lib/server/responses';
import {
  normalizePublishedUrl,
  runPublishedUrlValidation
} from '../../../../lib/intake/published-url';
import { analyzePublishedTemplate } from '../../../../lib/intake/template-analyzer';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { url?: string };

  try {
    const normalizedUrl = normalizePublishedUrl(body.url || '');
    let autofillWarning: string | undefined;

    const autofillPromise = analyzePublishedTemplate(normalizedUrl).catch((error) => {
      autofillWarning =
        error instanceof Error ? error.message : 'Template analyzer unavailable.';
      return null;
    });

    const result = await runPublishedUrlValidation(normalizedUrl);
    const autofill = result.summary.passed ? await autofillPromise : null;

    return jsonNoStore({
      passed: result.summary.passed,
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
