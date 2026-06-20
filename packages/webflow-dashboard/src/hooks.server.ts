import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import type { Handle } from '@sveltejs/kit';
import { getSession } from '$lib/server/kv';
import { isTrustedRequestOrigin } from '$lib/server/security';

// No-cache headers for API responses to prevent browser caching issues
const noCacheHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0'
};

/**
 * Server hooks for session management.
 *
 * Validates session token from cookie and populates locals.user
 * for protected routes.
 */
export const handle: Handle = async ({ event, resolve }) => {
  const sessionToken = event.cookies.get('session_token');

  if (sessionToken && event.platform?.env.SESSIONS) {
    try {
      const sessionData = await getSession(event.platform.env.SESSIONS, sessionToken);
      if (sessionData) {
        event.locals.user = { email: sessionData.email };
      }
    } catch (error) {
      console.error('Session validation error in hooks:', error);
    }
  }

  if (!event.locals.user && dev && env.PLAYWRIGHT_AUTH_EMAIL) {
    event.locals.user = { email: env.PLAYWRIGHT_AUTH_EMAIL };
  }

  // CSRF/origin protection for cookie-authenticated API mutations.
  // SameSite=None is required for Webflow iframe embedding, so we enforce
  // trusted request origins server-side before state-changing API calls.
  const isMutatingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.request.method);
  const isApiRoute = event.url.pathname.startsWith('/api/');
  const isCronRoute = event.url.pathname.startsWith('/api/cron/');
  const hasSessionCookie = Boolean(sessionToken);

  if (isMutatingMethod && isApiRoute && !isCronRoute && hasSessionCookie) {
    const isTrusted = isTrustedRequestOrigin(
      event.request,
      event.url.origin,
      event.platform?.env.CSRF_TRUSTED_ORIGINS,
      event.platform?.env.ENVIRONMENT
    );

    if (!isTrusted) {
      return new Response(
        JSON.stringify({ error: 'Forbidden', message: 'Invalid request origin' }),
        {
          status: 403,
          headers: noCacheHeaders
        }
      );
    }
  }

  // Protected routes check
  const protectedPaths = [
    '/dashboard',
    '/assets',
    '/profile',
    '/api/profile',
    '/api/keys',
    '/api/assets',
    '/api/analytics',
    '/api/feedback'
  ];
  const isProtectedRoute = protectedPaths.some((path) => event.url.pathname.startsWith(path));

  if (isProtectedRoute && !event.locals.user) {
    // Redirect to login for protected pages
    if (!event.url.pathname.startsWith('/api/')) {
      return new Response(null, {
        status: 302,
        headers: { Location: '/login' }
      });
    }
    // Return 401 for API routes with no-cache headers
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: noCacheHeaders
    });
  }

  const response = await resolve(event, {
    filterSerializedResponseHeaders(name) {
      // Allow all headers except X-Frame-Options
      return name.toLowerCase() !== 'x-frame-options';
    }
  });

  // Create new response with modified headers for iframe embedding
  const newHeaders = new Headers(response.headers);
  newHeaders.delete('x-frame-options');
  newHeaders.delete('X-Frame-Options');
  // Set our own frame-ancestors CSP to allow embedding
  newHeaders.set(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://webflow.com https://*.webflow.com https://*.webflow.io https://*.createsomething.io"
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
};
