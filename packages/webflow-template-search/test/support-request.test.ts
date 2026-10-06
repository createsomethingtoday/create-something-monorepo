import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  cleanListingUrl,
  parseFieldIds,
  parseSupportRequestBody,
  rateLimitRetrySeconds,
  readBodyCapped,
  resolveCreatorEmail,
} from '../src/supportRequest';
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

async function setup(
  fields: Record<string, unknown> = { fldTestRollup: ['creator@example.com'] },
  knockStatuses: number[] = [],
) {
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
      if (url.startsWith('https://api.knock.app/')) {
        const status = knockStatuses.shift() ?? 200;
        return status === 200 ? Response.json({ workflow_run_id: 'run-1' }) : new Response('upstream error', { status });
      }
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

  it('answers a retry of a sent submission from its row, with no second email or reservation', async () => {
    const { env, close, calls } = await setup();
    try {
      const key = 'form-7f3c2a9e-1b4d-4e8a';
      const first = (await (await callWorker(post(body({ idempotency_key: key })), env)).json()) as {
        data: { request_id: string };
      };
      const retry = await callWorker(post(body({ idempotency_key: key })), env);
      expect(retry.status).toBe(200);
      expect(((await retry.json()) as { data: { request_id: string } }).data.request_id).toBe(first.data.request_id);
      expect(calls.filter((call) => call.url.startsWith('https://api.knock.app/'))).toHaveLength(1);
      expect(await rows(env)).toHaveLength(1);
    } finally {
      close();
    }
  });

  it('retries a failed send on the same row with an identical Knock payload and key', async () => {
    const { env, close, calls } = await setup(undefined, [500]);
    try {
      const key = 'form-0c1d2e3f-4a5b-6c7d';
      expect((await callWorker(post(body({ idempotency_key: key })), env)).status).toBe(502);
      expect((await callWorker(post(body({ idempotency_key: key })), env)).status).toBe(200);
      const knock = calls.filter((call) => call.url.startsWith('https://api.knock.app/'));
      expect(knock).toHaveLength(2);
      expect(knock.map((call) => new Headers(call.init?.headers).get('Idempotency-Key'))).toEqual([
        `support-request:${key}`,
        `support-request:${key}`,
      ]);
      expect(String(knock[0].init?.body)).toBe(String(knock[1].init?.body));
      expect(JSON.parse(String(knock[0].init?.body)).data.request_id).toBe(key);
      const all = await rows(env);
      expect(all).toHaveLength(1);
      expect(all[0].status).toBe('sent');
    } finally {
      close();
    }
  });

  it('lets a retry at the cap through when its first attempt already holds the slot', async () => {
    const { env, close, calls } = await setup(undefined, [200, 200, 500]);
    try {
      expect((await callWorker(post(body()), env)).status).toBe(200);
      expect((await callWorker(post(body()), env)).status).toBe(200);
      const key = 'form-third-slot-0001';
      // Third (last) daily slot fails to send; its retry must not be rate limited.
      expect((await callWorker(post(body({ idempotency_key: key })), env)).status).toBe(502);
      expect((await callWorker(post(body({ idempotency_key: key })), env)).status).toBe(200);
      expect(calls.filter((call) => call.url.startsWith('https://api.knock.app/'))).toHaveLength(4);
    } finally {
      close();
    }
  });

  it('reuses the frozen recipient on retry even if the creator email changed in Airtable', async () => {
    const fields: Record<string, unknown> = { fldTestRollup: ['creator@example.com'] };
    const { env, close, calls } = await setup(fields, [500]);
    try {
      const key = 'form-snapshot-000001';
      expect((await callWorker(post(body({ idempotency_key: key })), env)).status).toBe(502);
      fields.fldTestRollup = ['renamed@example.com'];
      expect((await callWorker(post(body({ idempotency_key: key })), env)).status).toBe(200);
      const knock = calls.filter((call) => call.url.startsWith('https://api.knock.app/'));
      expect(knock.map((call) => JSON.parse(String(call.init?.body)).recipients[0].email)).toEqual([
        'creator@example.com',
        'creator@example.com',
      ]);
      expect(String(knock[0].init?.body)).toBe(String(knock[1].init?.body));
      // One Airtable lookup for both attempts, and the snapshot is cleared once sent.
      expect(calls.filter((call) => call.url.startsWith('https://api.airtable.com/'))).toHaveLength(1);
      expect((await rows(env))[0].delivery_snapshot).toBeNull();
    } finally {
      close();
    }
  });

  it('re-reserves an aged-out retry as the same submission, without counting it twice', async () => {
    const { env, close, calls } = await setup(undefined, [500]);
    try {
      const key = 'form-aged-out-000001';
      expect((await callWorker(post(body({ idempotency_key: key })), env)).status).toBe(502);
      await env.DB.prepare('UPDATE support_requests SET created_at = ? WHERE idempotency_key = ?')
        .bind(new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), key)
        .run();
      for (let index = 0; index < 2; index += 1) {
        expect((await callWorker(post(body(), `198.51.100.${index}`), env)).status).toBe(200);
      }
      // Failed attempt + 2 sends = 3 today. The retry replaces the failed
      // attempt's slot instead of becoming a fourth request.
      expect((await callWorker(post(body({ idempotency_key: key }), '198.51.100.9'), env)).status).toBe(200);
      const statuses = (await rows(env)).map((row) => row.status).sort();
      expect(statuses).toEqual(['sent', 'sent', 'sent', 'superseded']);
      expect(calls.filter((call) => call.url.startsWith('https://api.knock.app/'))).toHaveLength(4);
    } finally {
      close();
    }
  });

  it('keeps the prior attempt and its snapshot when the re-reservation batch fails', async () => {
    const fields: Record<string, unknown> = { fldTestRollup: ['creator@example.com'] };
    const { env, close, calls } = await setup(fields, [500]);
    try {
      const key = 'form-batch-fail-0001';
      expect((await callWorker(post(body({ idempotency_key: key })), env)).status).toBe(502);
      await env.DB.prepare('UPDATE support_requests SET created_at = ? WHERE idempotency_key = ?')
        .bind(new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), key)
        .run();
      // D1 rolls a failed batch back; the mock models that by never applying it.
      const realBatch = env.DB.batch.bind(env.DB);
      let failNext = true;
      env.DB.batch = (async (statements: D1PreparedStatement[]) => {
        if (failNext) {
          failNext = false;
          throw new Error('D1_ERROR: transient');
        }
        return realBatch(statements);
      }) as typeof env.DB.batch;
      expect((await callWorker(post(body({ idempotency_key: key })), env)).status).toBe(502);
      const [prior] = await rows(env);
      expect(prior).toMatchObject({ idempotency_key: key, status: 'send_failed' });
      expect(prior.delivery_snapshot).not.toBeNull();

      // The next retry still finds it and sends the frozen recipient, even after an Airtable change.
      fields.fldTestRollup = ['renamed@example.com'];
      expect((await callWorker(post(body({ idempotency_key: key })), env)).status).toBe(200);
      const knock = calls.filter((call) => call.url.startsWith('https://api.knock.app/'));
      expect(String(knock[0].init?.body)).toBe(String(knock[knock.length - 1].init?.body));
    } finally {
      close();
    }
  });

  it('never downgrades a sent row when the sent write commits but its response is lost', async () => {
    const { env, close, calls } = await setup();
    try {
      const realPrepare = env.DB.prepare.bind(env.DB);
      let loseNextSentWrite = true;
      env.DB.prepare = ((sql: string) => {
        const statement = realPrepare(sql);
        if (!sql.includes('UPDATE support_requests') || !sql.includes('knock_workflow_run_id')) return statement;
        const realBind = statement.bind.bind(statement);
        statement.bind = ((...values: unknown[]) => {
          const bound = realBind(...values);
          if (values[0] === 'sent' && loseNextSentWrite) {
            loseNextSentWrite = false;
            const realRun = bound.run.bind(bound);
            bound.run = (async () => {
              await realRun();
              throw new Error('D1_ERROR: network connection lost');
            }) as typeof bound.run;
          }
          return bound;
        }) as typeof statement.bind;
        return statement;
      }) as typeof env.DB.prepare;

      const key = 'form-lost-sent-00001';
      expect((await callWorker(post(body({ idempotency_key: key })), env)).status).toBe(502);
      expect((await rows(env))[0].status).toBe('sent');
      // The retry sees the sent row and answers from it, with no second email.
      expect((await callWorker(post(body({ idempotency_key: key })), env)).status).toBe(200);
      expect(calls.filter((call) => call.url.startsWith('https://api.knock.app/'))).toHaveLength(1);
    } finally {
      close();
    }
  });

  it('still applies the current quota to an aged-out retry', async () => {
    const { env, close, calls } = await setup(undefined, [500]);
    try {
      const key = 'form-aged-out-000002';
      expect((await callWorker(post(body({ idempotency_key: key })), env)).status).toBe(502);
      await env.DB.prepare('UPDATE support_requests SET created_at = ? WHERE idempotency_key = ?')
        .bind(new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), key)
        .run();
      // Fill this hour's IP quota (5) with other buyers. The aged attempt is
      // outside the hourly window, so it doesn't count there.
      for (let index = 0; index < 5; index += 1) {
        const other = body({ buyer_email: `buyer${index}@example.com` });
        expect((await callWorker(post(other, '203.0.113.50'), env)).status).toBe(200);
      }
      // The retry needs a slot in the current hour, which is full.
      expect((await callWorker(post(body({ idempotency_key: key }), '203.0.113.50'), env)).status).toBe(429);
      expect(calls.filter((call) => call.url.startsWith('https://api.knock.app/'))).toHaveLength(6);
    } finally {
      close();
    }
  });

  it('reports a retry of a recent pending attempt as in progress', async () => {
    const { env, close, calls } = await setup();
    try {
      await env.DB.prepare(
        `INSERT INTO support_requests (id, created_at, template_document_id, template_slug, request_type, status, ip_hash, buyer_email_hash, message_chars, idempotency_key)
         SELECT 'inflight', ?, 'recAsset1', 'meridian', 'other', 'pending', 'ip', buyer_email_hash, 20, 'form-inflight-000001'
         FROM (SELECT 'unused' AS buyer_email_hash)`,
      )
        .bind(new Date().toISOString())
        .run();
      // Same key but a different buyer hash is rejected rather than replayed.
      expect((await callWorker(post(body({ idempotency_key: 'form-inflight-000001' })), env)).status).toBe(400);
      await env.DB.prepare('DELETE FROM support_requests').run();
      const key = 'form-inflight-000002';
      expect((await callWorker(post(body({ idempotency_key: key })), env)).status).toBe(200);
      await env.DB.prepare("UPDATE support_requests SET status = 'pending', created_at = ? WHERE idempotency_key = ?")
        .bind(new Date().toISOString(), key)
        .run();
      expect((await callWorker(post(body({ idempotency_key: key })), env)).status).toBe(409);
      expect(calls.filter((call) => call.url.startsWith('https://api.knock.app/'))).toHaveLength(1);
    } finally {
      close();
    }
  });

  it('rejects oversized bodies before reading them whole', async () => {
    const { env, close, calls } = await setup();
    try {
      const huge = new Request(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://webflow.com' },
        body: JSON.stringify(body({ message: 'x'.repeat(40_000) })),
      });
      expect((await callWorker(huge, env)).status).toBe(413);
      expect(calls).toHaveLength(0);
      expect(await rows(env)).toHaveLength(0);
      // A body under the cap streams through intact.
      expect(await readBodyCapped(new Request(ENDPOINT, { method: 'POST', body: 'hello' }), 10)).toBe('hello');
      expect(await readBodyCapped(new Request(ENDPOINT, { method: 'POST', body: 'x'.repeat(11) }), 10)).toBeNull();
    } finally {
      close();
    }
  });

  it('treats missing Airtable credentials as misconfiguration and reserves nothing', async () => {
    const { env, close, calls } = await setup();
    try {
      delete env.AIRTABLE_API_KEY;
      expect((await callWorker(post(body()), env)).status).toBe(503);
      expect(calls).toHaveLength(0);
      expect(await rows(env)).toHaveLength(0);
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
