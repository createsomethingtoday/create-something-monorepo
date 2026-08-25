import { describe, expect, it, vi } from 'vitest';

import { AirtableClient } from './airtable.js';
import {
  createD1WebhookStateStore,
  processExceptionWebhookPayloads,
  registerExceptionWebhooks,
  verifyAirtableContentMac,
  type AirtableWebhookPayload,
  type ExceptionWebhookProcessorDeps,
  type WebhookLegState,
  type WebhookLegStateStore,
} from './exception-webhook.js';
import { FIELD_IDS, TABLE_IDS } from './schema.js';
import { SlackClient } from './slack.js';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function memoryStore(
  initial: WebhookLegState | null = null,
): WebhookLegStateStore & { state: WebhookLegState | null; lockHolder: string | null; pending: boolean } {
  const box: { state: WebhookLegState | null; lockHolder: string | null; pending: boolean } = {
    state: initial,
    lockHolder: null,
    pending: false,
  };
  return {
    get state() {
      return box.state;
    },
    get lockHolder() {
      return box.lockHolder;
    },
    set lockHolder(value: string | null) {
      box.lockHolder = value;
    },
    get pending() {
      return box.pending;
    },
    set pending(value: boolean) {
      box.pending = value;
    },
    async get() {
      return box.state ? (JSON.parse(JSON.stringify(box.state)) as WebhookLegState) : null;
    },
    async put(state) {
      box.state = state;
    },
    async delete() {
      box.state = null;
    },
    async acquireLock(token) {
      if (box.lockHolder !== null) return false;
      box.lockHolder = token;
      return true;
    },
    async releaseLock(token) {
      if (box.lockHolder === token) box.lockHolder = null;
    },
    async markPending() {
      box.pending = true;
    },
    async consumePending() {
      if (!box.pending) return false;
      box.pending = false;
      return true;
    },
  };
}

function baseState(): WebhookLegState {
  return {
    notificationUrl: 'https://worker.example/webhooks/airtable',
    registeredAt: '2026-08-07T00:00:00.000Z',
    webhooks: [
      { id: 'achVersions', tableId: TABLE_IDS.assetVersions, macSecretBase64: btoa('secret-a'), cursor: 1 },
      { id: 'achItems', tableId: TABLE_IDS.exceptions, macSecretBase64: btoa('secret-b'), cursor: 1 },
    ],
  };
}

const V = FIELD_IDS.versions;

function versionRecordResponse(overrides: Record<string, unknown> = {}) {
  return jsonResponse({
    id: 'recVersion1',
    fields: {
      [V.name]: 'Example App v3',
      [V.creatorName]: 'Acme Labs',
      [V.reviewStatus]: '⏸️On Hold',
      [V.exceptionStatus]: '🆕Requested',
      [V.exceptionType]: 'Custom Code',
      [V.exceptionRationale]: 'Needs execCommand for Designer paste.',
      [V.reviewFeedback]: 'Blocking: custom code injection.',
      [V.submissionSlackTs]: '1700000000.000100',
      [V.submissionSlackChannel]: 'C04DDRJ5VGT',
      ...overrides,
    },
  });
}

/**
 * Fetch stub routing the three surfaces the processor touches: the Airtable
 * webhook payloads API, the Airtable records API, and Slack chat.postMessage.
 */
function buildFetchStub(options: {
  payloadsByWebhook: Record<string, AirtableWebhookPayload[]>;
  versionResponse?: () => Response;
  itemResponse?: () => Response;
}) {
  const slackCalls: Array<Record<string, unknown>> = [];
  const airtableWrites: Array<{ url: string; body: Record<string, unknown> }> = [];
  let slackCounter = 0;

  const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url.startsWith('https://slack.com/api/chat.postMessage')) {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      slackCalls.push(body);
      slackCounter += 1;
      return jsonResponse({ ok: true, ts: `1786000000.00${slackCounter}`, channel: body.channel });
    }

    const payloadsMatch = url.match(/webhooks\/(ach\w+)\/payloads\?cursor=(\d+)/);
    if (payloadsMatch) {
      const [, webhookId, cursor] = payloadsMatch;
      const payloads = Number(cursor) === 1 ? (options.payloadsByWebhook[webhookId] ?? []) : [];
      return jsonResponse({ payloads, cursor: Number(cursor) + payloads.length, mightHaveMore: false });
    }

    if (url.includes(`/${encodeURIComponent(TABLE_IDS.assetVersions)}/recVersion1`)) {
      return (options.versionResponse ?? versionRecordResponse)();
    }
    if (url.includes(`/${encodeURIComponent(TABLE_IDS.exceptions)}/recItem1`)) {
      return (options.itemResponse ?? (() => jsonResponse({ id: 'recItem1', fields: {} })))();
    }

    if (init?.method === 'PATCH' || init?.method === 'POST') {
      airtableWrites.push({ url, body: JSON.parse(String(init.body)) as Record<string, unknown> });
      return jsonResponse({ records: [{ id: 'recWritten', fields: {} }] });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  });

  return { fetchFn, slackCalls, airtableWrites };
}

function buildDeps(fetchFn: typeof fetch, store: WebhookLegStateStore): ExceptionWebhookProcessorDeps {
  return {
    airtable: new AirtableClient({ apiKey: 'at-token', fetchFn }),
    slack: new SlackClient({ token: 'xoxb-test', fetchFn }),
    store,
    webhookApi: { fetchFn, apiKey: 'at-token', baseId: 'appMoIgXMTTTNIc3p' },
    exceptionChannelId: 'C0BN54FQU84',
    versionViewUrlBase: 'https://airtable.com/appMoIgXMTTTNIc3p/tblHxZ2hgSFLZxsZu/viwM48eXQT4Mxc4Ak/',
    kb: null,
  };
}

describe('verifyAirtableContentMac', () => {
  it('accepts a valid signature and rejects tampering', async () => {
    const secret = btoa('mac-secret');
    const body = JSON.stringify({ base: { id: 'app1' }, webhook: { id: 'ach1' } });

    const secretBytes = Uint8Array.from(atob(secret), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
    const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');

    expect(await verifyAirtableContentMac(secret, body, `hmac-sha256=${hex}`)).toBe(true);
    expect(await verifyAirtableContentMac(secret, `${body} `, `hmac-sha256=${hex}`)).toBe(false);
    expect(await verifyAirtableContentMac(secret, body, null)).toBe(false);
    expect(await verifyAirtableContentMac(secret, body, 'hmac-sha256=deadbeef')).toBe(false);
  });
});

describe('registerExceptionWebhooks', () => {
  it('creates one scoped webhook per table with field watches', async () => {
    const created: Array<Record<string, unknown>> = [];
    const fetchFn = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      created.push(body);
      return jsonResponse({ id: `ach${created.length}`, macSecretBase64: btoa(`s${created.length}`) });
    });

    const state = await registerExceptionWebhooks(
      { fetchFn: fetchFn as unknown as typeof fetch, apiKey: 'at', baseId: 'appMoIgXMTTTNIc3p' },
      'https://worker.example/webhooks/airtable',
    );

    expect(state.webhooks).toHaveLength(2);
    expect(state.webhooks.map((w) => w.tableId)).toEqual([TABLE_IDS.assetVersions, TABLE_IDS.exceptions]);
    expect(state.webhooks.every((w) => w.cursor === 1)).toBe(true);

    const specs = created.map(
      (b) => (b.specification as { options: { filters: Record<string, unknown> } }).options.filters,
    );
    expect(specs[0]).toMatchObject({
      recordChangeScope: TABLE_IDS.assetVersions,
      watchDataInFieldIds: [V.exceptionStatus, V.holdReason],
    });
    expect(specs[1]).toMatchObject({
      recordChangeScope: TABLE_IDS.exceptions,
      watchDataInFieldIds: [FIELD_IDS.exceptions.status],
    });
    expect(created.every((b) => b.notificationUrl === 'https://worker.example/webhooks/airtable')).toBe(true);
  });
});

describe('processExceptionWebhookPayloads', () => {
  it('roots the thread on 🆕Requested, writes the TS back, and stamps the UI actor', async () => {
    const payload: AirtableWebhookPayload = {
      actionMetadata: { source: 'client', sourceMetadata: { user: { id: 'usr1', email: 'shea@webflow.com', name: 'Shea' } } },
      changedTablesById: {
        [TABLE_IDS.assetVersions]: {
          changedRecordsById: {
            recVersion1: { current: { cellValuesByFieldId: { [V.exceptionStatus]: { id: 'sel', name: '🆕Requested' } } } },
          },
        },
      },
    };
    const { fetchFn, slackCalls, airtableWrites } = buildFetchStub({ payloadsByWebhook: { achVersions: [payload] } });
    const store = memoryStore(baseState());
    const result = await processExceptionWebhookPayloads(buildDeps(fetchFn as unknown as typeof fetch, store));

    expect(result.errors).toEqual([]);
    // Root post + review-feedback reply, both in the exception channel.
    expect(slackCalls[0]).toMatchObject({ channel: 'C0BN54FQU84' });
    expect(String(slackCalls[0]?.text)).toContain('Exception Requested');
    expect(String(slackCalls[0]?.text)).toContain('Example App v3');
    expect(slackCalls[1]).toMatchObject({ channel: 'C0BN54FQU84', thread_ts: '1786000000.001' });
    expect(String(slackCalls[1]?.text)).toContain('review feedback');

    // TS write-back + requested-by stamp.
    const writtenFields = airtableWrites.map((w) => (w.body.records as Array<{ fields: Record<string, unknown> }>)[0]!.fields);
    expect(writtenFields.some((f) => f[V.exceptionSlackTs] === '1786000000.001')).toBe(true);
    expect(writtenFields.some((f) => JSON.stringify(f[V.exceptionRequestedBy]) === JSON.stringify({ email: 'shea@webflow.com' }))).toBe(true);

    // Cursor advanced and persisted.
    expect(store.state?.webhooks.find((w) => w.id === 'achVersions')?.cursor).toBe(2);
  });

  it('replies with the decision, posts into the submission thread, and never stamps API-sourced payloads', async () => {
    const payload: AirtableWebhookPayload = {
      actionMetadata: { source: 'publicApi', sourceMetadata: { user: { id: 'usrPat', email: 'pat-owner@webflow.com' } } },
      changedTablesById: {
        [TABLE_IDS.assetVersions]: {
          changedRecordsById: {
            recVersion1: { current: { cellValuesByFieldId: { [V.exceptionStatus]: { id: 'sel', name: '✅Approved' } } } },
          },
        },
      },
    };
    const { fetchFn, slackCalls, airtableWrites } = buildFetchStub({
      payloadsByWebhook: { achVersions: [payload] },
      versionResponse: () =>
        versionRecordResponse({
          [V.exceptionStatus]: '✅Approved',
          [V.exceptionDecisionNotes]: 'Approved for Designer paste only.',
          [V.exceptionSlackTs]: '1785000000.000200',
        }),
    });
    const store = memoryStore(baseState());
    const result = await processExceptionWebhookPayloads(buildDeps(fetchFn as unknown as typeof fetch, store));

    expect(result.errors).toEqual([]);
    // Thread reply carries the exception-only caveat.
    const threadReply = slackCalls.find((c) => c.thread_ts === '1785000000.000200' && c.channel === 'C0BN54FQU84');
    expect(String(threadReply?.text)).toContain('Exception APPROVED');
    expect(String(threadReply?.text)).toContain('approves the exception only');
    // Submission-thread reply lands on 🔔Slack TS in the submission channel.
    const submissionReply = slackCalls.find((c) => c.channel === 'C04DDRJ5VGT');
    expect(submissionReply).toMatchObject({ thread_ts: '1700000000.000100' });
    expect(String(submissionReply?.text)).toContain('Exception decision');
    // No actor stamp for publicApi payloads (would attribute the PAT owner).
    const stamped = airtableWrites.some((w) =>
      JSON.stringify(w.body).includes('pat-owner@webflow.com'),
    );
    expect(stamped).toBe(false);
  });

  it('narrates per-item decisions into the version thread and stamps the item actor', async () => {
    const payload: AirtableWebhookPayload = {
      actionMetadata: { source: 'client', sourceMetadata: { user: { id: 'usr2', email: 'greg@webflow.com', name: 'Greg' } } },
      changedTablesById: {
        [TABLE_IDS.exceptions]: {
          changedRecordsById: {
            recItem1: { current: { cellValuesByFieldId: { [FIELD_IDS.exceptions.status]: { id: 'sel', name: '❌Denied' } } } },
          },
        },
      },
    };
    const E = FIELD_IDS.exceptions;
    const { fetchFn, slackCalls, airtableWrites } = buildFetchStub({
      payloadsByWebhook: { achItems: [payload] },
      itemResponse: () =>
        jsonResponse({
          id: 'recItem1',
          fields: {
            [E.item]: 'Undisclosed data collection',
            [E.status]: '❌Denied',
            [E.decisionNotes]: 'Must be removed before resubmission.',
            [E.assetVersionLink]: ['recVersion1'],
          },
        }),
      versionResponse: () => versionRecordResponse({ [V.exceptionSlackTs]: '1785000000.000300' }),
    });
    const store = memoryStore(baseState());
    const result = await processExceptionWebhookPayloads(buildDeps(fetchFn as unknown as typeof fetch, store));

    expect(result.errors).toEqual([]);
    const reply = slackCalls.find((c) => c.thread_ts === '1785000000.000300');
    expect(String(reply?.text)).toContain('Exception item *DENIED*');
    expect(String(reply?.text)).toContain('Undisclosed data collection');
    const stamps = airtableWrites.filter((w) => w.url.includes(encodeURIComponent(TABLE_IDS.exceptions)));
    expect(JSON.stringify(stamps)).toContain('greg@webflow.com');
  });

  it('skips hold narration when no thread exists and surfaces missing state', async () => {
    const holdPayload: AirtableWebhookPayload = {
      actionMetadata: { source: 'client' },
      changedTablesById: {
        [TABLE_IDS.assetVersions]: {
          changedRecordsById: {
            recVersion1: {
              current: { cellValuesByFieldId: { [V.holdReason]: { id: 'sel', name: 'Pending Exception Decision' } } },
            },
          },
        },
      },
    };
    const { fetchFn, slackCalls } = buildFetchStub({
      payloadsByWebhook: { achVersions: [holdPayload] },
      versionResponse: () => versionRecordResponse({ [V.exceptionSlackTs]: undefined }),
    });
    const store = memoryStore(baseState());
    const result = await processExceptionWebhookPayloads(buildDeps(fetchFn as unknown as typeof fetch, store));
    expect(result.errors).toEqual([]);
    expect(slackCalls).toHaveLength(0);

    const emptyStore = memoryStore(null);
    const missing = await processExceptionWebhookPayloads(buildDeps(fetchFn as unknown as typeof fetch, emptyStore));
    expect(missing.errors[0]).toContain('No webhook state');
  });

  it('skips processing and marks a pending sweep when another run holds the lock', async () => {
    const payload: AirtableWebhookPayload = {
      actionMetadata: { source: 'client' },
      changedTablesById: {
        [TABLE_IDS.assetVersions]: {
          changedRecordsById: {
            recVersion1: { current: { cellValuesByFieldId: { [V.exceptionStatus]: { id: 'sel', name: '🆕Requested' } } } },
          },
        },
      },
    };
    const { fetchFn, slackCalls } = buildFetchStub({ payloadsByWebhook: { achVersions: [payload] } });
    const store = memoryStore(baseState());
    store.lockHolder = 'someone-else';

    const result = await processExceptionWebhookPayloads(buildDeps(fetchFn as unknown as typeof fetch, store));

    expect(result.actions).toEqual(['lock-busy: pending sweep marked']);
    expect(result.processedPayloads).toBe(0);
    expect(slackCalls).toHaveLength(0);
    expect(store.pending).toBe(true);
    // The foreign lock is untouched.
    expect(store.lockHolder).toBe('someone-else');
    // Cursor untouched — the payload stays queued for the lock holder / next sweep.
    expect(store.state?.webhooks.find((w) => w.id === 'achVersions')?.cursor).toBe(1);
  });

  it('runs an extra pass when a pending sweep was requested, then releases the lock', async () => {
    const { fetchFn } = buildFetchStub({ payloadsByWebhook: {} });
    const store = memoryStore(baseState());
    store.pending = true;

    const cursorFetches: string[] = [];
    const trackingFetch: typeof fetch = async (input, init) => {
      const url = String(input);
      const match = url.match(/payloads\?cursor=(\d+)/);
      if (match) cursorFetches.push(url);
      return (fetchFn as unknown as typeof fetch)(input, init);
    };

    const result = await processExceptionWebhookPayloads(buildDeps(trackingFetch, store));

    expect(result.errors).toEqual([]);
    // Two passes over two webhooks = 4 payload fetches (all empty).
    expect(cursorFetches).toHaveLength(4);
    expect(store.pending).toBe(false);
    expect(store.lockHolder).toBeNull();
  });
});

describe('createD1WebhookStateStore', () => {
  /** In-memory stand-in honoring the exact SQL shapes the store issues. */
  function fakeD1(rows: Map<string, string>) {
    return {
      prepare(query: string) {
        return {
          bind(...values: unknown[]) {
            return {
              async first<T>() {
                if (query.startsWith('SELECT')) {
                  const value = rows.get(String(values[0]));
                  return (value ? { value } : null) as T | null;
                }
                return null as T | null;
              },
              async run() {
                if (query.includes('DO NOTHING')) {
                  const key = String(values[0]);
                  if (!rows.has(key)) rows.set(key, String(values[1]));
                } else if (query.startsWith('INSERT')) {
                  rows.set(String(values[0]), String(values[1]));
                } else if (query.startsWith('DELETE') && query.includes('value <')) {
                  const key = String(values[0]);
                  const existing = rows.get(key);
                  if (existing !== undefined && existing < String(values[1])) rows.delete(key);
                } else if (query.startsWith('DELETE')) {
                  rows.delete(String(values[0]));
                }
                return {};
              },
            };
          },
          async run() {
            return {};
          },
        };
      },
    };
  }

  it('round-trips state through a D1-shaped store', async () => {
    const store = createD1WebhookStateStore(fakeD1(new Map()));
    expect(await store.get()).toBeNull();
    const state = baseState();
    await store.put(state);
    expect((await store.get())?.webhooks).toHaveLength(2);
    await store.delete();
    expect(await store.get()).toBeNull();
  });

  it('grants the lock to exactly one holder, honors expiry, and round-trips the pending marker', async () => {
    const store = createD1WebhookStateStore(fakeD1(new Map()));

    expect(await store.acquireLock('token-a', 60_000)).toBe(true);
    expect(await store.acquireLock('token-b', 60_000)).toBe(false);

    // Releasing with the wrong token is a no-op; the right token frees it.
    await store.releaseLock('token-b');
    expect(await store.acquireLock('token-b', 60_000)).toBe(false);
    await store.releaseLock('token-a');
    expect(await store.acquireLock('token-b', 60_000)).toBe(true);
    await store.releaseLock('token-b');

    // An expired lease is stolen by the next acquirer.
    expect(await store.acquireLock('token-stale', -1000)).toBe(true);
    expect(await store.acquireLock('token-fresh', 60_000)).toBe(true);
    await store.releaseLock('token-fresh');

    expect(await store.consumePending()).toBe(false);
    await store.markPending();
    expect(await store.consumePending()).toBe(true);
    expect(await store.consumePending()).toBe(false);
  });
});
