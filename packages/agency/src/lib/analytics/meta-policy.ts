/** Explicit public marketing routes. Private/client routes require a separate review. */
const META_PUBLIC_PATHS = new Set([
  '/', '/services', '/contact', '/book', '/about', '/methodology', '/workflows',
  '/case-studies', '/case-studies/webflow-marketplace', '/dispatch',
  '/agent-readiness', '/agent-foundation', '/workflow-compiler-integration',
  '/technical-review', '/for-service-providers', '/airtable-workflow-consulting',
  '/dfw-tech-support', '/control', '/notion', '/dify', '/security'
]);
const CAMPAIGN_KEYS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id', 'fbclid'
]);

export function isMetaPublicPath(pathname: string): boolean {
  return META_PUBLIC_PATHS.has(pathname);
}

/** Drops campaign/click tags; rejects links carrying access or unknown query parameters. */
export function sanitizeMetaPageUrl(url: URL): string | undefined {
  const production = url.origin === 'https://createsomething.agency';
  const localPreview = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  if ((!production && !localPreview) || url.username || url.password || !isMetaPublicPath(url.pathname)) return undefined;
  for (const key of url.searchParams.keys()) if (!CAMPAIGN_KEYS.has(key)) return undefined;
  return `https://createsomething.agency${url.pathname}`;
}
