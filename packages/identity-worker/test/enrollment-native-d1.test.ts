// Local workerd/Miniflare D1 acceptance, synthetic data only; no remote bindings.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { startEnrollment, completeEnrollment } from '../src/services/enrollment.ts';
import { manageEnrollmentInvitation } from '../src/services/enrollment-invitations.ts';
import { verifyPassword } from '../src/services/crypto.ts';
const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');

// These repository migrations contain no semicolons inside SQL string literals.
function migrationStatements(file: string): string[] {
  return readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8')
    .replace(/^\s*--.*$/gm, '')
    .split(';')
    .map((sql) => sql.trim())
    .filter(Boolean);
}

test('native local D1 validates additive upgrade, atomic recovery and invitation redemption', async (t) => {
  const runtime = new Miniflare({
    modules: true,
    host: '127.0.0.1',
    script: 'export default { fetch() { return new Response("local fixture") } }',
    compatibilityDate: '2024-12-01',
    d1Databases: ['DB'],
    d1Persist: false
  });
  t.after(() => runtime.dispose());
  const db = await runtime.getD1Database('DB');
  const migrations = readdirSync(new URL('../migrations/', import.meta.url))
    .filter((file) => file.endsWith('.sql'))
    .sort();
  for (const file of migrations.filter((file) => !file.startsWith('0017_')))
    await db.batch(migrationStatements(file).map((sql) => db.prepare(sql)));
  await db
    .prepare(
      "INSERT INTO users(id,email,password_hash,source,email_verified) VALUES('u','verified@example.com','original','io',1)"
    )
    .run();
  const before = await db.prepare('PRAGMA table_info(enrollment_challenges)').all();
  assert.equal(
    before.results.some((column: any) => column.name === 'invitation_id'),
    false
  );
  await db.batch(
    migrationStatements('0017_enrollment_invitations.sql').map((sql) => db.prepare(sql))
  );
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM users').first()).count, 1);
  assert.equal(
    (await db.prepare('PRAGMA table_info(enrollment_challenges)').all()).results.some(
      (column: any) => column.name === 'invitation_id'
    ),
    true
  );
  const env: any = {
    DB: db,
    PUBLIC_ENROLLMENT_ENABLED: 'false',
    VERIFIED_RECOVERY_ENABLED: 'true',
    ENROLLMENT_INVITATIONS_ENABLED: 'true',
    RESEND_API_KEY: 'public-synthetic-fixture'
  };
  const request = (input: unknown) =>
    new Request('https://id.synthetic.example/v1/auth/enrollment/start', {
      method: 'POST',
      headers: { 'CF-Connecting-IP': '192.0.2.1', 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
  const mails: any[] = [];
  t.mock.method(globalThis, 'fetch', async (url: any, options: any) => {
    assert.equal(url, 'https://api.resend.com/emails');
    mails.push(JSON.parse(options.body));
    return Response.json({ id: 'synthetic-only' });
  });
  const token = () => decodeURIComponent(mails.at(-1).text.match(/#token=([^\s]+)/)[1]);

  await t.test('failed native batch rolls back all preceding writes', async () => {
    await assert.rejects(
      db.batch([
        db.prepare(
          "INSERT INTO users(id,email,password_hash,source) VALUES('rollback','rollback@example.com','fixture','io')"
        ),
        db.prepare(
          "INSERT INTO users(id,email,password_hash,source) VALUES('u','duplicate@example.com','fixture','io')"
        )
      ])
    );
    assert.equal(await db.prepare("SELECT id FROM users WHERE id='rollback'").first(), null);
  });

  await t.test(
    'verified recovery atomically revokes five actual-schema credential families',
    async () => {
      await db.batch([
        db.prepare(
          "INSERT INTO refresh_tokens(id,user_id,token_hash,family_id,expires_at) VALUES('r','u','fixture-r','f','2099-01-01')"
        ),
        db.prepare(
          "INSERT INTO oauth_refresh_families(family_id,client_id,user_id) VALUES('f','fixture-client','u')"
        ),
        db.prepare(
          "INSERT INTO mcp_sessions(id,user_id,tenant_id,account_id,host,tool_mode,token_hash,expires_at) VALUES('s','u','fixture-tenant','fixture-account','codex','read_only','fixture-s','2099-01-01')"
        ),
        db.prepare(
          "INSERT INTO mcp_long_lived_tokens(id,auth_subject,tenant_id,account_id,tool_mode,token_hash,token_prefix,issued_by) VALUES('m','u','fixture-tenant','fixture-account','read_only','fixture-m','fixture','fixture-owner')"
        ),
        db.prepare(
          "INSERT INTO mcp_legacy_keys(id,key_hash,key_prefix,tenant_id,account_id,user_id,reason,issued_by,expires_at,sunset_at) VALUES('l','fixture-l','fixture','fixture-tenant','fixture-account','u','synthetic','fixture-owner','2099-01-01','2099-01-01')"
        )
      ]);
      assert.equal(
        (
          await startEnrollment(
            request({ email: 'verified@example.com', purpose: 'recovery' }),
            env
          )
        ).status,
        200
      );
      const proof = token();
      assert.equal(
        (
          await completeEnrollment(
            request({ token: proof, password: 'public recovered fixture password' }),
            env
          )
        ).status,
        200
      );
      for (const table of [
        'refresh_tokens',
        'oauth_refresh_families',
        'mcp_sessions',
        'mcp_long_lived_tokens',
        'mcp_legacy_keys'
      ])
        assert.ok((await db.prepare(`SELECT revoked_at FROM ${table}`).first()).revoked_at, table);
      assert.equal(
        await verifyPassword(
          'public recovered fixture password',
          (await db.prepare("SELECT password_hash FROM users WHERE id='u'").first()).password_hash
        ),
        true
      );
      assert.equal(
        (
          await completeEnrollment(
            request({ token: proof, password: 'public replay fixture password' }),
            env
          )
        ).status,
        400
      );
    }
  );

  const issue = (email: string, requestId: string) =>
    manageEnrollmentInvitation(
      request({
        email,
        request_id: requestId,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        reason: 'Native synthetic acceptance'
      }),
      env,
      'service:fixture-owner',
      'issue'
    );
  await t.test('invited signup binds, redeems and audits once without app grants', async () => {
    const issued = await issue('invite@example.com', 'native-invite-one');
    assert.equal(issued.status, 201);
    const id = ((await issued.json()) as any).invitation.id;
    await startEnrollment(request({ email: 'invite@example.com', purpose: 'signup' }), env);
    const proof = token();
    assert.equal(
      (
        await completeEnrollment(
          request({ token: proof, password: 'public invited fixture password' }),
          env
        )
      ).status,
      200
    );
    assert.ok(
      (
        await db
          .prepare('SELECT redeemed_at FROM enrollment_invitations WHERE id=?')
          .bind(id)
          .first()
      ).redeemed_at
    );
    assert.equal(
      (
        await db
          .prepare(
            "SELECT COUNT(*) AS count FROM enrollment_invitation_events WHERE invitation_id=? AND action='redeemed'"
          )
          .bind(id)
          .first()
      ).count,
      1
    );
    assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM mcp_accounts').first()).count, 0);
    assert.equal(
      (
        await completeEnrollment(
          request({ token: proof, password: 'public replay fixture password' }),
          env
        )
      ).status,
      400
    );
  });
  await t.test(
    'native revocation race reports zero changes and creates no user/audit',
    async () => {
      const id = ((await (await issue('race@example.com', 'native-invite-race')).json()) as any)
        .invitation.id;
      await startEnrollment(request({ email: 'race@example.com', purpose: 'signup' }), env);
      const proof = token();
      const raceEnv = {
        ...env,
        DB: {
          prepare: db.prepare.bind(db),
          batch: async (statements: any[]) => {
            await db
              .prepare('UPDATE enrollment_invitations SET revoked_at=unixepoch() WHERE id=?')
              .bind(id)
              .run();
            return db.batch(statements);
          }
        }
      };
      assert.equal(
        (
          await completeEnrollment(
            request({ token: proof, password: 'public blocked fixture password' }),
            raceEnv
          )
        ).status,
        400
      );
      assert.equal(
        await db.prepare("SELECT id FROM users WHERE email='race@example.com'").first(),
        null
      );
      assert.equal(
        (
          await db
            .prepare(
              "SELECT COUNT(*) AS count FROM enrollment_invitation_events WHERE invitation_id=? AND action='redeemed'"
            )
            .bind(id)
            .first()
        ).count,
        0
      );
    }
  );
});
