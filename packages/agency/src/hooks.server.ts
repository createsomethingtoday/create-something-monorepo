import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { createAuthHooks } from '@create-something/canon/auth';
import { abundanceApiAuthHandle } from './lib/server/abundance-api-auth';
import { deprecatedRedirects } from './lib/data/deprecatedRoutes';
import { verifyAgencyIdentitySession } from './lib/server/agency-identity-session';
import { AGENCY_PROTECTED_PATHS, isAgencyProtectedPath } from './lib/server/protected-routes';
import {
  createPublicHtmlCacheKey,
  cacheSearchForRequest,
  isCacheablePublicHtmlResponse,
  shouldAttemptPublicHtmlCache,
  withPublicHtmlCacheHeaders
} from './lib/server/public-html-cache';

const redirectHandle: Handle = async ({ event, resolve }) => {
  const path = event.url.pathname;

  // Check exact matches first
  if (deprecatedRedirects[path]) {
    throw redirect(301, deprecatedRedirects[path]);
  }

  // Check prefix matches for nested routes
  for (const [prefix, target] of Object.entries(deprecatedRedirects)) {
    if (path.startsWith(prefix + '/')) {
      throw redirect(301, target);
    }
  }

  return resolve(event);
};

const authHandle = createAuthHooks({
  protectedPaths: [...AGENCY_PROTECTED_PATHS],
  loginPath: '/login',
  includeRedirect: true,
  authProvider: { type: 'identity-worker' }
}) as Handle;

const identityVerificationHandle: Handle = async ({ event, resolve }) => {
  const user = await verifyAgencyIdentitySession({
    cookies: event.cookies,
    platform: event.platform,
    fetch: event.fetch
  });
  event.locals.user = user ?? undefined;

  if (isAgencyProtectedPath(event.url.pathname) && !user) {
    const destination = `${event.url.pathname}${event.url.search}`;
    return new Response(null, {
      status: 302,
      headers: { Location: `/login?redirect=${encodeURIComponent(destination)}` }
    });
  }

  return resolve(event);
};

const publicHtmlCacheHandle: Handle = async ({ event, resolve }) => {
  const shouldAttemptCache = shouldAttemptPublicHtmlCache({
    method: event.request.method,
    pathname: event.url.pathname,
    search: cacheSearchForRequest(event.url, building),
    headers: event.request.headers
  });

  const edgeCache = event.platform?.caches?.default;
  if (!shouldAttemptCache || !edgeCache) {
    return resolve(event);
  }

  const cacheKey = createPublicHtmlCacheKey(event.request);
  const cached = await edgeCache.match(cacheKey);
  if (cached) {
    return withPublicHtmlCacheHeaders(cached, 'HIT');
  }

  const response = await resolve(event);
  if (!isCacheablePublicHtmlResponse(response)) {
    return response;
  }

  const cacheableResponse = withPublicHtmlCacheHeaders(response, 'MISS');
  event.platform?.context?.waitUntil(
    edgeCache.put(cacheKey, cacheableResponse.clone()).catch((error: unknown) => {
      console.error('Failed to write public HTML response to edge cache:', error);
    })
  );

  return cacheableResponse;
};

export const handle = sequence(
  redirectHandle,
  authHandle,
  identityVerificationHandle,
  abundanceApiAuthHandle,
  publicHtmlCacheHandle
);
