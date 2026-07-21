import type { PublishedUrlValidationSummary } from '../intake/published-url';
import {
  runValidatorAppSubmissionPreflight,
  type ValidatorAppPreflight
} from '../intake/validator-app';

// Successful validations are cached briefly so the final submission does not
// re-run the multi-minute published-site crawl the creator just completed via
// the "Validate template" step. Uses the Workers Cache API (per-colo, no
// binding required); outside the Workers runtime this is a no-op.
const CACHE_TTL_SECONDS = 10 * 60;
const CACHE_KEY_BASE = 'https://marketplace-template-submission.internal/published-url-validation';

export type CachedPublishedValidation = {
  normalizedUrl: string;
  summary: Pick<
    PublishedUrlValidationSummary,
    'passed' | 'gsapDetected' | 'legacyIx2Detected' | 'unicornStudioDetected' | 'siteResults'
  >;
  validatorPreflight: ValidatorAppPreflight | null;
  cachedAt: string;
};

function getCacheStorage(): Cache | null {
  try {
    const store = (globalThis as { caches?: { default?: Cache } }).caches;
    return store?.default ?? null;
  } catch {
    return null;
  }
}

function cacheRequestFor(normalizedUrl: string): Request {
  const key = new URL(CACHE_KEY_BASE);
  key.searchParams.set('url', normalizedUrl);
  return new Request(key.toString(), { method: 'GET' });
}

export async function getCachedPublishedValidation(
  normalizedUrl: string
): Promise<CachedPublishedValidation | null> {
  const cache = getCacheStorage();
  if (!cache) return null;

  try {
    const hit = await cache.match(cacheRequestFor(normalizedUrl));
    if (!hit) return null;

    const data = (await hit.json()) as CachedPublishedValidation | null;
    if (!data || data.normalizedUrl !== normalizedUrl || data.summary?.passed !== true) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export async function storeCachedPublishedValidation(
  entry: CachedPublishedValidation
): Promise<void> {
  const cache = getCacheStorage();
  if (!cache) return;

  try {
    await cache.put(
      cacheRequestFor(entry.normalizedUrl),
      new Response(JSON.stringify(entry), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${CACHE_TTL_SECONDS}`
        }
      })
    );
  } catch {
    // Best-effort cache; submission falls back to a fresh validation run.
  }
}

export async function revalidateCachedPublishedValidation(
  entry: CachedPublishedValidation,
  runPreflight: (url: string) => Promise<ValidatorAppPreflight> = runValidatorAppSubmissionPreflight
) {
  const validatorPreflight = await runPreflight(entry.normalizedUrl);
  return {
    accepted: !validatorPreflight.required || validatorPreflight.passed,
    validatorPreflight
  };
}
