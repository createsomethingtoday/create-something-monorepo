import type { NewsletterRequest } from '../../canon/src/lib/newsletter/types';
import { processSubscription } from '../../canon/src/lib/newsletter/subscribe';
import { processUnsubscribe } from '../../canon/src/lib/newsletter/unsubscribe';
import { recordServerConversion, upsertWarmLead } from '../../canon/src/lib/analytics/conversions';
import { confirmNewsletterSubscription } from '../src/lib/server/newsletter-confirm';

interface Environment {
  NEWSLETTER_MODE?: 'production';
  DB: D1Database;
  CACHE: KVNamespace;
  NEWSLETTER_OWNER_TOKEN: string;
  NEWSLETTER_LINK_ORIGIN: string;
  STAGING_RECIPIENT: string;
  RESEND_API_KEY: string;
  TURNSTILE_SECRET_KEY: string;
}

function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function matchesCredential(actual: string, expected: string) {
  // Both digests are fixed-size, even when the supplied token has a different length.
  const digest = (value: string) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const [a, b] = await Promise.all([digest(actual), digest(expected)]);
  const left = new Uint8Array(a), right = new Uint8Array(b);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}

const unavailable = () => reply({ success: false, message: 'Service unavailable.' }, 503);

export default {
  async fetch(request: Request, env: Environment): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (!['/api/newsletter', '/api/newsletter/confirm', '/api/newsletter/unsubscribe'].includes(path)) {
      return reply({ success: false }, 404);
    }
    if (request.method !== 'POST') return reply({ success: false }, 405);
    if (!env.NEWSLETTER_OWNER_TOKEN) return unavailable();
    if (!await matchesCredential(request.headers.get('authorization') ?? '', 'Bearer ' + env.NEWSLETTER_OWNER_TOKEN)) {
      return reply({ success: false }, 401);
    }
    const production = env.NEWSLETTER_MODE === 'production';
    if ((!production && !env.STAGING_RECIPIENT) || !env.DB || !env.CACHE) return unavailable();
    const origin = URL.canParse(env.NEWSLETTER_LINK_ORIGIN) ? new URL(env.NEWSLETTER_LINK_ORIGIN) : null;
    if (!origin || origin.protocol !== 'https:' || origin.origin !== env.NEWSLETTER_LINK_ORIGIN ||
        (production ? origin.origin !== 'https://createsomething.io' :
          ['createsomething.io', 'www.createsomething.io'].includes(origin.hostname))) return unavailable();
    if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ success: false }, 415);
    const input = await request.json().catch(() => null);
    if (!input || typeof input !== 'object' || Array.isArray(input)) return reply({ success: false }, 400);
    const body = input as Record<string, unknown>;
    // These headers are meaningful only after authenticating the ingress above.
    // The apex router must overwrite them; never copy browser x-newsletter-* headers.
    const originalUrl = request.headers.get('x-newsletter-original-url');
    const original = originalUrl && URL.canParse(originalUrl) ? new URL(originalUrl) : null;
    const expectedPath = path === '/api/newsletter' ? path : path.endsWith('/confirm') ? '/confirm' : '/unsubscribe';
    if (production && (!original || original.username || original.password || original.hash ||
        original.origin !== 'https://createsomething.io' || original.pathname !== expectedPath)) return reply({ success: false }, 400);
    const clientIp = request.headers.get('x-newsletter-client-ip');
    if (production && path === '/api/newsletter' && !clientIp) return unavailable();
    const browserRequest = new Request(production ? original!.href : request.url, { headers: request.headers });
    try {
      if (path === '/api/newsletter') {
        if (!env.RESEND_API_KEY || !env.TURNSTILE_SECRET_KEY) return unavailable();
        if (!production && (typeof body.email !== 'string' || body.email.trim().toLowerCase() !== env.STAGING_RECIPIENT.trim().toLowerCase())) {
          return reply({ success: false, message: 'This signup is restricted to the staging recipient.' }, 403);
        }
        const subscription = production ? body as unknown as NewsletterRequest : {
          email: body.email as string, website: typeof body.website === 'string' ? body.website : undefined,
          turnstileToken: typeof body.turnstileToken === 'string' ? body.turnstileToken : undefined,
          source: 'io-subscribe'
        };
        if (typeof subscription.email !== 'string') return reply({ success: false, message: 'Email is required' }, 400);
        const { result, status } = await processSubscription(subscription, env,
          clientIp || { rateLimitBucket: 'staging-operator-inbox' }, 'io', production ? {
            doNotTrack: request.headers.get('dnt') === '1' || request.headers.get('sec-gpc') === '1',
            userOptedOut: request.headers.get('x-newsletter-user-opted-out') !== 'false',
            userAgent: request.headers.get('user-agent') ?? undefined, requestUrl: originalUrl!
          } : { doNotTrack: true, userOptedOut: true });
        return reply(result, status);
      }
      if (typeof body.token !== 'string' || !body.token || body.token.length > 2048) {
        return reply({ success: false, message: 'Invalid token.', error: 'Invalid token.', email: null }, 400);
      }
      if (path === '/api/newsletter/unsubscribe') return reply(await processUnsubscribe(body.token, env.DB));
      return reply(await confirmNewsletterSubscription(body.token, browserRequest, env, async () => !production || request.headers.get('x-newsletter-user-opted-out') !== 'false', {
        recordServerConversion, upsertWarmLead
      }));
    } catch {
      // Provider responses and bearer links may contain personal data.
      return unavailable();
    }
  }
};
