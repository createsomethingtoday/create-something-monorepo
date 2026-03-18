import { jsonNoStore } from '../../../../lib/server/responses';
import { runPublishedUrlValidation } from '../../../../lib/intake/published-url';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { url?: string };

  try {
    const result = await runPublishedUrlValidation(body.url || '');
    return jsonNoStore({
      passed: result.summary.passed,
      normalizedUrl: result.normalizedUrl,
      gsapDetected: result.summary.gsapDetected,
      siteResults: result.summary.siteResults,
      pageResults: result.summary.pageResults
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
