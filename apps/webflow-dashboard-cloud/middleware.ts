import { isTrustedRequestOrigin } from '@create-something/webflow-dashboard-core';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PAGE_PREFIXES = ['/dashboard', '/assets', '/marketplace'] as const;
const PROTECTED_API_PREFIXES = ['/api/profile', '/api/keys', '/api/assets', '/api/analytics'] as const;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0'
} as const;

function normalizeBasePath(value: string | undefined): string {
  if (!value || value === '/') return '';
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function withBasePath(pathname: string): string {
  const basePath = normalizeBasePath(
    process.env.BASE_URL || process.env.ASSETS_PREFIX || process.env.NEXT_PUBLIC_BASE_PATH
  );
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${basePath}${normalizedPath}`;
}

function applyFrameHeaders(response: NextResponse): NextResponse {
  response.headers.delete('x-frame-options');
  response.headers.set(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://webflow.com https://*.webflow.com https://*.webflow.io https://*.createsomething.io"
  );
  return response;
}

function isProtectedPath(pathname: string): boolean {
  return [...PROTECTED_PAGE_PREFIXES, ...PROTECTED_API_PREFIXES].some((prefix) =>
    pathname.startsWith(withBasePath(prefix))
  );
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSessionCookie = Boolean(request.cookies.get('session_token')?.value);
  const isApiRoute = pathname.includes('/api/');
  const isCronRoute = pathname.includes('/api/cron/');
  const isMutatingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);

  if (isProtectedPath(pathname) && !hasSessionCookie) {
    if (isApiRoute) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      for (const [key, value] of Object.entries(NO_STORE_HEADERS)) {
        response.headers.set(key, value);
      }
      return applyFrameHeaders(response);
    }

    const url = request.nextUrl.clone();
    url.pathname = withBasePath('/login');
    url.search = '';
    return applyFrameHeaders(NextResponse.redirect(url));
  }

  if (isMutatingMethod && isApiRoute && !isCronRoute && hasSessionCookie) {
    const trusted = isTrustedRequestOrigin(
      request,
      request.nextUrl.origin,
      process.env.CSRF_TRUSTED_ORIGINS,
      process.env.ENVIRONMENT
    );

    if (!trusted) {
      const response = NextResponse.json(
        { error: 'Forbidden', message: 'Invalid request origin' },
        { status: 403 }
      );
      for (const [key, value] of Object.entries(NO_STORE_HEADERS)) {
        response.headers.set(key, value);
      }
      return applyFrameHeaders(response);
    }
  }

  return applyFrameHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
