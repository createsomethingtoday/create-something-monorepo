import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { processSubscription } from '../../canon/src/lib/newsletter/subscribe';
import { processUnsubscribe } from '../../canon/src/lib/newsletter/unsubscribe';

const readWorkspace = (path: string) =>
  readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');

const registry = readWorkspace('config/performance-pages/registry.ts');
const layout = readWorkspace('packages/io/src/routes/+layout.svelte');
const layoutSeo = readWorkspace('packages/canon/src/lib/components/LayoutSEO.svelte');
const subscribePage = readWorkspace('packages/io/src/routes/subscribe/+page.svelte');
const newsletterSignup = readWorkspace('packages/canon/src/lib/newsletter/NewsletterSignup.svelte');
const confirmServer = readWorkspace('packages/io/src/routes/confirm/+page.server.ts');
const confirmPage = readWorkspace('packages/io/src/routes/confirm/+page.svelte');
const unsubscribePage = readWorkspace('packages/io/src/routes/unsubscribe/+page.svelte');
const sharedUnsubscribePage = readWorkspace(
  'packages/canon/src/lib/newsletter/UnsubscribePage.svelte'
);

test('the complete IO subscription lifecycle has one migrated commercial contract', () => {
  const cohort = registry.slice(
    registry.indexOf("'io-subscription'"),
    registry.indexOf("'io-account'")
  );

  assert.match(cohort, /\['confirm', 'subscribe', 'unsubscribe'\]/);
  assert.match(cohort, /'migrated'/);
  assert.match(cohort, /'commercial'/);
});

test('subscribe states the actual research-note commitment before asking for an email', () => {
  assert.doesNotMatch(
    subscribePage,
    /LAUNCHING JANUARY 2025|January 2025|Build Autonomous Software|Pricing \(Preview\)|\$40|founding member pricing|Autonomous Agents|Recorded Workshops/i
  );
  assert.match(subscribePage, /research (?:note|email)|notes? on research/i);
  assert.match(subscribePage, /confirmation link/i);
  assert.match(subscribePage, /not (?:added|subscribed)[^.]*until (?:you )?confirm/i);
  assert.match(subscribePage, /NewsletterSignup/);
});

test('the one route-owned signup form preserves production verification and disabled-JavaScript recovery', () => {
  assert.match(newsletterSignup, /turnstileSiteKey\?: string/);
  assert.match(newsletterSignup, /turnstileToken/);
  assert.match(newsletterSignup, /cf-turnstile-response|challenges\.cloudflare\.com\/turnstile/);
  assert.match(newsletterSignup, /<noscript>/);
  assert.match(newsletterSignup, /class="js-only-signup" hidden=\{!clientReady\}/);
  assert.match(newsletterSignup, /\.js-only-signup\[hidden\]\s*\{\s*display: none/);
  assert.match(subscribePage, /turnstileSiteKey=\{data\.turnstileSiteKey\}/);
  assert.match(subscribePage, /<NewsletterSignup/);
});

test('confirmation renders missing, invalid, repeated, unavailable, and failed states with a new-link recovery', () => {
  assert.doesNotMatch(confirmServer, /throw error\(/);
  assert.match(confirmServer, /generateWelcomeEmailHtml/);
  assert.match(confirmServer, /missing-token/);
  assert.match(confirmServer, /unsubscribed/);
  assert.match(confirmServer, /service-unavailable/);
  assert.match(confirmServer, /confirmation-failed/);
  assert.match(confirmPage, /href="\/subscribe"/);
  assert.match(confirmPage, /Request (?:a )?(?:new|another) confirmation/i);
});

test('unsubscribe updates only the record whose stored token matches the supplied token', async () => {
  const email = 'reader@example.com';
  const token = btoa(`${email}:1784520000000`);
  let query = '';
  let bindings: unknown[] = [];

  const db = {
    prepare(statement: string) {
      query = statement;
      return {
        bind(...values: unknown[]) {
          bindings = values;
          return this;
        },
        async run() {
          return { success: true };
        }
      };
    }
  };

  const result = await processUnsubscribe(token, db);

  assert.equal(result.success, true);
  assert.match(query, /unsubscribe_token\s*=\s*\?/i);
  assert.match(query, /active\s*=\s*0/i);
  assert.deepEqual(bindings, [email, token]);
});

test('the shared subscription server preserves validation, repeat, bounce, delivery, and provider-failure states', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  type ExistingSubscriber = {
    email: string;
    confirmed_at: string | null;
    unsubscribed_at: string | null;
    status: string | null;
  };

  function createEnvironment(existing: ExistingSubscriber | null = null) {
    const writes: Array<{ query: string; bindings: unknown[] }> = [];
    const db = {
      prepare(query: string) {
        const statement = {
          bindings: [] as unknown[],
          bind(...values: unknown[]) {
            statement.bindings = values;
            return statement;
          },
          async first() {
            return /SELECT email, confirmed_at, unsubscribed_at, status/.test(query)
              ? existing
              : null;
          },
          async run() {
            writes.push({ query, bindings: statement.bindings });
            return { success: true };
          },
          async all() {
            return { success: true, results: [] };
          }
        };
        return statement;
      },
      async batch(statements: unknown[]) {
        return statements.map(() => ({ success: true }));
      }
    };

    return {
      env: { DB: db, RESEND_API_KEY: 'test-key' },
      writes
    };
  }

  const missing = await processSubscription(
    { email: '' },
    createEnvironment().env,
    '127.0.0.1',
    'io'
  );
  assert.equal(missing.status, 400);
  assert.equal(missing.result.message, 'Email is required');

  const repeatedEnvironment = createEnvironment({
    email: 'reader@example.com',
    confirmed_at: '2026-07-20T12:00:00.000Z',
    unsubscribed_at: null,
    status: 'active'
  });
  const repeated = await processSubscription(
    { email: 'reader@example.com' },
    repeatedEnvironment.env,
    '127.0.0.1',
    'io'
  );
  assert.equal(repeated.status, 200);
  assert.equal(repeated.result.message, 'You are already subscribed!');
  assert.equal(repeatedEnvironment.writes.length, 0);

  const reactivatedEnvironment = createEnvironment({
    email: 'returning@example.com',
    confirmed_at: '2026-06-20T12:00:00.000Z',
    unsubscribed_at: '2026-07-01T12:00:00.000Z',
    status: 'unsubscribed'
  });
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ id: 'email-reactivated' }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    })) as typeof fetch;
  const reactivated = await processSubscription(
    { email: 'returning@example.com' },
    reactivatedEnvironment.env,
    '127.0.0.1',
    'io'
  );
  assert.equal(reactivated.status, 200);
  assert.ok(
    reactivatedEnvironment.writes.some(
      ({ query }) => /UPDATE newsletter_subscribers/.test(query) && /active\s*=\s*1/i.test(query)
    )
  );

  const bounced = await processSubscription(
    { email: 'bounced@example.com' },
    createEnvironment({
      email: 'bounced@example.com',
      confirmed_at: null,
      unsubscribed_at: null,
      status: 'bounced'
    }).env,
    '127.0.0.1',
    'io'
  );
  assert.equal(bounced.status, 400);
  assert.equal(bounced.result.success, false);

  const requests: Array<{ url: string; body: string }> = [];
  globalThis.fetch = (async (input, init) => {
    requests.push({ url: String(input), body: String(init?.body ?? '') });
    return new Response(JSON.stringify({ id: 'email-1' }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }) as typeof fetch;
  const newEnvironment = createEnvironment();
  const delivered = await processSubscription(
    { email: 'new@example.com', source: 'io-subscribe' },
    newEnvironment.env,
    '127.0.0.1',
    'io'
  );
  assert.equal(delivered.status, 200);
  assert.equal(delivered.result.emailId, 'email-1');
  assert.ok(
    newEnvironment.writes.some(({ query }) => /INSERT INTO newsletter_subscribers/.test(query))
  );
  assert.equal(requests[0]?.url, 'https://api.resend.com/emails');
  assert.match(requests[0]?.body ?? '', /Confirm the note/);

  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ message: 'provider unavailable' }), {
      status: 503,
      headers: { 'content-type': 'application/json' }
    })) as typeof fetch;
  const failedDeliveryEnvironment = createEnvironment();
  const originalConsoleError = console.error;
  console.error = () => {};
  const failedDelivery = await processSubscription(
    { email: 'retry@example.com' },
    failedDeliveryEnvironment.env,
    '127.0.0.1',
    'io'
  ).finally(() => {
    console.error = originalConsoleError;
  });
  assert.equal(failedDelivery.status, 500);
  assert.equal(failedDelivery.result.message, 'Failed to send confirmation email');
  assert.ok(
    failedDeliveryEnvironment.writes.some(({ query }) =>
      /INSERT INTO newsletter_subscribers/.test(query)
    )
  );
});

test('token routes remove the competing footer signup and emit only noindex intent', () => {
  assert.match(layout, /subscriptionLifecycleRoute/);
  assert.match(layout, /showNewsletter=\{!subscriptionLifecycleRoute\}/);
  assert.match(layout, /subscriptionTokenRoute/);
  assert.match(layout, /<LayoutSEO property="io" noindex=\{subscriptionTokenRoute\}/);
  assert.match(layoutSeo, /noindex\?: boolean/);
  assert.match(layoutSeo, /noindex \? 'noindex' : 'index'/);
  assert.doesNotMatch(sharedUnsubscribePage, /import SEO|<SEO/);
  assert.match(confirmPage, /noindex=\{true\}/);
  assert.match(unsubscribePage, /noindex=\{true\}/);
});
