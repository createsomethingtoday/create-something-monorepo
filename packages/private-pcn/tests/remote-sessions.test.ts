import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, afterEach, it, expect } from 'vitest';
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
afterEach(() => sql.close());
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
