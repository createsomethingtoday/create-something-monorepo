import { isTrustedRequestOrigin } from '@create-something/webflow-dashboard-core/security';
import { NextResponse, type NextRequest } from 'next/server';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0'
} as const;

function applyFrameHeaders(response: NextResponse): NextResponse {
  response.headers.delete('x-frame-options');
  response.headers.set(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://webflow.com https://*.webflow.com https://*.webflow.io https://*.createsomething.io"
  );
  return response;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.includes('/api/');
  const isMutatingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);

  if (isMutatingMethod && isApiRoute) {
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
