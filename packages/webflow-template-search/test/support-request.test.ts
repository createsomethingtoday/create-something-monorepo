import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanListingUrl, parseFieldIds, parseSupportRequestBody, rateLimitRetrySeconds, resolveCreatorEmail } from '../src/supportRequest';
import { callWorker, createTestEnv } from './support/worker';

const ENDPOINT = 'https://search.test/api/templates/support-request';

function body(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    template_slug: 'meridian',
    request_type: 'file_request',
    buyer_name: 'Ada',
    buyer_email: 'ada@example.com',
    message: 'Where can I get the Figma file for this template?',
    ...overrides,
  };
}

function post(payload: unknown, ip = '203.0.113.7', origin = 'https://webflow.com'): Request {
  return new Request(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip, Origin: origin },
    body: JSON.stringify(payload),
  });
}

async function setup(fields: Record<string, unknown> = { fldTestRollup: ['creator@example.com'] }) {
  const harness = createTestEnv();
  Object.assign(harness.env, {
    SUPPORT_REQUESTS_ENABLED: '1',
    KNOCK_API_KEY: 'sk_test_knock',
    SUPPORT_REQUEST_HASH_SALT: 'test-salt',
    ALLOWED_ORIGINS: 'https://webflow.com,*.webflow.com',
    AIRTABLE_CREATOR_EMAIL_FIELD_IDS: 'fldTestOverride, fldTestRollup',
  });
  await harness.env.DB.prepare(
    `INSERT INTO template_documents (id, template_slug, name, listing_url, creator_name, creator_record_id, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind('recAsset1', 'meridian', 'Meridian', 'https://webflow.com/templates/html/meridian?utm_source=youtube', 'Kevin', 'recCreator1', '2026-10-06')
    .run();

  const calls: Array<{ url: string; init?: RequestInit }> = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.startsWith('https://api.airtable.com/')) return Response.json({ id: 'recAsset1', fields });
      if (url.startsWith('https://api.knock.app/')) return Response.json({ workflow_run_id: 'run-1' });
      throw new Error(`unexpected fetch ${url}`);
    }),
  );
  return { ...harness, calls };
}

async function rows(env: { DB: D1Database }) {
  const { results } = await env.DB.prepare('SELECT * FROM support_requests').all<Record<string, unknown>>();
  return results;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('support request parsing', () => {
  it('accepts a well-formed request and defaults optional fields', () => {
    const result = parseSupportRequestBody(JSON.stringify(body({ buyer_name: undefined })));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.buyer_name).toBe('');
      expect(result.value.website).toBe('');
    }
  });

  it('names the invalid fields and rejects unknown ones', () => {
    const result = parseSupportRequestBody(JSON.stringify(body({ buyer_email: 'nope', request_type: 'refund' })));
    expect(result).toEqual({ ok: false, error: 'invalid_fields', fields: ['request_type', 'buyer_email'] });
    expect(parseSupportRequestBody(JSON.stringify(body({ creator_email: 'x@y.z' }))).ok).toBe(false);
    expect(parseSupportRequestBody('not json')).toEqual({ ok: false, error: 'invalid_json' });
  });

  it('prefers the per-asset override email over the creator rollup', () => {
    const ids = parseFieldIds(' fldTestOverride, fldTestRollup ,');
    expect(ids).toEqual(['fldTestOverride', 'fldTestRollup']);
    expect(resolveCreatorEmail({ fldTestOverride: 'override@example.com', fldTestRollup: ['rollup@example.com'] }, ids))
      .toBe('override@example.com');
    expect(resolveCreatorEmail({ fldTestRollup: ['rollup@example.com, other@example.com'] }, ids)).toBe('rollup@example.com');
    expect(resolveCreatorEmail({ fldTestRollup: [] }, ids)).toBeNull();
  });

  it('reports the longest wait among exceeded windows', () => {
    const now = Date.parse('2026-10-06T12:00:00Z');
    expect(rateLimitRetrySeconds(now, [{ count: 3, max: 3, oldest: null, windowMs: 3_600_000 }])).toBeNull();
    // Daily buyer cap exceeded; the oldest row ages out in 23 hours.
    expect(
      rateLimitRetrySeconds(now, [
        { count: 2, max: 5, oldest: '2026-10-06T11:30:00Z', windowMs: 3_600_000 },
        { count: 4, max: 3, oldest: '2026-10-06T11:00:00Z', windowMs: 86_400_000 },
      ]),
    ).toBe(23 * 3600);
  });

  it('strips campaign parameters from listing URLs', () => {
    expect(cleanListingUrl('https://webflow.com/templates/html/meridian?utm_source=youtube#x'))
      .toBe('https://webflow.com/templates/html/meridian');
  });
});

describe('POST /api/templates/support-request', () => {
  it('is off unless SUPPORT_REQUESTS_ENABLED is 1', async () => {
    const { env, close } = createTestEnv();
    try {
      const response = await callWorker(post(body()), env);
      expect(response.status).toBe(503);
    } finally {
      close();
    }
  });

  it('logs the request, emails the creator via Knock, and never returns the creator email', async () => {
    const { env, close, calls } = await setup();
    try {
      const response = await callWorker(post(body()), env);
      expect(response.status).toBe(200);
      const json = (await response.json()) as { success: boolean; data: { request_id: string } };
      expect(json.success).toBe(true);
      expect(JSON.stringify(json)).not.toContain('creator@example.com');

      const knock = calls.find((call) => call.url.startsWith('https://api.knock.app/'));
      expect(knock?.url).toBe('https://api.knock.app/v1/workflows/marketplace-template-support-request/trigger');
      const headers = new Headers(knock?.init?.headers);
      expect(headers.get('Idempotency-Key')).toBe(`support-request:${json.data.request_id}`);
      const payload = JSON.parse(String(knock?.init?.body));
      expect(payload.recipients).toEqual([{ id: 'marketplace-creator-recCreator1', email: 'creator@example.com', name: 'Kevin' }]);
      expect(payload.data).toMatchObject({
        template_name: 'Meridian',
        listing_url: 'https://webflow.com/templates/html/meridian',
        request_type: 'file_request',
        request_type_label: 'File request (Figma, assets)',
        buyer_email: 'ada@example.com',
      });

      const [row] = await rows(env);
      expect(row).toMatchObject({
        id: json.data.request_id,
        template_slug: 'meridian',
        creator_record_id: 'recCreator1',
        request_type: 'file_request',
        status: 'sent',
        knock_workflow_run_id: 'run-1',
      });
      // Neither the buyer email nor the message body is stored.
      expect(JSON.stringify(row)).not.toContain('ada@example.com');
      expect(JSON.stringify(row)).not.toContain('Figma file');
    } finally {
      close();
    }
  });

  it('reuses the client idempotency key for Knock so retries cannot double-send', async () => {
    const { env, close, calls } = await setup();
    try {
      const key = 'form-7f3c2a9e-1b4d-4e8a';
      expect((await callWorker(post(body({ idempotency_key: key })), env)).status).toBe(200);
      expect((await callWorker(post(body({ idempotency_key: key })), env)).status).toBe(200);
      const keys = calls
        .filter((call) => call.url.startsWith('https://api.knock.app/'))
        .map((call) => new Headers(call.init?.headers).get('Idempotency-Key'));
      expect(keys).toEqual([`support-request:${key}`, `support-request:${key}`]);
    } finally {
      close();
    }
  });

  it('rejects browser requests from origins outside ALLOWED_ORIGINS', async () => {
    const { env, close, calls } = await setup();
    try {
      const response = await callWorker(post(body(), '203.0.113.7', 'https://evil.example'), env);
      expect(response.status).toBe(403);
      expect(calls).toHaveLength(0);
      expect(await rows(env)).toHaveLength(0);
      expect((await callWorker(post(body(), '203.0.113.7', 'https://template-marketplace.design.webflow.com'), env)).status).toBe(200);
    } finally {
      close();
    }
  });

  it('ranks by insert order, so a request that took an earlier timestamp but inserted last is limited', async () => {
    const { env, close } = await setup();
    try {
      // Three later-timestamped requests insert first; a stalled request with
      // the earliest timestamp inserts fourth.
      const rows = [
        ['b', '2026-10-06T12:00:02.000Z'],
        ['c', '2026-10-06T12:00:03.000Z'],
        ['d', '2026-10-06T12:00:04.000Z'],
        ['a', '2026-10-06T12:00:01.000Z'],
      ];
      const seqs: Record<string, number> = {};
      for (const [id, at] of rows) {
        const row = await env.DB.prepare(
          `INSERT INTO support_requests (id, created_at, template_document_id, template_slug, request_type, status, ip_hash, buyer_email_hash, message_chars)
           VALUES (?, ?, 'recAsset1', 'meridian', 'other', 'pending', ?, 'buyer', 20) RETURNING rowid AS seq`,
        )
          .bind(id, at, `ip-${id}`)
          .first<{ seq: number }>();
        seqs[id] = row?.seq ?? 0;
      }
      const rank = async (id: string) =>
        (
          await env.DB.prepare(
            `SELECT COUNT(*) AS n FROM support_requests WHERE buyer_email_hash = 'buyer' AND template_slug = 'meridian'
               AND status != 'rate_limited' AND rowid <= ?`,
          )
            .bind(seqs[id])
            .first<{ n: number }>()
        )?.n;
      expect([await rank('b'), await rank('c'), await rank('d'), await rank('a')]).toEqual([1, 2, 3, 4]);
    } finally {
      close();
    }
  });

  it('counts concurrent requests against the cap', async () => {
    const { env, close, calls } = await setup();
    try {
      const responses = await Promise.all(
        Array.from({ length: 6 }, (_, index) => callWorker(post(body(), `198.51.100.${index}`), env)),
      );
      // Exactly the cap goes through: the burst can neither exceed it nor starve itself.
      const sent = responses.filter((response) => response.status === 200).length;
      expect(sent).toBe(3);
      expect(responses.filter((response) => response.status === 429)).toHaveLength(3);
      expect(calls.filter((call) => call.url.startsWith('https://api.knock.app/')).length).toBe(3);
      const limited = responses.find((response) => response.status === 429);
      expect(Number(limited?.headers.get('Retry-After'))).toBeGreaterThan(3600);
    } finally {
      close();
    }
  });

  it('records creator_unreachable without calling Knock when no creator email exists', async () => {
    const { env, close, calls } = await setup({});
    try {
      const response = await callWorker(post(body()), env);
      expect(response.status).toBe(422);
      expect(calls.some((call) => call.url.startsWith('https://api.knock.app/'))).toBe(false);
      expect((await rows(env))[0]?.status).toBe('creator_unreachable');
    } finally {
      close();
    }
  });

  it('silently drops honeypot submissions', async () => {
    const { env, close, calls } = await setup();
    try {
      const response = await callWorker(post(body({ website: 'https://spam.example' })), env);
      expect(response.status).toBe(200);
      expect(calls).toHaveLength(0);
      expect(await rows(env)).toHaveLength(0);
    } finally {
      close();
    }
  });

  it('returns 404 for unknown templates and 429 after repeated submissions', async () => {
    const { env, close } = await setup();
    try {
      expect((await callWorker(post(body({ template_slug: 'missing' })), env)).status).toBe(404);
      for (let attempt = 0; attempt < 3; attempt += 1) {
        expect((await callWorker(post(body(), `198.51.100.${attempt}`), env)).status).toBe(200);
      }
      // Fourth request from the same buyer for the same template in 24 hours.
      expect((await callWorker(post(body(), '198.51.100.99'), env)).status).toBe(429);
    } finally {
      close();
    }
  });
});
