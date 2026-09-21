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
  sql.function('unixepoch', () => Math.floor(Date.now() / 1000));
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
  expect(sql.prepare('SELECT status FROM remote_sessions WHERE id=?').get(id)?.status).toBe(
    'ended'
  );
  expect((await POST(event('creator', { action: 'time_start', id, ready: true }))).status).toBe(
    409
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
it('stops accrual at billing revocation and preserves it after renewal', async () => {
  const now = supportFixture();
  const id = await acceptedSupport();
  await POST(event('creator', { action: 'time_start', id, ready: true }));
  sql.exec(`UPDATE network_billing SET status='canceled',checked_at=${now + 30}`);
  vi.setSystemTime(new Date((now + 90) * 1000));
  let body = await (await GET(event('buyer'))).json();
  expect(body.sessions[0]).toMatchObject({
    status: 'ended',
    tracked_seconds: 30,
    timer_started_at: null,
    receipt_status: 'pending'
  });
  sql.exec(
    `UPDATE network_billing SET status='active',period_start=${now + 60},period_end=${now + 90000}`
  );
  body = await (await GET(event('buyer'))).json();
  expect(body.ledger).toHaveLength(2);
  expect(body.ledger.find((p: any) => p.period_start === now - 3600).pending_seconds).toBe(30);
  await POST(event('buyer', { action: 'time_confirm', id }));
  expect(
    (await (await GET(event('buyer'))).json()).ledger.find(
      (p: any) => p.period_start === now - 3600
    ).confirmed_seconds
  ).toBe(30);
});
it('clears timers ended by legacy workers and avoids zero-second pending receipts', async () => {
  supportFixture();
  const id = await acceptedSupport();
  await POST(event('creator', { action: 'time_start', id, ready: true }));
  sql.exec(`UPDATE remote_sessions SET status='ended' WHERE id='${id}'`);
  expect(
    sql.prepare('SELECT timer_started_at FROM remote_sessions WHERE id=?').get(id)?.timer_started_at
  ).toBeNull();
  const next = await acceptedSupport();
  await POST(event('creator', { action: 'time_start', id: next, ready: true }));
  await POST(
    event('creator', { action: 'end', id: next, outcome: 'Ended before any work began.' })
  );
  expect(
    sql.prepare('SELECT receipt_status FROM remote_sessions WHERE id=?').get(next)?.receipt_status
  ).toBe('none');
});
it('keeps pending receipts visible beyond the latest 100 sessions', async () => {
  const now = supportFixture();
  const id = await acceptedSupport();
  await POST(event('creator', { action: 'time_start', id, ready: true }));
  vi.setSystemTime(new Date((now + 30) * 1000));
  await POST(event('creator', { action: 'end', id, outcome: 'Configuration verified together.' }));
  sql.exec(`WITH RECURSIVE nums(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM nums WHERE x<101)
    INSERT INTO remote_sessions(id,network_id,buyer_id,buyer_email,creator_id,method,status,scope,budget_cents,consent_version,created_at,updated_at,expires_at,updated_by)
    SELECT 'new-'||x,'net','buyer','buyer@example.com','creator','rustdesk','ended','Test',0,'test',${now}+x,${now},${now},'buyer' FROM nums`);
  expect((await (await GET(event('buyer'))).json()).sessions.some((s: any) => s.id === id)).toBe(
    true
  );
});
it('caps a running timer at a shortened paid boundary', async () => {
  const now = supportFixture();
  const id = await acceptedSupport();
  await POST(event('creator', { action: 'time_start', id, ready: true }));
  sql.exec(`UPDATE network_billing SET period_end=${now + 20},checked_at=${now + 60}`);
  const row = sql.prepare('SELECT * FROM remote_sessions WHERE id=?').get(id);
  expect(row).toMatchObject({
    tracked_seconds: 20,
    timer_started_at: null,
    status: 'ended',
    receipt_status: 'pending'
  });
});

it('reports the current shortened billing boundary rather than the original receipt end', async () => {
  const now = supportFixture();
  const id = await acceptedSupport();
  await POST(event('creator', { action: 'time_start', id, ready: true }));
  sql.exec(`UPDATE network_billing SET period_end=${now + 20},checked_at=${now + 60}`);
  vi.setSystemTime(new Date((now + 90) * 1000));
  expect((await (await GET(event('buyer'))).json()).ledger[0]).toMatchObject({
    period_end: now + 20,
    active: false
  });
});
it.each(['partner', 'creator'])(
  'settles running time when %s approval is revoked',
  async (kind) => {
    const now = supportFixture();
    const id = await acceptedSupport();
    await POST(event('creator', { action: 'time_start', id, ready: true }));
    const boundary = Number(sql.prepare('SELECT unixepoch() AS t').get()?.t);
    sql
      .prepare(
        'UPDATE remote_sessions SET timer_started_at=?,expires_at=?,support_period_end=? WHERE id=?'
      )
      .run(boundary - 30, boundary + 3600, boundary + 3600, id);
    sql.exec(
      kind === 'partner'
        ? 'UPDATE support_partners SET approved=0'
        : "UPDATE creator_applications SET status='suspended'"
    );
    const row = sql.prepare('SELECT * FROM remote_sessions WHERE id=?').get(id);
    expect(row).toMatchObject({
      status: 'ended',
      timer_started_at: null,
      receipt_status: 'pending'
    });
    expect(Number(row?.tracked_seconds)).toBeGreaterThanOrEqual(30);
    expect(Number(row?.tracked_seconds)).toBeLessThan(33);
  }
);
it('rejects a billing change in the final timer-start statement', async () => {
  supportFixture();
  const id = await acceptedSupport();
  const e = event('creator', { action: 'time_start', id, ready: true });
  e.platform.env.DB.prepare = (q: string) => {
    if (q.startsWith('UPDATE remote_sessions SET timer_started_at='))
      sql.exec("UPDATE network_billing SET status='canceled'");
    return stmt(q);
  };
  expect((await POST(e)).status).toBe(409);
  expect(
    sql.prepare('SELECT timer_started_at FROM remote_sessions WHERE id=?').get(id)?.timer_started_at
  ).toBeNull();
});

it('does not count billing-verification delay as support time', async () => {
  const now = supportFixture();
  const id = await acceptedSupport();
  const e = event('creator', { action: 'time_start', id, ready: true });
  e.platform.env.DB.prepare = (q: string) => {
    if (q === 'SELECT period_start,period_end,status FROM network_billing WHERE network_id=?')
      vi.setSystemTime(new Date((now + 60) * 1000));
    return stmt(q);
  };
  expect((await POST(e)).status).toBe(200);
  expect(
    sql.prepare('SELECT timer_started_at FROM remote_sessions WHERE id=?').get(id)?.timer_started_at
  ).toBe(now + 60);
});
it('rejects an expired session after billing verification completes', async () => {
  const now = supportFixture();
  const id = await acceptedSupport();
  const e = event('creator', { action: 'time_start', id, ready: true });
  e.platform.env.DB.prepare = (q: string) => {
    if (q === 'SELECT period_start,period_end,status FROM network_billing WHERE network_id=?')
      vi.setSystemTime(new Date((now + 7300) * 1000));
    return stmt(q);
  };
  expect((await POST(e)).status).toBe(409);
});
it('requires an outcome even when a timer starts concurrently with ending', async () => {
  const now = supportFixture();
  const id = await acceptedSupport();
  const e = event('creator', { action: 'end', id, outcome: '' });
  e.platform.env.DB.prepare = (q: string) => {
    if (q.startsWith('UPDATE remote_sessions SET tracked_seconds=') && q.includes('status IN'))
      sql
        .prepare(
          'UPDATE remote_sessions SET timer_started_at=?,support_period_start=?,support_period_end=? WHERE id=?'
        )
        .run(now - 30, now - 3600, now + 3600, id);
    return stmt(q);
  };
  expect((await POST(e)).status).toBe(409);
  expect(sql.prepare('SELECT status FROM remote_sessions WHERE id=?').get(id)?.status).toBe(
    'accepted'
  );
});
