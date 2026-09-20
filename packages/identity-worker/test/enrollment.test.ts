import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { startEnrollment, completeEnrollment } from '../src/services/enrollment.ts';
import { verifyPassword } from '../src/services/crypto.ts';

function fixture(t: any) {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_initial.sql', import.meta.url), 'utf8'));
  db.exec('ALTER TABLE users ADD COLUMN deleted_at TEXT');
  db.exec(
    readFileSync(new URL('../migrations/0016_verified_enrollment.sql', import.meta.url), 'utf8')
  );
  function statement(sql: string, values: any[] = []): any {
    return {
      bind: (...args: any[]) => statement(sql, args),
      first: async () => db.prepare(sql).get(...values) || null,
      run: async () => ({ meta: { changes: db.prepare(sql).run(...values).changes } })
    };
  }
  const env = {
    PUBLIC_ENROLLMENT_ENABLED: 'true',
    RESEND_API_KEY: 'test-only',
    DB: {
      prepare: statement,
      batch: async (statements: any[]) => {
        db.exec('BEGIN');
        try {
          const result = [];
          for (const s of statements) result.push(await s.run());
          db.exec('COMMIT');
          return result;
        } catch (e) {
          db.exec('ROLLBACK');
          throw e;
        }
      }
    }
  } as any;
  const mails: any[] = [];
  t.mock.method(globalThis, 'fetch', async (url: any, options: any) => {
    assert.equal(url, 'https://api.resend.com/emails');
    mails.push(JSON.parse(options.body));
    return Response.json({ id: 'test-mail' });
  });
  t.after(() => db.close());
  const request = (input: unknown) =>
    new Request('https://id.createsomething.space/v1/auth/enrollment/start', {
      method: 'POST',
      headers: { 'CF-Connecting-IP': '192.0.2.1', 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
  const token = () => decodeURIComponent(mails.at(-1).text.match(/#token=([^\s]+)/)[1]);
  return { db, env, mails, request, token };
}

test('signup proves mailbox, hashes the password and grants no session or membership', async (t) => {
  const f = fixture(t);
  assert.equal(
    (
      await startEnrollment(
        f.request({
          email: 'NEW@example.com',
          purpose: 'signup',
          return_url: 'https://evil.example'
        }),
        f.env
      )
    ).status,
    200
  );
  assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM users').get()?.count, 0);
  assert.match(
    f.mails[0].text,
    /https:\/\/private.createsomething.agency\/verify\?mode=signup&next=%2Fdashboard#token=/
  );
  assert.doesNotMatch(f.mails[0].text, /evil.example/);
  const token = f.token();
  assert.notEqual(
    f.db.prepare('SELECT token_hash FROM enrollment_challenges').get()?.token_hash,
    token
  );
  const response = await completeEnrollment(
    f.request({ token, password: 'a secure fixture password' }),
    f.env
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.has('Set-Cookie'), false);
  assert.deepEqual(await response.json(), { success: true, email: 'new@example.com' });
  const user = f.db.prepare('SELECT * FROM users').get()!;
  assert.equal(user.email_verified, 1);
  assert.equal(await verifyPassword('a secure fixture password', String(user.password_hash)), true);
  assert.equal(
    (await completeEnrollment(f.request({ token, password: 'different fixture password' }), f.env))
      .status,
    400
  );
});

test('concurrent completions consume a challenge only once', async (t) => {
  const f = fixture(t);
  await startEnrollment(f.request({ email: 'race@example.com', purpose: 'signup' }), f.env);
  const token = f.token();
  const responses = await Promise.all([
    completeEnrollment(f.request({ token, password: 'concurrent password one' }), f.env),
    completeEnrollment(f.request({ token, password: 'concurrent password two' }), f.env)
  ]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 400]);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM users').get()?.count, 1);
});

test('signup cannot overwrite an existing account; recovery revokes refresh tokens', async (t) => {
  const f = fixture(t);
  f.db.exec(
    "INSERT INTO users(id,email,password_hash,source) VALUES('u','known@example.com','original','io'); INSERT INTO refresh_tokens(id,user_id,token_hash,family_id,expires_at) VALUES('r','u','hash','family','2099-01-01');"
  );
  await startEnrollment(f.request({ email: 'known@example.com', purpose: 'signup' }), f.env);
  assert.equal(
    (
      await completeEnrollment(
        f.request({ token: f.token(), password: 'new fixture password' }),
        f.env
      )
    ).status,
    409
  );
  assert.equal(f.db.prepare('SELECT password_hash FROM users').get()?.password_hash, 'original');
  await startEnrollment(f.request({ email: 'known@example.com', purpose: 'recovery' }), f.env);
  assert.equal(
    (
      await completeEnrollment(
        f.request({ token: f.token(), password: 'recovered fixture password' }),
        f.env
      )
    ).status,
    200
  );
  assert.ok(f.db.prepare('SELECT revoked_at FROM refresh_tokens').get()?.revoked_at);
  assert.equal(
    await verifyPassword(
      'recovered fixture password',
      String(f.db.prepare('SELECT password_hash FROM users').get()?.password_hash)
    ),
    true
  );
});

test('expired proof and disabled enrollment fail closed without creating users', async (t) => {
  const f = fixture(t);
  assert.equal(
    (
      await startEnrollment(f.request({ email: 'new@example.com', purpose: 'signup' }), {
        ...f.env,
        PUBLIC_ENROLLMENT_ENABLED: 'false'
      })
    ).status,
    503
  );
  assert.equal(f.mails.length, 0);
  await startEnrollment(f.request({ email: 'new@example.com', purpose: 'signup' }), f.env);
  f.db.exec('UPDATE enrollment_challenges SET expires_at=0');
  assert.equal(
    (
      await completeEnrollment(
        f.request({ token: f.token(), password: 'expired fixture password' }),
        f.env
      )
    ).status,
    400
  );
  assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM users').get()?.count, 0);
});

test('email and client limits bound mail requests without exposing account existence', async (t) => {
  const f = fixture(t);
  for (let i = 0; i < 4; i++)
    assert.equal(
      (await startEnrollment(f.request({ email: 'limited@example.com', purpose: 'signup' }), f.env))
        .status,
      200
    );
  assert.equal(f.mails.length, 3);
  for (let i = 4; i < 15; i++)
    await startEnrollment(f.request({ email: 'limited@example.com', purpose: 'signup' }), f.env);
  assert.equal(
    (await startEnrollment(f.request({ email: 'other@example.com', purpose: 'signup' }), f.env))
      .status,
    429
  );
});
