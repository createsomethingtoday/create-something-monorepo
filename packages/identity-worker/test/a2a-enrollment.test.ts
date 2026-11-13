import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import worker from '../src/index';
import { createTestDatabase } from './sqlite';
import { startEnrollment, completeEnrollment } from '../src/services/enrollment';
test('A2A migration preserves pending legacy/GiGi/invitation proofs and FK/index', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys=ON');
    for (const name of readdirSync(new URL('../migrations/', import.meta.url))
      .filter((x) => x.endsWith('.sql') && x < '0021')
      .sort())
      db.exec(readFileSync(new URL('../migrations/' + name, import.meta.url), 'utf8'));
    db.exec(
      "INSERT INTO enrollment_invitations(id,email,scope,request_id,created_by,reason,created_at,expires_at) VALUES('invite','invited@example.com','identity:signup','request','operator','fixture',1,9999999999)"
    );
    for (const [token, application, invitation] of [
      ['legacy', null, null],
      ['gigi', 'gigi', null],
      ['invited', null, 'invite']
    ])
      db.prepare('INSERT INTO enrollment_challenges VALUES(?,?,?,?,?,?,?,?)').run(
        token,
        token + '@example.com',
        'signup',
        9999999999,
        null,
        1,
        invitation,
        application
      );
    const before = db.prepare('SELECT * FROM enrollment_challenges ORDER BY token_hash').all();
    db.exec(
      readFileSync(new URL('../migrations/0021_a2a_enrollment.sql', import.meta.url), 'utf8')
    );
    assert.deepEqual(
      db.prepare('SELECT * FROM enrollment_challenges ORDER BY token_hash').all(),
      before
    );
    assert.equal(
      db
        .prepare(
          "SELECT COUNT(*) AS n FROM pragma_index_list('enrollment_challenges') WHERE name='enrollment_expiry'"
        )
        .get()?.n,
      1
    );
    assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);
    assert.throws(() =>
      db
        .prepare('INSERT INTO enrollment_challenges VALUES(?,?,?,?,?,?,?,?)')
        .run('bad', 'bad@example.com', 'signup', 1, null, 1, 'missing', 'a2a')
    );
  } finally {
    db.close();
  }
});
test('A2A recovery requires verified existing identity and revokes its renewable grants', async (t) => {
  const f = createTestDatabase();
  t.after(() => f.close());
  const mails: any[] = [];
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    mails.push(JSON.parse(options!.body as string));
    return Response.json({ id: 'fixture' });
  });
  const env: any = { DB: f.db, A2A_ENROLLMENT_ENABLED: 'true', RESEND_API_KEY: 'fixture' };
  const req = (input: unknown) =>
    new Request('https://id.createsomething.space/v1/auth/enrollment/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': '192.0.2.7' },
      body: JSON.stringify(input)
    });
  for (const email of ['missing@example.com', 'unverified@example.com']) {
    if (email.startsWith('unverified'))
      await f.db
        .prepare(
          "INSERT INTO users(id,email,password_hash,source,email_verified) VALUES('unverified',?,'fixture','io',0)"
        )
        .bind(email)
        .run();
    await startEnrollment(req({ email, purpose: 'recovery', app: 'a2a' }), env);
  }
  assert.equal(mails.length, 0);
  await f.db
    .prepare(
      "INSERT INTO users(id,email,password_hash,source,email_verified) VALUES('verified','verified@example.com','fixture','io',1)"
    )
    .run();
  await f.db
    .prepare(
      "INSERT INTO oauth_refresh_families(family_id,client_id,user_id) VALUES('family','client','verified')"
    )
    .run();
  await startEnrollment(
    req({ email: 'verified@example.com', purpose: 'recovery', app: 'a2a' }),
    env
  );
  assert.equal(mails.length, 1);
  assert.match(mails[0].text, /mode=recovery&app=a2a/);
  const token = decodeURIComponent(mails[0].text.match(/#token=([^\s]+)/)[1]);
  assert.equal(
    (await completeEnrollment(req({ token, password: 'Verified recovery fixture password' }), env))
      .status,
    200
  );
  assert.ok(
    (await f.db.prepare('SELECT revoked_at FROM oauth_refresh_families').first<any>()).revoked_at
  );
});
test('discovery advertises gated A2A signup with fixed return without public enrollment', async () => {
  const response = await worker.fetch(
    new Request('https://id.createsomething.space/.well-known/create-something-auth'),
    { A2A_ENROLLMENT_ENABLED: 'true', RESEND_API_KEY: 'fixture' } as any
  );
  const info: any = await response.json();
  assert.equal(info.applications.a2a.enrollment_enabled, true);
  assert.equal(info.applications.gigi.enrollment_enabled, false);
  assert.equal(info.applications.a2a.return_uri, 'https://a2a.createsomething.agency/inboxes');
  assert.equal(info.enrollment?.mode ?? info.enrollment_mode, 'restricted');
});
test('only exact A2A OAuth resource offers its gated signup and scoped recovery links', async () => {
  const f = createTestDatabase();
  try {
    await f.db
      .prepare(
        "INSERT INTO oauth_clients(client_id,client_name,redirect_uris_json,token_endpoint_auth_method,grant_types_json,response_types_json,scope) VALUES('client','fixture','[\"https://client.example/callback\"]','none','[\"authorization_code\"]','[\"code\"]','openid mcp')"
      )
      .run();
    for (const resource of [
      'https://a2a.createsomething.agency/mcp',
      'https://gigi-connector.createsomething.workers.dev'
    ]) {
      const url = new URL('https://id.createsomething.space/oauth/authorize');
      url.search = new URLSearchParams({
        client_id: 'client',
        redirect_uri: 'https://client.example/callback',
        response_type: 'code',
        resource,
        code_challenge: 'x'.repeat(43),
        code_challenge_method: 'S256',
        scope: 'openid mcp'
      }).toString();
      const response = await worker.fetch(new Request(url), {
        DB: f.db,
        A2A_ENROLLMENT_ENABLED: 'true'
      } as any);
      assert.equal(response.status, 200);
      const html = await response.text();
      if (resource.includes('a2a.')) {
        assert.match(html, /href="\/signup\?app=a2a"/);
        assert.match(html, /href="\/recover\?app=a2a"/);
      } else assert.doesNotMatch(html, /app=a2a/);
    }
  } finally {
    f.close();
  }
});

test('A2A recovery mail failure preserves nondisclosing accepted response', async (t) => {
  const f = createTestDatabase();
  t.after(() => f.close());
  await f.db
    .prepare(
      "INSERT INTO users(id,email,password_hash,source,email_verified) VALUES('verified','verified@example.com','fixture','io',1)"
    )
    .run();
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ error: 'fixture' }, { status: 503 })
  );
  const env: any = { DB: f.db, A2A_ENROLLMENT_ENABLED: 'true', RESEND_API_KEY: 'fixture' };
  const responses = [];
  for (const email of ['verified@example.com', 'missing@example.com']) {
    const response = await startEnrollment(
      new Request('https://id.createsomething.space/v1/auth/enrollment/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'cf-connecting-ip': '192.0.2.8' },
        body: JSON.stringify({ email, purpose: 'recovery', app: 'a2a' })
      }),
      env
    );
    responses.push({ status: response.status, body: await response.json() });
  }
  assert.deepEqual(responses[0], responses[1]);
  assert.equal(responses[0].status, 200);
});
