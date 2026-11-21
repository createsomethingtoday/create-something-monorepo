import { processSubscription } from '../../canon/src/lib/newsletter/subscribe';
import { processUnsubscribe } from '../../canon/src/lib/newsletter/unsubscribe';
import { recordServerConversion, upsertWarmLead } from '../../canon/src/lib/analytics/conversions';
import { confirmNewsletterSubscription } from '../src/lib/server/newsletter-confirm';

interface Environment {
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
    if (!env.STAGING_RECIPIENT || !env.RESEND_API_KEY || !env.TURNSTILE_SECRET_KEY || !env.DB || !env.CACHE) return unavailable();
    const origin = URL.canParse(env.NEWSLETTER_LINK_ORIGIN) ? new URL(env.NEWSLETTER_LINK_ORIGIN) : null;
    if (!origin || origin.protocol !== 'https:' || origin.origin !== env.NEWSLETTER_LINK_ORIGIN ||
        ['createsomething.io', 'www.createsomething.io'].includes(origin.hostname)) return unavailable();
    if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ success: false }, 415);
    const input = await request.json().catch(() => null);
    if (!input || typeof input !== 'object' || Array.isArray(input)) return reply({ success: false }, 400);
    const body = input as Record<string, unknown>;
    try {
      if (path === '/api/newsletter') {
        if (typeof body.email !== 'string' || body.email.trim().toLowerCase() !== env.STAGING_RECIPIENT.trim().toLowerCase()) {
          return reply({ success: false, message: 'This signup is restricted to the staging recipient.' }, 403);
        }
        const clientIp = request.headers.get('x-newsletter-client-ip');
        if (!clientIp) return reply({ success: false, message: 'Missing client address.' }, 400);
        const { result, status } = await processSubscription({
          email: body.email, website: typeof body.website === 'string' ? body.website : undefined,
          turnstileToken: typeof body.turnstileToken === 'string' ? body.turnstileToken : undefined,
          source: 'io-subscribe'
        }, env, clientIp, 'io', { doNotTrack: true, userOptedOut: true });
        return reply(result, status);
      }
      if (typeof body.token !== 'string' || !body.token || body.token.length > 2048) {
        return reply({ success: false, message: 'Invalid token.', error: 'Invalid token.', email: null }, 400);
      }
      if (path === '/api/newsletter/unsubscribe') return reply(await processUnsubscribe(body.token, env.DB));
      return reply(await confirmNewsletterSubscription(body.token, request, env, async () => true, {
        recordServerConversion, upsertWarmLead
      }));
    } catch {
      // Provider responses and bearer links may contain personal data.
      return unavailable();
    }
  }
};
