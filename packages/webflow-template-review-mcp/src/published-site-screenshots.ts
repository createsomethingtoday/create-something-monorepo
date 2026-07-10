/**
 * Policy and configuration for the published-site screenshot tool.
 *
 * The capture itself runs in the worker via the Cloudflare Browser Rendering
 * binding; this module holds the pure, testable parts: target URL policy
 * (same-origin by construction, https only) and viewport/quality bounds.
 * It mirrors the trust boundary of the E2B sandbox bundle it supersedes:
 * bounded, read-only, evidence-only — no credentials ever reach the page.
 */

export interface ScreenshotViewport {
  name: string;
  width: number;
  height: number;
}

export const SCREENSHOT_VIEWPORTS: Record<string, ScreenshotViewport> = {
  desktop: { name: 'desktop', width: 1280, height: 1600 },
  mobile: { name: 'mobile', width: 390, height: 844 },
};

export const DEFAULT_VIEWPORT_NAMES = ['desktop', 'mobile'] as const;

export const SCREENSHOT_DEFAULT_QUALITY = 60;
export const SCREENSHOT_MIN_QUALITY = 30;
export const SCREENSHOT_MAX_QUALITY = 80;

/** Cap full-page captures so a long marketing page cannot blow up the response. */
export const SCREENSHOT_MAX_FULL_PAGE_HEIGHT = 4000;

export const SCREENSHOT_NAVIGATION_TIMEOUT_MS = 20_000;

export function clampScreenshotQuality(quality?: number): number {
  if (typeof quality !== 'number' || !Number.isFinite(quality)) return SCREENSHOT_DEFAULT_QUALITY;
  return Math.min(SCREENSHOT_MAX_QUALITY, Math.max(SCREENSHOT_MIN_QUALITY, Math.round(quality)));
}

export function resolveViewports(names?: string[]): ScreenshotViewport[] {
  const requested = names && names.length > 0 ? names : [...DEFAULT_VIEWPORT_NAMES];
  const seen = new Set<string>();
  const viewports: ScreenshotViewport[] = [];
  for (const name of requested) {
    const viewport = SCREENSHOT_VIEWPORTS[name];
    if (!viewport || seen.has(name)) continue;
    seen.add(name);
    viewports.push(viewport);
  }
  return viewports.length > 0 ? viewports : [SCREENSHOT_VIEWPORTS.desktop];
}

export type CaptureTargetResult =
  | { ok: true; url: string; origin: string }
  | { ok: false; error: string };

/**
 * Build the capture URL from the reviewed site's published URL plus an
 * optional site-relative path. Same-origin is guaranteed by construction:
 * the path can never change the host, and only https origins are accepted.
 */
export function buildCaptureTarget(publishedUrl: string, path?: string): CaptureTargetResult {
  let parsed: URL;
  try {
    parsed = new URL(publishedUrl);
  } catch {
    return { ok: false, error: `published_url is not a valid URL: ${publishedUrl}` };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'published_url must be https.' };
  }

  const rawPath = path?.trim() || parsed.pathname || '/';
  if (!rawPath.startsWith('/')) {
    return { ok: false, error: `path must be site-relative and start with "/": ${rawPath}` };
  }
  // Reject protocol-relative escapes like //evil.example
  if (rawPath.startsWith('//')) {
    return { ok: false, error: 'path must not start with "//".' };
  }

  const target = new URL(rawPath, parsed.origin);
  if (target.origin !== parsed.origin) {
    return { ok: false, error: 'Resolved capture URL escaped the published site origin.' };
  }

  return { ok: true, url: target.toString(), origin: parsed.origin };
}
