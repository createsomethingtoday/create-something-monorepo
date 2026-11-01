// Every URL in a template payload ultimately originates in the Marketplace
// index. The Worker is the primary gate; these browser checks are the second
// one, so a poisoned row cannot put an arbitrary origin into an iframe, link,
// or image on webflow.com.

/** Published template sites. The only origins allowed inside preview frames. */
const PREVIEW_HOST_SUFFIXES = ['.webflow.io'];

/** Marketplace destinations: template detail pages, checkout, creator profiles. */
const MARKETPLACE_HOST_SUFFIXES = ['webflow.com', '.webflow.com'];

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/**
 * Creator-authored previews run with an opaque origin and cannot navigate the
 * Marketplace page. Popups may escape only after an explicit visitor action.
 */
export const PREVIEW_IFRAME_SANDBOX =
  'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox';

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

function parseHttpsUrl(
  value: string | null | undefined,
  base = 'https://webflow.com',
  allowLoopbackHttp = false,
): URL | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  let url: URL;
  try {
    url = new URL(value, base);
  } catch {
    return null;
  }
  if (url.protocol === 'https:') return url;
  return allowLoopbackHttp && url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname)
    ? url
    : null;
}

function hostMatches(host: string, suffixes: readonly string[]): boolean {
  const lower = host.toLowerCase();
  return suffixes.some((suffix) =>
    suffix.startsWith('.') ? lower.endsWith(suffix) : lower === suffix,
  );
}

/** Returns the URL when it is a published template site safe to frame. */
export function safePreviewUrl(
  value: string | null | undefined,
  pageOrigin: string | null = currentOrigin(),
): string | null {
  const devOrigin = isLoopbackOrigin(pageOrigin);
  const url = parseHttpsUrl(
    value,
    devOrigin && pageOrigin ? pageOrigin : undefined,
    devOrigin,
  );
  if (!url) return null;
  if (hostMatches(url.hostname, PREVIEW_HOST_SUFFIXES)) return url.toString();
  if (devOrigin && LOOPBACK_HOSTS.has(url.hostname)) return url.toString();
  return null;
}

/** Returns the URL when it points at a Webflow Marketplace destination. */
export function safeMarketplaceUrl(value: string | null | undefined): string | null {
  const url = parseHttpsUrl(value);
  if (!url || !hostMatches(url.hostname, MARKETPLACE_HOST_SUFFIXES)) return null;
  return url.toString();
}

/** Returns an HTTPS image URL without constraining its CDN host. */
export function safeImageUrl(value: string | null | undefined): string | null {
  const url = parseHttpsUrl(value);
  return url ? url.toString() : null;
}
