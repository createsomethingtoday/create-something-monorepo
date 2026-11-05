import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createMetaMarketingClient } from '../src/lib/analytics/meta-marketing-client.ts';
import { sanitizeMetaPageUrl } from '../src/lib/analytics/meta-policy.ts';

const accepted = { marketing: true, available: true, blocked: false };
const denied = { ...accepted, marketing: false };
const publicUrl = sanitizeMetaPageUrl;

test('does not infer marketing consent from analytics or emit before the consent read', async () => {
  const calls: { url: string; method: string; body?: string }[] = [];
  const client = createMetaMarketingClient({
    sanitizePageUrl: publicUrl,
    privacyBlocked: () => false,
    fetch: async (url, init) => {
      calls.push({ url: String(url), method: init?.method ?? 'GET', body: init?.body as string });
      return Response.json(denied);
    }
  });
  assert.equal(client.state.marketing, false);
  await client.trackPage(new URL('https://createsomething.agency/'));
  assert.deepEqual(calls.map(({ url }) => url), ['/api/marketing/consent']);
});

test('only emits sanitized public page activity after explicit server consent, once per navigation', async () => {
  const pages: Record<string, string>[] = [];
  const client = createMetaMarketingClient({
    sanitizePageUrl: publicUrl,
    privacyBlocked: () => false,
    eventId: () => 'page-event-123',
    fetch: async (url, init) => {
      if (url === '/api/marketing/page-view') pages.push(JSON.parse(init?.body as string));
      return Response.json(accepted);
    }
  });
  await client.trackPage(new URL('https://createsomething.agency/contact?utm_source=facebook&utm_medium=paid_social&fbclid=private'));
  await client.trackPage(new URL('https://createsomething.agency/contact?fbclid=private'));
  await client.trackPage(new URL('https://createsomething.agency/?email=private@example.com'));
  await client.trackPage(new URL('https://createsomething.agency/map/share/private'));
  assert.deepEqual(pages, [{ url: 'https://createsomething.agency/contact', eventId: 'page-event-123' }]);
  assert.doesNotMatch(JSON.stringify(pages), /private|fbclid|email/);
});

test('privacy signals revoke server consent and prevent all page activity', async () => {
  const requests: { url: string; body?: string }[] = [];
  const client = createMetaMarketingClient({
    sanitizePageUrl: publicUrl,
    privacyBlocked: () => true,
    fetch: async (url, init) => {
      requests.push({ url: String(url), body: init?.body as string });
      return Response.json({ ...denied, blocked: true });
    }
  });
  await client.setConsent(true);
  await client.trackPage(new URL('https://createsomething.agency/'));
  assert.ok(requests.every(({ url, body }) => url === '/api/marketing/consent' && body === '{"marketing":false}'));
  assert.equal(client.state.marketing, false);
  assert.equal(client.state.blocked, true);
});

test('withdrawal wins over a stale consent read', async () => {
  let resolveRead!: (value: Response) => void;
  let markStarted!: () => void;
  const readStarted = new Promise<void>((resolve) => { markStarted = resolve; });
  const client = createMetaMarketingClient({
    sanitizePageUrl: publicUrl,
    privacyBlocked: () => false,
    fetch: async (_url, init) => init?.method === 'POST'
      ? Response.json(denied)
      : new Promise<Response>((resolve) => { resolveRead = resolve; markStarted(); })
  });
  const pendingRead = client.refresh();
  await readStarted;
  await client.setConsent(false);
  resolveRead(Response.json(accepted));
  await pendingRead;
  assert.equal(client.state.marketing, false);
});

test('failed or malformed consent responses fail closed without breaking analytics choices', async () => {
  for (const response of [Response.json({ marketing: true }), new Response(null, { status: 503 })]) {
    const client = createMetaMarketingClient({
      sanitizePageUrl: publicUrl,
      privacyBlocked: () => false,
      fetch: async () => response
    });
    await assert.rejects(client.refresh(), /privacy choice/);
    assert.equal(client.state.marketing, false);
    assert.equal(client.state.available, false);
  }
});

test('a refresh cannot restore consent while withdrawal is pending', async () => {
  let resolveWithdrawal!: (value: Response) => void;
  const pages: string[] = [];
  const client = createMetaMarketingClient({
    sanitizePageUrl: publicUrl,
    privacyBlocked: () => false,
    fetch: async (url, init) => {
      if (url === '/api/marketing/page-view') pages.push(String(url));
      if (init?.method === 'POST' && url === '/api/marketing/consent') {
        return new Promise<Response>((resolve) => { resolveWithdrawal = resolve; });
      }
      return Response.json(accepted);
    }
  });
  await client.refresh();
  const withdrawal = client.setConsent(false);
  await Promise.resolve();
  await Promise.resolve();
  const navigation = client.trackPage(new URL('https://createsomething.agency/'));
  await Promise.resolve();
  assert.equal(client.state.marketing, false);
  resolveWithdrawal(Response.json(denied));
  await withdrawal;
  await navigation;
  assert.deepEqual(pages, []);
});

// Exercise the actual layout-to-client privacy boundary, including unavailable Identity data.
test('layout only turns a verified account opt-out into a durable browser withdrawal', async () => {
  const layout = readFileSync(new URL('../src/routes/+layout.svelte', import.meta.url), 'utf8');
  const component = readFileSync(new URL('../src/lib/components/PrivacyAnalytics.svelte', import.meta.url), 'utf8');
  const callback = component.match(/privacyBlocked: \(\) => ([^\n]+)/)?.[1];
  assert.ok(callback);
  const blocked = new Function('userOptedOut', 'metaAccountOptedOut', 'browserBlocksMetaMarketing', `return ${callback};`);
  const binding = layout.match(/metaAccountOptedOut=\{([^}]+)\}/)?.[1];
  for (const verified of [false, true]) {
    const data = { user: { analytics_opt_out: true, analytics_preference_verified: verified } };
    const metaOptOut = binding ? new Function('data', `return ${binding};`)(data) : undefined;
    const methods: string[] = [];
    const client = createMetaMarketingClient({
      sanitizePageUrl: publicUrl,
      privacyBlocked: () => blocked(true, metaOptOut, () => false),
      fetch: async (_url, init) => {
        methods.push(init?.method ?? 'GET');
        return Response.json({ ...denied, blocked: true });
      }
    });
    await client.trackPage(new URL('https://createsomething.agency/'));
    assert.deepEqual(methods, verified ? ['POST'] : ['GET'], `preference verified: ${verified}`);
    assert.equal(client.state.marketing, false);
  }
});
