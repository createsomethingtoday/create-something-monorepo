import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/index';
import { verifyWebflowSignature } from '../src/webflow';
import { installFetchMock, makeEnv, makeItem } from './support/mocks';

afterEach(() => {
  vi.restoreAllMocks();
});

async function sign(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function webhookRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('https://sync.test/webhooks/webflow', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

const ctx = { waitUntil: () => {}, passThroughException: () => {} } as unknown as ExecutionContext;

describe('signature verification', () => {
  it('accepts a valid HMAC and rejects a tampered body', async () => {
    const body = JSON.stringify({ triggerType: 'collection_item_created', payload: { id: 'x' } });
    const signature = await sign('secret-1', body);
    expect(await verifyWebflowSignature('secret-1', body, signature)).toBe(true);
    expect(await verifyWebflowSignature('secret-1', `${body} `, signature)).toBe(false);
    expect(await verifyWebflowSignature('wrong-secret', body, signature)).toBe(false);
  });

  it('rejects unsigned requests when a secret is configured', async () => {
    const env = makeEnv({ WEBFLOW_WEBHOOK_SECRET: 'secret-1' });
    installFetchMock();
    const response = await worker.fetch(
      webhookRequest({ triggerType: 'collection_item_created', payload: { id: 'item1' } }),
      env,
      ctx,
    );
    expect(response.status).toBe(401);
  });

  it('accepts any one of the comma-separated per-subscription secrets', async () => {
    const item = makeItem();
    const env = makeEnv({ WEBFLOW_WEBHOOK_SECRET: 'secret-a, secret-b' });
    installFetchMock({ webflowItems: { [item.id]: item } });
    const body = JSON.stringify({ triggerType: 'collection_item_created', payload: { id: item.id } });
    const response = await worker.fetch(
      new Request('https://sync.test/webhooks/webflow', {
        method: 'POST',
        body,
        headers: { 'x-webflow-signature': await sign('secret-b', body) },
      }),
      env,
      ctx,
    );
    expect(response.status).toBe(200);
  });
});

describe('webhook handling (zero-trust)', () => {
  it('re-fetches the item from the API instead of trusting the payload fieldData', async () => {
    const item = makeItem();
    const env = makeEnv();
    const state = installFetchMock({ webflowItems: { [item.id]: item } });
    const response = await worker.fetch(
      webhookRequest({
        triggerType: 'collection_item_created',
        // Spoofed payload data that must NOT reach Airtable:
        payload: { id: item.id, fieldData: { name: 'HACKED', 'unique-id': 'deadbeef' } },
      }),
      env,
      ctx,
    );
    expect(response.status).toBe(200);
    const fetchedItem = state.calls.some((c) => c.url.includes(`/items/${item.id}`));
    expect(fetchedItem).toBe(true);
    const body = (await response.json()) as { status: string };
    expect(body.status).toBe('shadow-create');
    // The shadow log captured the API's data, not the spoofed payload.
    const logged = env.__d1.executed.find((e) => e.sql.includes('sync_events'));
    expect(String(logged?.params[4])).toContain('Testflow');
    expect(String(logged?.params[4])).not.toContain('HACKED');
  });

  it('ignores events for other collections', async () => {
    const env = makeEnv();
    installFetchMock();
    const response = await worker.fetch(
      webhookRequest({ triggerType: 'collection_item_created', payload: { id: 'item1', cid: 'someOtherCollection123' } }),
      env,
      ctx,
    );
    const body = (await response.json()) as { status: string };
    expect(body.status).toBe('ignored');
  });

  it('ignores deleted items gracefully (404 from the API)', async () => {
    const env = makeEnv();
    installFetchMock();
    const response = await worker.fetch(
      webhookRequest({ triggerType: 'collection_item_changed', payload: { id: 'itemGone0000000000000001' } }),
      env,
      ctx,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string; reason: string };
    expect(body.reason).toBe('item not found');
  });

  it('returns 500 on Airtable failure so Webflow retries the delivery', async () => {
    const item = makeItem();
    const env = makeEnv({ WRITE_MODE: 'live' });
    installFetchMock({ webflowItems: { [item.id]: item } });
    // Make the Airtable find fail after install by re-mocking one URL class.
    const spy = vi.mocked(globalThis.fetch);
    const inner = spy.getMockImplementation()!;
    spy.mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('api.airtable.com')) return new Response('boom', { status: 500 });
      return inner(input as never, init as never);
    });
    const response = await worker.fetch(
      webhookRequest({ triggerType: 'collection_item_created', payload: { id: item.id } }),
      env,
      ctx,
    );
    expect(response.status).toBe(500);
  });
});

describe('admin endpoints', () => {
  it('requires the admin token', async () => {
    const env = makeEnv({ ADMIN_TOKEN: 'admin-secret' });
    const unauthorized = await worker.fetch(new Request('https://sync.test/api/report'), env, ctx);
    expect(unauthorized.status).toBe(401);
    const authorized = await worker.fetch(
      new Request('https://sync.test/api/report', { headers: { authorization: 'Bearer admin-secret' } }),
      env,
      ctx,
    );
    expect(authorized.status).toBe(200);
  });

  it('refuses admin routes entirely when no token is configured', async () => {
    const env = makeEnv({ ADMIN_TOKEN: undefined });
    const response = await worker.fetch(new Request('https://sync.test/api/report'), env, ctx);
    expect(response.status).toBe(503);
  });
});
