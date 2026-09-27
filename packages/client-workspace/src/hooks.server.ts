import type { Handle } from '@sveltejs/kit';

import {
  LOOPBACK_CAPABILITY_COOKIE,
  applyLoopbackBootstrapSecurityHeaders,
  applyLoopbackSecurityHeaders,
  decideLoopbackRequest,
  loopbackBootstrapDocument,
  loopbackCapabilityCookie
} from './lib/server/loopback-capability.js';
import { verifyRemoteAccess } from './lib/server/remote-access.js';

function logRejectedMutation(method: string, origin: string | null, stage: 'capability' | 'csrf') {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return;
  const safeOrigin =
    origin && /^[a-z]+:\/\/[a-z0-9.:-]+$/i.test(origin) ? origin : origin ? 'opaque' : 'none';
  console.warn(`[client-workspace] ${stage} rejected ${method} from ${safeOrigin}`);
}

export function remoteMutationAllowed(method: string, origin: string | null, expectedOrigin: string): boolean {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) return true;
  return Boolean(expectedOrigin) && origin === expectedOrigin;
}

export const handle: Handle = async ({ event, resolve }) => {
  const remoteMode = process.env.CLIENT_WORKSPACE_REMOTE === '1';
  const desktopMode = process.env.CLIENT_WORKSPACE_DESKTOP === '1';
  const remoteOrigin = process.env.CLIENT_WORKSPACE_REMOTE_ORIGIN ?? '';
  const loopbackOrigin = process.env.CLIENT_WORKSPACE_LOOPBACK_ORIGIN ?? '';
  if (remoteMode && desktopMode) {
    const requestHost = event.request.headers.get('host');
    const expectedRemoteHost = remoteOrigin ? new URL(remoteOrigin).host : '';
    const expectedLoopbackHost = loopbackOrigin ? new URL(loopbackOrigin).host : '';
    const local = event.url.origin === loopbackOrigin && requestHost === expectedLoopbackHost;
    const remote = event.url.origin === remoteOrigin && requestHost === expectedRemoteHost;
    if (!local && !remote) {
      return new Response('Access required.', {
        status: 403,
        headers: { 'cache-control': 'no-store' }
      });
    }
    if (remote) {
      const allowedOrigin = remoteMutationAllowed(
        event.request.method,
        event.request.headers.get('origin'),
        remoteOrigin
      );
      const authorized = allowedOrigin && await verifyRemoteAccess(event.request, {
        teamDomain: process.env.CLIENT_WORKSPACE_ACCESS_TEAM_DOMAIN ?? '',
        audience: process.env.CLIENT_WORKSPACE_ACCESS_AUD ?? '',
        allowedEmail: process.env.CLIENT_WORKSPACE_ACCESS_EMAIL ?? ''
      });
      if (!authorized) {
        return new Response('Access required.', {
          status: 403,
          headers: { 'cache-control': 'no-store' }
        });
      }
      return await resolve(event);
    }
  } else if (remoteMode) {
    const allowedOrigin = remoteMutationAllowed(
      event.request.method,
      event.request.headers.get('origin'),
      remoteOrigin
    );
    const authorized = allowedOrigin && await verifyRemoteAccess(
      event.request,
      {
        teamDomain: process.env.CLIENT_WORKSPACE_ACCESS_TEAM_DOMAIN ?? '',
        audience: process.env.CLIENT_WORKSPACE_ACCESS_AUD ?? '',
        allowedEmail: process.env.CLIENT_WORKSPACE_ACCESS_EMAIL ?? ''
      }
    );
    if (!authorized) {
      return new Response('Access required.', {
        status: 403,
        headers: { 'cache-control': 'no-store' }
      });
    }
    return await resolve(event);
  }
  if (!desktopMode) return await resolve(event);
  const configuredToken = process.env.CLIENT_WORKSPACE_CAPABILITY_TOKEN ?? '';
  const expectedOrigin = loopbackOrigin;
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
