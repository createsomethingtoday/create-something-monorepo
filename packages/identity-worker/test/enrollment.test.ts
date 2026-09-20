import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startEnrollment, completeEnrollment } from '../src/services/enrollment.ts';
import { verifyPassword } from '../src/services/crypto.ts';

function fixture(t: any) {
  // Match the owning Identity CI's Node20-compatible SQLite fixture boundary.
  const directory = mkdtempSync(join(tmpdir(), 'identity-enrollment-'));
  const database = join(directory, 'identity.sqlite');
  const literal = (value: unknown) =>
    value == null
      ? 'NULL'
      : typeof value === 'number'
        ? String(value)
        : `'${String(value).replaceAll("'", "''")}'`;
  function bind(sql: string, values: unknown[]) {
    let index = 0;
    const result = sql.replaceAll('?', () => {
      if (index >= values.length) throw new Error('Missing binding');
      return literal(values[index++]);
    });
    if (index !== values.length) throw new Error('Unused binding');
    return result;
  }
  const execute = (sql: string) =>
    execFileSync('sqlite3', ['-bail', '-json', database], {
      input: `PRAGMA foreign_keys=ON; ${sql}`,
      encoding: 'utf8'
    }).trim();
  const db = {
    exec: (sql: string) => {
      execute(sql);
    },
    prepare: (sql: string) => ({
      get: (...values: unknown[]) => {
        const result = execute(bind(sql, values) + ';');
        return result ? JSON.parse(result)[0] : undefined;
      },
      run: (...values: unknown[]) => {
        const result = execute(bind(sql, values) + '; SELECT changes() AS changes;');
        return JSON.parse(result)[0];
      }
    })
  };
  db.exec(readFileSync(new URL('../migrations/0001_initial.sql', import.meta.url), 'utf8'));
  db.exec('ALTER TABLE users ADD COLUMN deleted_at TEXT');
  db.exec(
    readFileSync(new URL('../migrations/0016_verified_enrollment.sql', import.meta.url), 'utf8')
  );
  function statement(sql: string, values: any[] = []): any {
    return {
      bind: (...args: any[]) => statement(sql, args),
      toSql: () => bind(sql, values),
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
        db.exec(`BEGIN; ${statements.map((s) => s.toSql()).join('; ')}; COMMIT;`);
        return statements.map(() => ({ meta: { changes: 1 } }));
      }
    }
  } as any;
  const mails: any[] = [];
  t.mock.method(globalThis, 'fetch', async (url: any, options: any) => {
    assert.equal(url, 'https://api.resend.com/emails');
    mails.push(JSON.parse(options.body));
    return Response.json({ id: 'test-mail' });
  });
  t.after(() => rmSync(directory, { recursive: true, force: true }));
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
    /https:\/\/private.createsomething.agency\/verify\?mode=signup&next=%2Fstart#token=/
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

test('enrollment preserves buyer and seller return paths and rejects external navigation', async (t) => {
  const f = fixture(t);
  for (const [index, path] of [
    '/n/builder-lab/assets/asset-one',
    '/collection',
    '/apply',
    '/support',
    '/support/partner',
    '/support/12345678-1234-1234-1234-123456789abc',
    '/n/builders/field-notes',
    '/n/builders/impact',
    '//evil.example'
  ].entries()) {
    await startEnrollment(
      f.request({ email: `return${index}@example.com`, purpose: 'signup', next_path: path }),
      f.env
    );
    const expected = path === '//evil.example' ? '/start' : path;
    assert.ok(f.mails[index].text.includes(`next=${encodeURIComponent(expected)}#token=`));
    assert.ok(!f.mails[index].text.includes('evil.example'));
  }
});

test('limited enrollment proves only explicitly allowed mailboxes while public signup stays closed', async (t) => {
  const f = fixture(t);
  f.env.PUBLIC_ENROLLMENT_ENABLED = 'false';
  f.env.ENROLLMENT_ALLOWED_EMAILS = ' invited@example.com ';
  assert.equal(
    (await startEnrollment(f.request({ email: 'other@example.com', purpose: 'signup' }), f.env))
      .status,
    503
  );
  assert.equal(f.mails.length, 0);
  assert.equal(
    (await startEnrollment(f.request({ email: 'INVITED@example.com', purpose: 'signup' }), f.env))
      .status,
    200
  );
  const token = f.token();
  f.env.ENROLLMENT_ALLOWED_EMAILS = '';
  assert.equal(
    (await completeEnrollment(f.request({ token, password: 'limited fixture password' }), f.env))
      .status,
    503
  );
  assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM users').get()?.count, 0);
  f.env.ENROLLMENT_ALLOWED_EMAILS = 'invited@example.com';
  assert.equal(
    (await completeEnrollment(f.request({ token, password: 'limited fixture password' }), f.env))
      .status,
    200
  );
  assert.equal(f.db.prepare('SELECT email_verified FROM users').get()?.email_verified, 1);
});
