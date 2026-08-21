import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import identityWorker from '../src/index.ts';
import {
  createMcpLegacyKey,
  createMcpSession,
  createOAuthRefreshFamily,
  createRefreshToken,
  findRefreshTokenByHash,
  findUserById,
  isOAuthRefreshFamilyActive,
  upsertMcpLongLivedToken
} from '../src/db/queries.ts';
import { hashPassword, hashToken } from '../src/services/crypto.ts';
import { generateTokens } from '../src/services/tokens.ts';

const migrationRoot = new URL('../migrations/', import.meta.url);

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function bindSql(sql: string, values: unknown[]): string {
  let index = 0;
  const bound = sql.replaceAll('?', () => {
    if (index >= values.length) throw new Error(`Missing SQL binding ${index + 1}: ${sql}`);
    return sqlLiteral(values[index++]);
  });
  if (index !== values.length) {
    throw new Error(`Unused SQL bindings: expected ${index}, received ${values.length}`);
  }
  return bound;
}

class SqliteD1Statement {
  constructor(
    private readonly database: string,
    private readonly sql: string,
    private readonly values: unknown[] = []
  ) {}

  bind(...values: unknown[]) {
    return new SqliteD1Statement(this.database, this.sql, values);
  }

  toSql(): string {
    return bindSql(this.sql, this.values);
  }

  async run() {
    const output = execFileSync('sqlite3', ['-bail', '-json', this.database], {
      input: `PRAGMA foreign_keys=ON; ${this.toSql()}; SELECT changes() AS changes;`,
      encoding: 'utf8'
    }).trim();
    const rows = output ? (JSON.parse(output) as Array<{ changes: number }>) : [];
    const changes = Number(rows.at(-1)?.changes ?? 0);
    return { success: true, meta: { changes } };
  }

  async first<T>() {
    const output = execFileSync('sqlite3', ['-json', this.database], {
      input: `PRAGMA foreign_keys=ON; ${this.toSql()};`,
      encoding: 'utf8'
    }).trim();
    const rows = output ? (JSON.parse(output) as T[]) : [];
    return rows[0] ?? null;
  }

  async all<T>() {
    const output = execFileSync('sqlite3', ['-json', this.database], {
      input: `PRAGMA foreign_keys=ON; ${this.toSql()};`,
      encoding: 'utf8'
    }).trim();
    return { success: true, results: output ? (JSON.parse(output) as T[]) : [], meta: {} };
  }
}

function createSqliteD1(database: string): D1Database {
  return {
    prepare(sql: string) {
      return new SqliteD1Statement(database, sql) as unknown as D1PreparedStatement;
    },
    async batch(statements: D1PreparedStatement[]) {
      const sql = statements
        .map((statement) => (statement as unknown as SqliteD1Statement).toSql())
        .join('; ');
      execFileSync('sqlite3', ['-bail', database], {
        input: `PRAGMA foreign_keys=ON; BEGIN; ${sql}; COMMIT;`,
        encoding: 'utf8'
      });
      return statements.map(() => ({ success: true, meta: { changes: 1 } }));
    }
  } as unknown as D1Database;
}

function applyMigrations(database: string): void {
  for (const migration of [
    '0001_initial.sql',
    '0002_email_change_requests.sql',
    '0003_soft_delete.sql',
    '0004_analytics_opt_out.sql',
    '0005_cross_domain_tokens.sql',
    '0006_mcp_sessions.sql',
    '0007_mcp_accounts.sql',
    '0008_mcp_partner_access.sql',
    '0009_authz_tables.sql',
    '0010_mcp_long_lived_tokens.sql',
    '0011_mcp_host_binding.sql',
    '0012_oauth_grant_replay.sql',
    '0013_identity_session_cutover.sql',
    '0014_oauth_clients.sql',
    '0015_atomic_credential_consumption.sql'
  ]) {
    execFileSync('sqlite3', ['-bail', database], {
      input: `PRAGMA foreign_keys=ON; ${readFileSync(new URL(migration, migrationRoot), 'utf8')}`,
      encoding: 'utf8'
    });
  }
}

async function issueMcpCredentials(db: D1Database, userId: string) {
  const sessionToken = `session-${userId}`;
  const managedToken = `managed-${userId}`;
  const legacyToken = `legacy-${userId}`;
  assert.equal(
    await createMcpSession(db, {
      id: `session-${userId}`,
      user_id: userId,
      tenant_id: 'tenant-customer',
      account_id: 'account-customer',
      host: 'mcp.createsomething.agency',
      bound_host: null,
      tool_mode: 'read_write',
      toolkit_profile_json: '[]',
      allowed_tool_prefixes_json: '[]',
      token_hash: await hashToken(sessionToken),
      expires_at: '2999-01-01T00:00:00.000Z'
    }),
    true
  );
  assert.equal(
    await upsertMcpLongLivedToken(db, {
      id: `managed-${userId}`,
      auth_subject: userId,
      auth_email: 'customer@example.com',
      tenant_id: 'tenant-customer',
      account_id: 'account-customer',
      bound_host: null,
      tool_mode: 'read_write',
      toolkit_profile_json: '[]',
      allowed_tool_prefixes_json: '[]',
      token_hash: await hashToken(managedToken),
      token_prefix: 'managed',
      issued_by: 'test-operator',
      metadata_json: '{}'
    }),
    true
  );
  assert.equal(
    await createMcpLegacyKey(db, {
      id: `legacy-${userId}`,
      key_hash: await hashToken(legacyToken),
      key_prefix: 'legacy',
      tenant_id: 'tenant-customer',
      account_id: 'account-customer',
      user_id: userId,
      reason: 'account deletion regression',
      exception_approved_by: 'test-operator',
      issued_by: 'test-operator',
      expires_at: '2999-01-01T00:00:00.000Z',
      sunset_at: '2999-01-01T00:00:00.000Z'
    }),
    true
  );
  assert.equal(
    await createOAuthRefreshFamily(db, {
      familyId: `oauth-family-${userId}`,
      clientId: 'oauth-client',
      userId
    }),
    true
  );
  assert.equal(
    await isOAuthRefreshFamilyActive(db, `oauth-family-${userId}`, 'oauth-client', userId),
    true
  );
  assert.equal(
    await createRefreshToken(db, {
      id: `refresh-${userId}`,
      user_id: userId,
      token_hash: await hashToken(`refresh-${userId}`),
      family_id: `refresh-family-${userId}`,
      expires_at: '2999-01-01T00:00:00.000Z',
      audience: 'space'
    }),
    true
  );
  return { sessionToken, managedToken, legacyToken };
}

async function assertRefreshTokenInvalidated(
  db: D1Database,
  userId: string,
  allowHardDeleted = false
): Promise<void> {
  const token = await findRefreshTokenByHash(db, await hashToken(`refresh-${userId}`));
  assert.equal(Boolean(token?.revoked_at) || (allowHardDeleted && token === null), true);
}

async function resolveMcpCredential(db: D1Database, token: string) {
  const response = await identityWorker.fetch(
    new Request('https://id.createsomething.space/v1/mcp/sessions/resolve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Resolve-Token': 'test-resolve-secret'
      },
      body: JSON.stringify({ token })
    }),
    {
      DB: db,
      ENVIRONMENT: 'test',
      ALLOWED_ORIGINS: '',
      MCP_SESSION_RESOLVE_TOKEN: 'test-resolve-secret',
      AGENCY_INTERNAL_API_URL: 'https://createsomething.agency',
      AGENCY_INTERNAL_API_KEY: 'test-agency-key'
    } as never
  );
  assert.equal(response.status, 200);
  return (await response.json()) as { valid: boolean; reason?: string };
}

test('soft deletion immediately invalidates every Identity-linked MCP credential', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'identity-account-deletion-'));
  const database = join(directory, 'test.sqlite');
  const originalFetch = globalThis.fetch;
  try {
    applyMigrations(database);
    const password = 'correct horse battery staple';
    execFileSync('sqlite3', ['-bail', database], {
      input: `INSERT INTO users (
				id, email, email_verified, password_hash, name, tier, source
			) VALUES (
				'user-customer', 'customer@example.com', 1, ${sqlLiteral(await hashPassword(password))},
				'Customer', 'agency', 'space'
			);`,
      encoding: 'utf8'
    });
    const db = createSqliteD1(database);
    const user = await findUserById(db, 'user-customer');
    assert.ok(user);
    const { accessToken, refreshToken } = await generateTokens(db, user, 'space');
    const linked = await issueMcpCredentials(db, user.id);
    const operatorToken = 'legacy-unrelated-operator';
    await createMcpLegacyKey(db, {
      id: 'legacy-unrelated-operator',
      key_hash: await hashToken(operatorToken),
      key_prefix: 'operator',
      tenant_id: 'tenant-operator',
      account_id: 'account-operator',
      user_id: null,
      reason: 'operator break glass',
      exception_approved_by: 'security',
      issued_by: 'security',
      expires_at: '2999-01-01T00:00:00.000Z',
      sunset_at: '2999-01-01T00:00:00.000Z'
    });

    globalThis.fetch = async () =>
      Response.json({ allowed: true, reason: 'allowed', service_tier: 'policy_os_core' });

    for (const token of Object.values(linked)) {
      assert.equal((await resolveMcpCredential(db, token)).valid, true);
    }
    assert.equal((await resolveMcpCredential(db, operatorToken)).valid, true);

    const deletion = await identityWorker.fetch(
      new Request('https://id.createsomething.space/v1/users/me', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      }),
      { DB: db, ENVIRONMENT: 'test', ALLOWED_ORIGINS: '' } as never
    );
    assert.equal(deletion.status, 200, await deletion.text());

    for (const token of Object.values(linked)) {
      const resolution = await resolveMcpCredential(db, token);
      assert.equal(resolution.valid, false, `${token} must be invalid after account deletion`);
      assert.equal(resolution.reason, 'revoked');
    }
    assert.equal(
      await isOAuthRefreshFamilyActive(db, 'oauth-family-user-customer', 'oauth-client', user.id),
      false
    );
    await assertRefreshTokenInvalidated(db, user.id);
    const refresh = await identityWorker.fetch(
      new Request('https://id.createsomething.space/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      }),
      { DB: db, ENVIRONMENT: 'test', ALLOWED_ORIGINS: '' } as never
    );
    assert.equal(refresh.status, 401);
    assert.equal((await resolveMcpCredential(db, operatorToken)).valid, true);

    assert.equal(
      await createMcpSession(db, {
        id: 'session-after-delete',
        user_id: user.id,
        tenant_id: 'tenant-customer',
        account_id: 'account-customer',
        host: 'mcp.createsomething.agency',
        bound_host: null,
        tool_mode: 'read_write',
        toolkit_profile_json: '[]',
        allowed_tool_prefixes_json: '[]',
        token_hash: await hashToken('session-after-delete'),
        expires_at: '2999-01-01T00:00:00.000Z'
      }),
      false
    );
    assert.equal(
      await upsertMcpLongLivedToken(db, {
        id: 'managed-after-delete',
        auth_subject: user.id,
        auth_email: user.email,
        tenant_id: 'tenant-customer',
        account_id: 'account-customer',
        bound_host: null,
        tool_mode: 'read_write',
        toolkit_profile_json: '[]',
        allowed_tool_prefixes_json: '[]',
        token_hash: await hashToken('managed-after-delete'),
        token_prefix: 'managed',
        issued_by: 'test-operator',
        metadata_json: '{}'
      }),
      false
    );
    assert.equal(
      await createMcpLegacyKey(db, {
        id: 'legacy-after-delete',
        key_hash: await hashToken('legacy-after-delete'),
        key_prefix: 'legacy',
        tenant_id: 'tenant-customer',
        account_id: 'account-customer',
        user_id: user.id,
        reason: 'stale issuance attempt',
        exception_approved_by: 'test-operator',
        issued_by: 'test-operator',
        expires_at: '2999-01-01T00:00:00.000Z',
        sunset_at: '2999-01-01T00:00:00.000Z'
      }),
      false
    );
    assert.equal(
      await createOAuthRefreshFamily(db, {
        familyId: 'oauth-family-after-delete',
        clientId: 'oauth-client',
        userId: user.id
      }),
      false
    );
    assert.equal(
      await createRefreshToken(db, {
        id: 'refresh-after-delete',
        user_id: user.id,
        token_hash: await hashToken('refresh-after-delete'),
        family_id: 'refresh-family-after-delete',
        expires_at: '2999-01-01T00:00:00.000Z',
        audience: 'space'
      }),
      false
    );
  } finally {
    globalThis.fetch = originalFetch;
    rmSync(directory, { recursive: true, force: true });
  }
});

test('administrative hard deletion invalidates credentials linked to an already deleted identity', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'identity-account-hard-deletion-'));
  const database = join(directory, 'test.sqlite');
  const originalFetch = globalThis.fetch;
  try {
    applyMigrations(database);
    const apiKey = 'hard-delete-api-key';
    execFileSync('sqlite3', ['-bail', database], {
      input: `INSERT INTO users (
				id, email, email_verified, password_hash, name, tier, source
			) VALUES (
				'user-hard-delete', 'hard-delete@example.com', 1, 'unused', 'Hard Delete',
				'agency', 'space'
			);
			INSERT INTO api_keys (id, service, key_hash, permissions)
			VALUES (
				'api-hard-delete', 'account-cleanup', ${sqlLiteral(await hashToken(apiKey))},
				'["delete_user"]'
			);`,
      encoding: 'utf8'
    });
    const db = createSqliteD1(database);
    const linked = await issueMcpCredentials(db, 'user-hard-delete');
    execFileSync('sqlite3', ['-bail', database], {
      input: "UPDATE users SET deleted_at = datetime('now') WHERE id = 'user-hard-delete';",
      encoding: 'utf8'
    });
    const operatorToken = 'legacy-unrelated-hard-delete-operator';
    await createMcpLegacyKey(db, {
      id: 'legacy-unrelated-hard-delete-operator',
      key_hash: await hashToken(operatorToken),
      key_prefix: 'operator',
      tenant_id: 'tenant-operator',
      account_id: 'account-operator',
      user_id: null,
      reason: 'operator break glass',
      exception_approved_by: 'security',
      issued_by: 'security',
      expires_at: '2999-01-01T00:00:00.000Z',
      sunset_at: '2999-01-01T00:00:00.000Z'
    });

    globalThis.fetch = async () =>
      Response.json({ allowed: true, reason: 'allowed', service_tier: 'policy_os_core' });

    for (const token of Object.values(linked)) {
      assert.equal((await resolveMcpCredential(db, token)).valid, true);
    }

    const deletion = await identityWorker.fetch(
      new Request('https://id.createsomething.space/v1/users/user-hard-delete/hard-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({ force: true })
      }),
      { DB: db, ENVIRONMENT: 'test', ALLOWED_ORIGINS: '' } as never
    );
    assert.equal(deletion.status, 200, await deletion.text());

    for (const token of Object.values(linked)) {
      assert.equal(
        (await resolveMcpCredential(db, token)).valid,
        false,
        `${token} must be invalid after administrative hard deletion`
      );
    }
    assert.equal(
      await isOAuthRefreshFamilyActive(
        db,
        'oauth-family-user-hard-delete',
        'oauth-client',
        'user-hard-delete'
      ),
      false
    );
    await assertRefreshTokenInvalidated(db, 'user-hard-delete', true);
    assert.equal((await resolveMcpCredential(db, operatorToken)).valid, true);
  } finally {
    globalThis.fetch = originalFetch;
    rmSync(directory, { recursive: true, force: true });
  }
});

test('scheduled cleanup invalidates credentials linked to every expired deleted identity', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'identity-account-cleanup-'));
  const database = join(directory, 'test.sqlite');
  const originalFetch = globalThis.fetch;
  try {
    applyMigrations(database);
    const apiKey = 'cleanup-api-key';
    execFileSync('sqlite3', ['-bail', database], {
      input: `INSERT INTO users (
				id, email, email_verified, password_hash, name, tier, source
			) VALUES (
				'user-cleanup', 'cleanup@example.com', 1, 'unused', 'Cleanup',
				'agency', 'space'
			);
			INSERT INTO api_keys (id, service, key_hash, permissions)
			VALUES (
				'api-cleanup', 'account-cleanup', ${sqlLiteral(await hashToken(apiKey))},
				'["cleanup_users"]'
			);`,
      encoding: 'utf8'
    });
    const db = createSqliteD1(database);
    const linked = await issueMcpCredentials(db, 'user-cleanup');
    execFileSync('sqlite3', ['-bail', database], {
      input: "UPDATE users SET deleted_at = datetime('now', '-31 days') WHERE id = 'user-cleanup';",
      encoding: 'utf8'
    });
    const operatorToken = 'legacy-unrelated-cleanup-operator';
    await createMcpLegacyKey(db, {
      id: 'legacy-unrelated-cleanup-operator',
      key_hash: await hashToken(operatorToken),
      key_prefix: 'operator',
      tenant_id: 'tenant-operator',
      account_id: 'account-operator',
      user_id: null,
      reason: 'operator break glass',
      exception_approved_by: 'security',
      issued_by: 'security',
      expires_at: '2999-01-01T00:00:00.000Z',
      sunset_at: '2999-01-01T00:00:00.000Z'
    });

    globalThis.fetch = async () =>
      Response.json({ allowed: true, reason: 'allowed', service_tier: 'policy_os_core' });

    for (const token of Object.values(linked)) {
      assert.equal((await resolveMcpCredential(db, token)).valid, true);
    }

    const cleanup = await identityWorker.fetch(
      new Request('https://id.createsomething.space/v1/users/cleanup', {
        method: 'POST',
        headers: { 'X-API-Key': apiKey }
      }),
      { DB: db, ENVIRONMENT: 'test', ALLOWED_ORIGINS: '' } as never
    );
    const cleanupBody = (await cleanup.json()) as { deleted_count: number };
    assert.equal(cleanup.status, 200, JSON.stringify(cleanupBody));
    assert.equal(cleanupBody.deleted_count, 1);

    for (const token of Object.values(linked)) {
      assert.equal(
        (await resolveMcpCredential(db, token)).valid,
        false,
        `${token} must be invalid after scheduled cleanup`
      );
    }
    assert.equal(
      await isOAuthRefreshFamilyActive(
        db,
        'oauth-family-user-cleanup',
        'oauth-client',
        'user-cleanup'
      ),
      false
    );
    await assertRefreshTokenInvalidated(db, 'user-cleanup', true);
    assert.equal((await resolveMcpCredential(db, operatorToken)).valid, true);
  } finally {
    globalThis.fetch = originalFetch;
    rmSync(directory, { recursive: true, force: true });
  }
});

test('verified email change invalidates the same Identity-linked MCP credentials', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'identity-email-change-revocation-'));
  const database = join(directory, 'test.sqlite');
  const originalFetch = globalThis.fetch;
  try {
    applyMigrations(database);
    const emailChangeToken = 'email-change-token';
    execFileSync('sqlite3', ['-bail', database], {
      input: `INSERT INTO users (
				id, email, email_verified, password_hash, name, tier, source
			) VALUES (
				'user-email-change', 'before@example.com', 1, 'unused', 'Email Change',
				'agency', 'space'
			);
			INSERT INTO email_change_requests (id, user_id, new_email, token_hash, expires_at)
			VALUES (
				'change-email', 'user-email-change', 'after@example.com',
				${sqlLiteral(await hashToken(emailChangeToken))}, '2999-01-01T00:00:00.000Z'
			);`,
      encoding: 'utf8'
    });
    const db = createSqliteD1(database);
    const linked = await issueMcpCredentials(db, 'user-email-change');
    const operatorToken = 'legacy-unrelated-email-change-operator';
    await createMcpLegacyKey(db, {
      id: 'legacy-unrelated-email-change-operator',
      key_hash: await hashToken(operatorToken),
      key_prefix: 'operator',
      tenant_id: 'tenant-operator',
      account_id: 'account-operator',
      user_id: null,
      reason: 'operator break glass',
      exception_approved_by: 'security',
      issued_by: 'security',
      expires_at: '2999-01-01T00:00:00.000Z',
      sunset_at: '2999-01-01T00:00:00.000Z'
    });

    globalThis.fetch = async () =>
      Response.json({ allowed: true, reason: 'allowed', service_tier: 'policy_os_core' });

    for (const token of Object.values(linked)) {
      assert.equal((await resolveMcpCredential(db, token)).valid, true);
    }

    const change = await identityWorker.fetch(
      new Request('https://id.createsomething.space/v1/users/me/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: emailChangeToken })
      }),
      { DB: db, ENVIRONMENT: 'test', ALLOWED_ORIGINS: '' } as never
    );
    assert.equal(change.status, 200, await change.text());

    for (const token of Object.values(linked)) {
      assert.equal(
        (await resolveMcpCredential(db, token)).valid,
        false,
        `${token} must be invalid after verified email change`
      );
    }
    assert.equal(
      await isOAuthRefreshFamilyActive(
        db,
        'oauth-family-user-email-change',
        'oauth-client',
        'user-email-change'
      ),
      false
    );
    await assertRefreshTokenInvalidated(db, 'user-email-change');
    assert.equal((await resolveMcpCredential(db, operatorToken)).valid, true);
  } finally {
    globalThis.fetch = originalFetch;
    rmSync(directory, { recursive: true, force: true });
  }
});

test('soft deletion rolls back identity state when any credential-family revocation fails', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'identity-account-deletion-rollback-'));
  const database = join(directory, 'test.sqlite');
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  try {
    applyMigrations(database);
    const password = 'correct horse battery staple';
    execFileSync('sqlite3', ['-bail', database], {
      input: `INSERT INTO users (
				id, email, email_verified, password_hash, name, tier, source
			) VALUES (
				'user-rollback', 'rollback@example.com', 1, ${sqlLiteral(await hashPassword(password))},
				'Rollback', 'agency', 'space'
			);`,
      encoding: 'utf8'
    });
    const db = createSqliteD1(database);
    const user = await findUserById(db, 'user-rollback');
    assert.ok(user);
    const { accessToken } = await generateTokens(db, user, 'space');
    const linked = await issueMcpCredentials(db, user.id);
    const failingDb = {
      prepare(sql: string) {
        return db.prepare(
          sql.includes('UPDATE mcp_legacy_keys')
            ? sql.replace('UPDATE mcp_legacy_keys', 'UPDATE missing_mcp_legacy_keys')
            : sql
        );
      },
      batch(statements: D1PreparedStatement[]) {
        return db.batch(statements);
      }
    } as unknown as D1Database;

    globalThis.fetch = async () =>
      Response.json({ allowed: true, reason: 'allowed', service_tier: 'policy_os_core' });

    let loggedError = false;
    console.error = () => {
      loggedError = true;
    };
    const deletion = await identityWorker.fetch(
      new Request('https://id.createsomething.space/v1/users/me', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      }),
      { DB: failingDb, ENVIRONMENT: 'test', ALLOWED_ORIGINS: '' } as never
    );
    console.error = originalConsoleError;
    assert.equal(deletion.status, 500);
    assert.equal(loggedError, true);
    assert.equal((await findUserById(db, user.id))?.deleted_at, null);
    for (const token of Object.values(linked)) {
      assert.equal(
        (await resolveMcpCredential(db, token)).valid,
        true,
        `${token} must remain valid when deletion rolls back`
      );
    }
    assert.equal(
      await isOAuthRefreshFamilyActive(db, 'oauth-family-user-rollback', 'oauth-client', user.id),
      true
    );
    assert.equal(
      (await findRefreshTokenByHash(db, await hashToken(`refresh-${user.id}`)))?.revoked_at,
      null
    );
  } finally {
    console.error = originalConsoleError;
    globalThis.fetch = originalFetch;
    rmSync(directory, { recursive: true, force: true });
  }
});
