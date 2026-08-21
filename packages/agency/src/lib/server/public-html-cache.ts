const PUBLIC_HTML_CACHE_CONTROL = 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400';
const PUBLIC_HTML_CACHE_STATUS_HEADER = 'X-Agency-Edge-Cache';

const UNCACHED_PATH_PREFIXES = [
  '/account',
  '/admin',
  '/api',
  '/auth',
  '/dashboard',
  '/login',
  '/mcp-access',
  '/prospects',
  // Release-sensitive guides must not retain a pre-deploy static response.
  '/workflows'
];

export type PublicHtmlCacheStatus = 'BYPASS' | 'HIT' | 'MISS';

export interface PublicHtmlCacheDecisionInput {
  method: string;
  pathname: string;
  search: string;
  headers: Headers;
}

export function cacheSearchForRequest(url: Pick<URL, 'search'>, isBuilding: boolean): string {
  return isBuilding ? '' : url.search;
}

export function shouldAttemptPublicHtmlCache(input: PublicHtmlCacheDecisionInput): boolean {
  if (input.method !== 'GET') {
    return false;
  }

  if (input.search) {
    return false;
  }

  if (input.headers.has('authorization') || input.headers.has('cookie')) {
    return false;
  }

  return !UNCACHED_PATH_PREFIXES.some((prefix) => isPathAtOrBelow(input.pathname, prefix));
}

export function createPublicHtmlCacheKey(request: Request): Request {
  return new Request(request.url, { method: 'GET' });
}

export function withPublicHtmlCacheHeaders(
  response: Response,
  status: PublicHtmlCacheStatus
): Response {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', PUBLIC_HTML_CACHE_CONTROL);
  headers.set(PUBLIC_HTML_CACHE_STATUS_HEADER, status);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export function isCacheablePublicHtmlResponse(response: Response): boolean {
  if (response.status !== 200) {
    return false;
  }

  if (response.headers.has('set-cookie')) {
    return false;
  }

  const cacheControl = response.headers.get('cache-control')?.toLowerCase() ?? '';
  if (cacheControl.includes('no-store') || cacheControl.includes('private')) {
    return false;
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  return contentType.startsWith('text/html');
}

function isPathAtOrBelow(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
