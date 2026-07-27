import type { Handle } from '@sveltejs/kit';

import {
  LOOPBACK_CAPABILITY_COOKIE,
  applyLoopbackBootstrapSecurityHeaders,
  applyLoopbackSecurityHeaders,
  decideLoopbackRequest,
  loopbackBootstrapDocument,
  loopbackCapabilityCookie
} from '$lib/server/loopback-capability.js';

function logRejectedMutation(method: string, origin: string | null, stage: 'capability' | 'csrf') {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return;
  const safeOrigin =
    origin && /^[a-z]+:\/\/[a-z0-9.:-]+$/i.test(origin) ? origin : origin ? 'opaque' : 'none';
  console.warn(`[client-workspace] ${stage} rejected ${method} from ${safeOrigin}`);
}

export const handle: Handle = async ({ event, resolve }) => {
  if (process.env.CLIENT_WORKSPACE_DESKTOP !== '1') return await resolve(event);
  const configuredToken = process.env.CLIENT_WORKSPACE_CAPABILITY_TOKEN ?? '';
  const expectedOrigin = process.env.CLIENT_WORKSPACE_LOOPBACK_ORIGIN ?? '';
  const decision = decideLoopbackRequest({
    configuredToken,
    expectedOrigin,
    requestMethod: event.request.method,
    requestUrl: event.url,
    requestOrigin: event.request.headers.get('origin') ?? undefined,
    cookieToken: event.cookies.get(LOOPBACK_CAPABILITY_COOKIE),
    presentedToken: event.url.searchParams.get('cap') ?? undefined
  });
  if (decision === 'deny') {
    logRejectedMutation(event.request.method, event.request.headers.get('origin'), 'capability');
    const response = new Response('Local app capability required.', {
      status: 403,
      headers: { 'cache-control': 'no-store' }
    });
    applyLoopbackSecurityHeaders(response.headers);
    return response;
  }
  if (decision === 'bootstrap') {
    const response = new Response(loopbackBootstrapDocument(), {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
    });
    response.headers.append('set-cookie', loopbackCapabilityCookie(configuredToken));
    applyLoopbackBootstrapSecurityHeaders(response.headers);
    return response;
  }
  const response = await resolve(event);
  if (response.status === 403) {
    logRejectedMutation(event.request.method, event.request.headers.get('origin'), 'csrf');
  }
  const isPreview = /^\/api\/workspaces\/[^/]+\/preview(?:\/|$)/.test(event.url.pathname);
  applyLoopbackSecurityHeaders(response.headers, expectedOrigin, isPreview);
  return response;
};
