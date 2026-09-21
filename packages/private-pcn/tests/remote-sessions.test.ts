import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { POST, GET } from '../src/routes/api/remote-sessions/+server';
let sql: DatabaseSync;
function stmt(q: string, v: any[] = []): any {
  return {
    bind: (...a: any[]) => stmt(q, a),
    first: async () => sql.prepare(q).get(...v) || null,
    all: async () => ({ results: sql.prepare(q).all(...v) }),
    run: async () => ({ meta: { changes: sql.prepare(q).run(...v).changes } })
  };
}
function event(subject: string, body?: any): any {
  return {
    locals: { identity: { subject, email: subject + '@example.com' } },
    platform: { env: { DB: { prepare: stmt }, PCN_REMOTE_SESSIONS_ENABLED: 'true' } },
    request: new Request('https://private.createsomething.agency/api/remote-sessions', {
      method: body ? 'POST' : 'GET',
      headers: {
        Origin: 'https://private.createsomething.agency',
        'Content-Type': 'application/json'
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    })
  };
}
beforeEach(() => {
  sql = new DatabaseSync(':memory:');
  for (const f of readdirSync(new URL('../migrations/', import.meta.url)).sort())
    sql.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  sql.exec(`INSERT INTO networks(id,slug,owner_id,name) VALUES('net','creator','creator','Creator');
INSERT INTO creator_applications(subject,email,display_name,credentials,teaching_video_url,status) VALUES('creator','creator@example.com','Creator','Credentials','https://example.com','approved');
INSERT INTO builder_assets(id,network_id,title,kind,summary,price_cents) VALUES('asset','net','Asset','skill','Example',0);
INSERT INTO asset_releases(id,network_id,asset_id,version,manifest,object_key,sha256,size_bytes) VALUES('rel','net','asset','1','{}','key','hash',1);
INSERT INTO asset_entitlements(id,network_id,asset_id,release_id,buyer_id,source,status) VALUES('ent','net','asset','rel','buyer','free','active');`);
});
afterEach(() => {
  vi.useRealTimers();
  sql.close();
});
it('lets a buyer request attended support and keeps an outsider out', async () => {
  const res = await POST(
    event('buyer', {
      action: 'request',
      network: 'net',
      method: 'rustdesk',
      scope: 'Help configure my MCP in a test workspace.',
      budget: 0,
      consent: true
    })
  );
  expect(res.status).toBe(201);
  const { id } = await res.json();
  expect((await (await GET(event('creator'))).json()).sessions[0].buyer_email).toBe(
    'buyer@example.com'
  );
  expect((await (await GET(event('outsider'))).json()).sessions).toHaveLength(0);
  expect((await POST(event('outsider', { action: 'accept', id }))).status).toBe(404);
  expect((await POST(event('creator', { action: 'accept', id }))).status).toBe(200);
  expect((await (await GET(event('buyer'))).json()).sessions[0].status).toBe('accepted');
});
it('requires explicit consent and an active buyer relationship', async () => {
  expect(
    (
      await POST(
        event('buyer', {
          action: 'request',
          network: 'net',
          method: 'rustdesk',
          scope: 'Help configure my MCP in a test workspace.',
          budget: 0,
          consent: false
        })
      )
    ).status
  ).toBe(400);
  expect(
    (
      await POST(
        event('outsider', {
          action: 'request',
          network: 'net',
          method: 'rustdesk',
          scope: 'Help configure my MCP in a test workspace.',
          budget: 0,
          consent: true
        })
      )
    ).status
  ).toBe(403);
});
it('blocks impersonation, malicious Zoom URLs and revoked purchases', async () => {
  const request = {
    action: 'request',
    network: 'net',
    method: 'zoom',
    scope: 'Help configure my MCP in a test workspace.',
    budget: 0,
    consent: true
  };
  const imp = event('buyer', request);
  imp.locals.impersonation = { id: 'imp' };
  expect((await POST(imp)).status).toBe(403);
  const { id } = await (await POST(event('buyer', request))).json();
  expect(
    (
      await POST(
        event('creator', { action: 'accept', id, meeting: 'https://zoom.us.evil.example/j/123' })
      )
    ).status
  ).toBe(400);
  sql.exec("UPDATE asset_entitlements SET status='revoked'");
  expect(
    (await POST(event('creator', { action: 'accept', id, meeting: 'https://zoom.us/j/123' })))
      .status
  ).toBe(403);
  expect(
    (await POST(event('buyer', { action: 'end', id, outcome: 'Cancelled before connecting.' })))
      .status
  ).toBe(200);
  expect(sql.prepare('SELECT count(*) AS n FROM remote_session_events').get()?.n).toBe(2);
});
it('allows either participant to end an accepted session and prevents reopening', async () => {
  const { id } = await (
    await POST(
      event('buyer', {
        action: 'request',
        network: 'net',
        method: 'rustdesk',
        scope: 'Help configure my MCP in a test workspace.',
        budget: 0,
        consent: true
      })
    )
  ).json();
  await POST(event('creator', { action: 'accept', id }));
  expect(
    (
      await POST(
        event('buyer', { action: 'end', id, outcome: 'Disconnected. Verified configuration.' })
      )
    ).status
  ).toBe(200);
  expect((await POST(event('creator', { action: 'accept', id }))).status).toBe(409);
});

it('counts only buyer-confirmed server time toward the paid support period', async () => {
  const now = supportFixture();
  sql.exec('UPDATE network_billing SET period_start=0');
  const { id } = await (
    await POST(
      event('buyer', {
        action: 'request',
        network: 'net',
        method: 'rustdesk',
        scope: 'Verify the MCP configuration together.',
        budget: 0,
        consent: true
      })
    )
  ).json();
  await POST(event('creator', { action: 'accept', id }));
  // No valid billing period is invented from a period end alone.
  expect((await POST(event('creator', { action: 'time_start', id, ready: true }))).status).toBe(
    409
  );
  sql.exec(`UPDATE network_billing SET period_start=${now - 3600}`);
  expect((await POST(event('creator', { action: 'time_start', id, ready: true }))).status).toBe(
    200
  );
  vi.setSystemTime(new Date((now + 120) * 1000));
  expect((await POST(event('buyer', { action: 'time_pause', id }))).status).toBe(200);
  await POST(
    event('creator', { action: 'end', id, outcome: 'MCP setup verified with the buyer.' })
  );
  let body = await (await GET(event('buyer'))).json();
  expect(body.ledger[0]).toMatchObject({
    included_seconds: 10800,
    confirmed_seconds: 0,
    pending_seconds: 120
  });
  expect((await POST(event('creator', { action: 'time_confirm', id }))).status).toBe(403);
  expect((await POST(event('buyer', { action: 'time_confirm', id }))).status).toBe(200);
  body = await (await GET(event('buyer'))).json();
  expect(body.ledger[0]).toMatchObject({
    confirmed_seconds: 120,
    pending_seconds: 0,
    remaining_seconds: 10680
  });
  expect((await POST(event('buyer', { action: 'time_confirm', id }))).status).toBe(409);
});

function supportFixture() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-21T12:00:00Z'));
  const now = Math.floor(Date.now() / 1000);
  sql.exec(`UPDATE networks SET kind='support',owner_id='buyer',status='active' WHERE id='net';
    INSERT INTO support_partners(subject,approved,account_id,review_note,reviewed_by) VALUES('creator',1,'acct_test','Approved','admin');
    INSERT INTO support_workspaces(network_id,owner_id,partner_id,company,workflow,status) VALUES('net','buyer','creator','Test','Test workflow','agreed');
    INSERT INTO network_billing(network_id,checkout_key,subscription_id,status,checked_at,period_end) VALUES('net','key','sub_test','active',${now},${now + 86400});`);

  sql.exec(`UPDATE network_billing SET period_start=${now - 3600}`);
  return now;
}

async function acceptedSupport() {
  const { id } = await (
    await POST(
      event('buyer', {
        action: 'request',
        network: 'net',
        method: 'rustdesk',
        scope: 'Verify the MCP configuration together.',
        budget: 0,
        consent: true
      })
    )
  ).json();
  await POST(event('creator', { action: 'accept', id }));
  return id;
}
it('bounds expired time and leaves disputed receipts out of fulfilled hours', async () => {
  const now = supportFixture();
  const id = await acceptedSupport();
  await POST(event('creator', { action: 'time_start', id, ready: true }));
  vi.setSystemTime(new Date((now + 9000) * 1000));
  const response = await POST(
    event('buyer', {
      action: 'time_dispute',
      id,
      note: 'We disconnected before the recorded window ended.'
    })
  );
  expect(response.status).toBe(200);
  const body = await (await GET(event('buyer'))).json();
  expect(body.ledger[0]).toMatchObject({
    confirmed_seconds: 0,
    disputed_seconds: 7200,
    remaining_seconds: 10800
  });
  expect(body.sessions[0]).toMatchObject({
    status: 'ended',
    timer_started_at: null,
    receipt_status: 'disputed'
  });
  expect(() => sql.exec("UPDATE support_time_events SET actor_id='other'")).toThrow('immutable');
});
it('rejects unready, buyer-started, duplicate and revoked-partner timers', async () => {
  supportFixture();
  const id = await acceptedSupport();
  expect((await POST(event('buyer', { action: 'time_start', id, ready: true }))).status).toBe(403);
  expect((await POST(event('creator', { action: 'time_start', id }))).status).toBe(400);
  expect((await POST(event('creator', { action: 'time_start', id, ready: true }))).status).toBe(
    200
  );
  expect((await POST(event('creator', { action: 'time_start', id, ready: true }))).status).toBe(
    409
  );
  expect((await POST(event('buyer', { action: 'time_pause', id }))).status).toBe(200);
  sql.exec('UPDATE support_partners SET approved=0');
  expect((await POST(event('creator', { action: 'time_start', id, ready: true }))).status).toBe(
    403
  );
});
it('does not let an asset purchase claim included company-support hours', async () => {
  const id = await acceptedSupport();
  expect((await POST(event('creator', { action: 'time_start', id, ready: true }))).status).toBe(
    409
  );
  expect((await (await GET(event('buyer'))).json()).ledger).toEqual([]);
});
it('prevents one partner from running overlapping timers across workspaces', async () => {
  supportFixture();
  const id = await acceptedSupport();
  await POST(event('creator', { action: 'time_start', id, ready: true }));
  sql.exec(`INSERT INTO networks(id,slug,owner_id,name,kind,status) VALUES('net2','second','buyer2','Second','support','active');
    INSERT INTO support_workspaces(network_id,owner_id,partner_id,company,workflow,status) VALUES('net2','buyer2','creator','Second','Workflow','agreed');
    INSERT INTO network_billing(network_id,checkout_key,subscription_id,status,checked_at,period_start,period_end) SELECT 'net2','key2','sub2',status,checked_at,period_start,period_end FROM network_billing WHERE network_id='net';`);
  const { id: second } = await (
    await POST(
      event('buyer2', {
        action: 'request',
        network: 'net2',
        method: 'zoom',
        scope: 'Inspect the second buyer configuration.',
        budget: 0,
        consent: true
      })
    )
  ).json();
  await POST(
    event('creator', { action: 'accept', id: second, meeting: 'https://zoom.us/j/123456789' })
  );
  expect(
    (await POST(event('creator', { action: 'time_start', id: second, ready: true }))).status
  ).toBe(409);
  await POST(event('buyer', { action: 'time_pause', id }));
  expect(
    (await POST(event('creator', { action: 'time_start', id: second, ready: true }))).status
  ).toBe(200);
});
it('uses the real period boundary, excludes earlier receipts, and keeps cancellation totals', async () => {
  const now = supportFixture();
  const id = await acceptedSupport();
  sql.exec(`UPDATE network_billing SET period_end=${now + 60}`);
  await POST(event('creator', { action: 'time_start', id, ready: true }));
  vi.setSystemTime(new Date((now + 90) * 1000));
  await GET(event('buyer'));
  await POST(event('buyer', { action: 'time_confirm', id }));
  expect((await (await GET(event('buyer'))).json()).ledger[0].confirmed_seconds).toBe(60);
  sql.exec(`UPDATE network_billing SET period_end=${now + 50}`);
  expect((await (await GET(event('buyer'))).json()).ledger[0].confirmed_seconds).toBe(60);
  sql.exec(`UPDATE network_billing SET period_start=${now + 60},period_end=${now + 86400}`);
  expect((await (await GET(event('buyer'))).json()).ledger[0].confirmed_seconds).toBe(0);
});
it('preserves paused work for buyer review when its session expires', async () => {
  const now = supportFixture();
  const id = await acceptedSupport();
  await POST(event('creator', { action: 'time_start', id, ready: true }));
  vi.setSystemTime(new Date((now + 30) * 1000));
  await POST(event('buyer', { action: 'time_pause', id }));
  vi.setSystemTime(new Date((now + 8000) * 1000));
  const body = await (await GET(event('buyer'))).json();
  expect(body.sessions[0]).toMatchObject({
    status: 'ended',
    tracked_seconds: 30,
    receipt_status: 'pending'
  });
  expect((await POST(event('buyer', { action: 'time_confirm', id }))).status).toBe(200);
});
