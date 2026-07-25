// ── Agent payload boundaries ─────────────────────────────────────────────────
// Every URL in a display payload originates in the template search index and
// reaches the browser through the agent verbatim. The Worker is the primary
// gate; these checks are the second one, so a poisoned index row cannot put an
// arbitrary origin into an iframe, an anchor, or an <img> on webflow.com.

/** Published template sites. The only origins allowed inside the preview frame. */
const PREVIEW_HOST_SUFFIXES = ['.webflow.io'];

/** Marketplace destinations: template detail pages, checkout, creator profiles. */
const MARKETPLACE_HOST_SUFFIXES = ['webflow.com', '.webflow.com'];

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** Is this page itself being served from a developer machine? */
function isLoopbackOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    return LOOPBACK_HOSTS.has(new URL(origin).hostname);
  } catch {
    return false;
  }
}

function currentOrigin(): string | null {
  return typeof window === 'undefined' ? null : window.location?.origin ?? null;
}

function parseHttpsUrl(value: string | null | undefined, base = 'https://webflow.com'): URL | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  let url: URL;
  try {
    url = new URL(value, base);
  } catch {
    return null;
  }
  // Anything but https is rejected outright, which also excludes javascript:,
  // data: and blob: before they can reach a src or href. http is allowed only
  // for loopback, and only when the page itself is on loopback (see below).
  if (url.protocol === 'https:') return url;
  return url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname) ? url : null;
}

function hostMatches(host: string, suffixes: readonly string[]): boolean {
  const lower = host.toLowerCase();
  return suffixes.some((suffix) =>
    suffix.startsWith('.') ? lower.endsWith(suffix) : lower === suffix,
  );
}

/**
 * Returns the URL when it is a published template site safe to frame, else null.
 * Published sites ship `frame-ancestors … *.webflow.com`, so the browser would
 * refuse anything else anyway — failing here keeps the empty frame off screen.
 */
export function safePreviewUrl(
  value: string | null | undefined,
  pageOrigin: string | null = currentOrigin(),
): string | null {
  // Local harness and dev servers cannot own a *.webflow.io hostname, so a
  // loopback preview is accepted — but only when the page itself is on
  // loopback. Production data therefore can never point the frame anywhere but
  // a published template site.
  const devOrigin = isLoopbackOrigin(pageOrigin);
  const url = parseHttpsUrl(value, devOrigin && pageOrigin ? pageOrigin : undefined);
  if (!url) return null;
  if (hostMatches(url.hostname, PREVIEW_HOST_SUFFIXES)) return url.toString();
  if (devOrigin && LOOPBACK_HOSTS.has(url.hostname)) return url.toString();
  return null;
}

/** Returns the URL when it points at a Webflow marketplace destination. */
export function safeMarketplaceUrl(value: string | null | undefined): string | null {
  const url = parseHttpsUrl(value);
  if (!url || !hostMatches(url.hostname, MARKETPLACE_HOST_SUFFIXES)) return null;
  return url.toString();
}

/**
 * Returns the URL when it is an https image reference. Host is not constrained
 * — creator avatars and thumbnails legitimately live on several CDNs — but the
 * scheme is, so a payload cannot smuggle a javascript: or data: source.
 */
export function safeImageUrl(value: string | null | undefined): string | null {
  const url = parseHttpsUrl(value);
  return url ? url.toString() : null;
}
