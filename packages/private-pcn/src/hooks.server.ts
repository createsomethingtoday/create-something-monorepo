import { applyImpersonation } from '$lib/server/impersonation';
import { paidAccess } from '$lib/server/billing';
import type { Handle } from '@sveltejs/kit';
import { verifyIdentityToken } from '@create-something/canon/auth/server';
import { normalizeEmail } from '$lib/server/policy';
import { networkRole, networkSlug, type Network } from '$lib/server/networks';

export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.hostname === 'private.createsomething.io') {
    const destination = new URL('https://private.createsomething.agency');
    destination.pathname = event.url.pathname;
    destination.search = event.url.search;
    return new Response(null, { status: 308, headers: { Location: destination.href } });
  }
  if (
    event.url.pathname.startsWith('/api/') &&
    !['/api/billing/webhook', '/api/commerce/webhook'].includes(event.url.pathname)
  ) {
    const limiter = event.platform?.env.PCN_RATE_LIMIT;
    if (!limiter && event.platform?.env.ENVIRONMENT === 'production') {
      return new Response('Service configuration unavailable.', { status: 503 });
    }
    if (limiter) {
      const client = event.request.headers.get('CF-Connecting-IP') || 'unknown';
      const { success } = await limiter.limit({ key: `private-pcn:${client}` });
      if (!success)
        return new Response(JSON.stringify({ error: 'Please wait a minute and try again.' }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
            'Cache-Control': 'no-store'
          }
        });
    }
  }
  event.locals.impersonation = null;
  event.locals.identity = null;
  event.locals.network = null;
  const slug = networkSlug(event.url.pathname);
  if (event.platform?.env.DB) {
    event.locals.network = await event.platform.env.DB.prepare(
      'SELECT * FROM networks WHERE slug = ?'
    )
      .bind(slug || 'create-something')
      .first<Network>();
    if (slug && !event.locals.network) return new Response('Network not found.', { status: 404 });
    if (
      event.locals.network &&
      event.locals.network.id !== 'default' &&
      event.locals.network.status === 'active'
    ) {
      try {
        if (!(await paidAccess(event.platform.env, event.locals.network)))
          event.locals.network.status = 'suspended';
      } catch {
        event.locals.network.status = 'suspended';
      }
    }
  }
  const token = event.cookies.get('__Host-pcn_access');
  if (token && event.platform?.env.DB) {
    const identity = await verifyIdentityToken(token, {
      issuer: 'https://id.createsomething.space',
      jwksUrl: 'https://id.createsomething.space/.well-known/jwks.json',
      audience: 'agency',
      fetch: event.fetch
    });
    const email = normalizeEmail(identity?.email);
    if (identity && email) {
      // Re-read Identity active state; no offline grace for private content.
      try {
        const active = await event.fetch('https://id.createsomething.space/v1/users/me', {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(8000)
        });
        if (active.ok) {
          const current = (await active.json()) as {
            id?: string;
            email?: string;
            email_verified?: boolean;
          };
          if (
            current.id !== identity.subject ||
            normalizeEmail(current.email) !== email ||
            current.email_verified !== true
          )
            throw new Error('Identity state changed');
          const admins = String(event.platform.env.PCN_ADMIN_EMAILS || '')
            .split(',')
            .map((v) => v.trim().toLowerCase());
          const role = event.locals.network
            ? await networkRole(
                event.platform.env.DB,
                event.locals.network,
                { subject: identity.subject, email },
                admins.includes(email)
              )
            : 'blocked';
          event.locals.identity = { subject: identity.subject, email, role: role || 'blocked' };
        }
      } catch {
        /* Fail closed when authoritative identity is unavailable. */
      }
    }
  }
  const support = await applyImpersonation(event);
  const response = support.response || (await resolve(event));
  if (support.auditId && event.platform?.env.DB) {
    await event.platform.env.DB.prepare('UPDATE impersonation_requests SET status=? WHERE id=?')
      .bind(response.status, support.auditId)
      .run();
  }
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (event.url.pathname.startsWith('/api/') || event.locals.identity)
    response.headers.set('Cache-Control', 'private, no-store');
  return response;
};
