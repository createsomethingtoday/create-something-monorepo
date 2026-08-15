import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import identityWorker from '../../identity-worker/src/index.ts';
import { POST as checkEntitlement } from '../src/routes/api/internal/mcp-entitlements/check/+server.ts';

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

  private boundSql(): string {
    return bindSql(this.sql, this.values);
  }

  async run() {
    execFileSync('sqlite3', ['-bail', this.database], {
      input: `PRAGMA foreign_keys=ON; ${this.boundSql()};`,
      encoding: 'utf8'
    });
    return { success: true, meta: { changes: 1 } };
  }

  async first<T>() {
    const output = execFileSync('sqlite3', ['-json', this.database], {
      input: `PRAGMA foreign_keys=ON; ${this.boundSql()};`,
      encoding: 'utf8'
    }).trim();
    const rows = output ? (JSON.parse(output) as T[]) : [];
    return rows[0] ?? null;
  }

  async all<T>() {
    const output = execFileSync('sqlite3', ['-json', this.database], {
      input: `PRAGMA foreign_keys=ON; ${this.boundSql()};`,
      encoding: 'utf8'
    }).trim();
    return { success: true, results: output ? (JSON.parse(output) as T[]) : [], meta: {} };
  }
}

function createSqliteD1(database: string): D1Database {
  return {
    prepare(sql: string) {
      return new SqliteD1Statement(database, sql) as unknown as D1PreparedStatement;
    }
  } as unknown as D1Database;
}

function applyMigrations(database: string): void {
  for (const migration of [
    '0010_partner_auth_hub_onboarding.sql',
    '0014_agency_mcp_entitlements.sql',
    '0015_agency_commercial_state.sql',
    '0016_agency_contract_state.sql',
    '0017_agency_identity_seeds.sql',
    '0019_partner_access_lanes.sql'
  ]) {
    execFileSync('sqlite3', ['-bail', database], {
      input: `PRAGMA foreign_keys=ON; ${readFileSync(new URL(migration, migrationRoot), 'utf8')}`,
      encoding: 'utf8'
    });
  }
}

test('internal entitlement check clears stale allow state when all authority disappears', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'agency-entitlement-authority-loss-'));
  const database = join(directory, 'test.sqlite');
  try {
    applyMigrations(database);
    execFileSync('sqlite3', ['-bail', database], {
      input: `INSERT INTO agency_mcp_entitlements (
				auth_subject, auth_email, account_id, tenant_id, workspace_account_id, service_tier,
				managed_bearer_allowed, org_membership_active, service_entitled, policy_accepted,
				contract_active, billing_active, metadata_json
			) VALUES (
				'user_stale', 'stale@example.com', 'acct_stale', 'tenant_stale', 'workspace_stale', 'policy_os_core',
				1, 1, 1, 1, 1, 1, '{"manual_override":false,"source":"partner_auth_client"}'
			);`,
      encoding: 'utf8'
    });

    const response = await checkEntitlement({
      request: new Request('https://createsomething.agency/api/internal/mcp-entitlements/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test-internal-key' },
        body: JSON.stringify({
          auth_subject: 'user_stale',
          auth_email: 'stale@example.com',
          account_id: 'acct_stale',
          tenant_id: 'tenant_stale'
        })
      }),
      platform: {
        env: {
          DB: createSqliteD1(database),
          AGENCY_INTERNAL_API_KEY: 'test-internal-key'
        }
      }
    } as never);
    const body = (await response.json()) as {
      allowed: boolean;
      reason: string;
      checks: Record<string, boolean>;
    };

    assert.equal(response.status, 200);
    assert.equal(body.allowed, false);
    assert.equal(body.reason, 'entitlement_source_unavailable');
    assert.deepEqual(body.checks, {
      managed_bearer_allowed: false,
      org_membership_active: false,
      service_entitled: false,
      policy_accepted: false,
      contract_active: false,
      billing_active: false
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('internal entitlement check denies stale allow state when partner authority storage is unavailable', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'agency-entitlement-authority-unavailable-'));
  const database = join(directory, 'test.sqlite');
  try {
    applyMigrations(database);
    execFileSync('sqlite3', ['-bail', database], {
      input: `INSERT INTO agency_mcp_entitlements (
				auth_subject, auth_email, account_id, tenant_id, workspace_account_id, service_tier,
				managed_bearer_allowed, org_membership_active, service_entitled, policy_accepted,
				contract_active, billing_active, metadata_json
			) VALUES (
				'user_unavailable', 'unavailable@example.com', 'acct_unavailable', 'tenant_unavailable',
				'workspace_unavailable', 'policy_os_core', 1, 1, 1, 1, 1, 1,
				'{"manual_override":false,"source":"partner_auth_client"}'
			);
			INSERT INTO agency_contract_state (
				id, auth_subject, normalized_email, account_id, tenant_id, contract_reference,
				contract_status, contract_active, service_entitled, policy_accepted
			) VALUES (
				'contract_unavailable', 'user_unavailable', 'unavailable@example.com',
				'acct_unavailable', 'tenant_unavailable', 'contract-unavailable-current',
				'active', 1, 1, 1
			);
			INSERT INTO agency_commercial_accounts (
				id, normalized_email, stripe_customer_id, stripe_subscription_id, product_id,
				service_tier, subscription_status, contract_active, billing_active
			) VALUES (
				'commercial_unavailable', 'unavailable@example.com', 'cus_unavailable',
				'sub_unavailable', 'prod_unavailable', 'policy_os_core', 'active', 1, 1
			);`,
      encoding: 'utf8'
    });

    const baseDb = createSqliteD1(database);
    const db = {
      prepare(sql: string) {
        if (sql.includes('FROM partner_auth_access_lanes')) {
          return {
            bind() {
              return this;
            },
            async first() {
              throw new Error('D1_ERROR: no such table: partner_auth_access_lanes');
            }
          };
        }
        return baseDb.prepare(sql);
      }
    } as unknown as D1Database;

    const response = await checkEntitlement({
      request: new Request('https://createsomething.agency/api/internal/mcp-entitlements/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test-internal-key' },
        body: JSON.stringify({
          auth_subject: 'user_unavailable',
          auth_email: 'unavailable@example.com',
          account_id: 'acct_unavailable',
          tenant_id: 'tenant_unavailable'
        })
      }),
      platform: { env: { DB: db, AGENCY_INTERNAL_API_KEY: 'test-internal-key' } }
    } as never);
    const body = (await response.json()) as {
      allowed: boolean;
      reason: string;
      checks: Record<string, boolean>;
    };

    assert.equal(response.status, 200);
    assert.equal(body.allowed, false);
    assert.equal(body.reason, 'entitlement_source_unavailable');
    assert.ok(Object.values(body.checks).every((value) => value === false));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('internal entitlement check preserves an explicitly identified manual authority', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'agency-entitlement-manual-authority-'));
  const database = join(directory, 'test.sqlite');
  try {
    applyMigrations(database);
    execFileSync('sqlite3', ['-bail', database], {
      input: `INSERT INTO agency_mcp_entitlements (
				auth_subject, auth_email, account_id, tenant_id, workspace_account_id, service_tier,
				managed_bearer_allowed, org_membership_active, service_entitled, policy_accepted,
				contract_active, billing_active, metadata_json
			) VALUES (
				'user_manual', 'manual@example.com', 'acct_manual', 'tenant_manual', 'workspace_manual',
				'policy_os_core', 1, 1, 1, 1, 1, 1,
				'{"manual_override":true,"authority_source":"manual_override"}'
			);`,
      encoding: 'utf8'
    });

    const response = await checkEntitlement({
      request: new Request('https://createsomething.agency/api/internal/mcp-entitlements/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test-internal-key' },
        body: JSON.stringify({
          auth_subject: 'user_manual',
          auth_email: 'manual@example.com',
          account_id: 'acct_manual',
          tenant_id: 'tenant_manual'
        })
      }),
      platform: {
        env: { DB: createSqliteD1(database), AGENCY_INTERNAL_API_KEY: 'test-internal-key' }
      }
    } as never);
    const body = (await response.json()) as { allowed: boolean; reason: string };

    assert.equal(response.status, 200);
    assert.equal(body.allowed, true);
    assert.equal(body.reason, 'allowed');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('manual override flag without trusted manual authority provenance fails closed', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'agency-entitlement-untrusted-manual-'));
  const database = join(directory, 'test.sqlite');
  try {
    applyMigrations(database);
    execFileSync('sqlite3', ['-bail', database], {
      input: `INSERT INTO agency_mcp_entitlements (
				auth_subject, auth_email, account_id, tenant_id, workspace_account_id, service_tier,
				managed_bearer_allowed, org_membership_active, service_entitled, policy_accepted,
				contract_active, billing_active, metadata_json
			) VALUES (
				'user_untrusted_manual', 'untrusted-manual@example.com', 'acct_untrusted_manual',
				'tenant_untrusted_manual', 'workspace_untrusted_manual', 'policy_os_core',
				1, 1, 1, 1, 1, 1, '{"manual_override":true,"source":"identity_seed"}'
			);`,
      encoding: 'utf8'
    });

    const response = await checkEntitlement({
      request: new Request('https://createsomething.agency/api/internal/mcp-entitlements/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test-internal-key' },
        body: JSON.stringify({
          auth_subject: 'user_untrusted_manual',
          auth_email: 'untrusted-manual@example.com',
          account_id: 'acct_untrusted_manual',
          tenant_id: 'tenant_untrusted_manual'
        })
      }),
      platform: {
        env: { DB: createSqliteD1(database), AGENCY_INTERNAL_API_KEY: 'test-internal-key' }
      }
    } as never);
    const body = (await response.json()) as { allowed: boolean; reason: string };

    assert.equal(response.status, 200);
    assert.equal(body.allowed, false);
    assert.equal(body.reason, 'entitlement_source_unavailable');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('current contract authority cannot borrow a stale commercial allow flag', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'agency-entitlement-partial-authority-'));
  const database = join(directory, 'test.sqlite');
  try {
    applyMigrations(database);
    execFileSync('sqlite3', ['-bail', database], {
      input: `INSERT INTO agency_mcp_entitlements (
				auth_subject, auth_email, account_id, tenant_id, workspace_account_id, service_tier,
				managed_bearer_allowed, org_membership_active, service_entitled, policy_accepted,
				contract_active, billing_active, metadata_json
			) VALUES (
				'user_contract_only', 'contract@example.com', 'acct_contract', 'tenant_contract',
				'workspace_contract', 'policy_os_core', 1, 1, 1, 1, 1, 1,
				'{"manual_override":false,"source":"partner_auth_client"}'
			);
			INSERT INTO agency_contract_state (
				id, auth_subject, normalized_email, account_id, tenant_id, contract_reference,
				contract_status, contract_active, service_entitled, policy_accepted
			) VALUES (
				'contract_only', 'user_contract_only', 'contract@example.com', 'acct_contract',
				'tenant_contract', 'contract-only-current', 'active', 1, 1, 1
			);`,
      encoding: 'utf8'
    });

    const response = await checkEntitlement({
      request: new Request('https://createsomething.agency/api/internal/mcp-entitlements/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test-internal-key' },
        body: JSON.stringify({
          auth_subject: 'user_contract_only',
          auth_email: 'contract@example.com',
          account_id: 'acct_contract',
          tenant_id: 'tenant_contract'
        })
      }),
      platform: {
        env: { DB: createSqliteD1(database), AGENCY_INTERNAL_API_KEY: 'test-internal-key' }
      }
    } as never);
    const body = (await response.json()) as {
      allowed: boolean;
      reason: string;
      checks: Record<string, boolean>;
    };

    assert.equal(response.status, 200);
    assert.equal(body.allowed, false);
    assert.equal(body.reason, 'billing_inactive');
    assert.equal(body.checks.managed_bearer_allowed, false);
    assert.equal(body.checks.billing_active, false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

function createIdentityResolverDb(mode: 'session' | 'managed_bearer'): D1Database {
  const session = {
    id: 'ms_authority_loss',
    user_id: 'user_transition',
    tenant_id: 'tenant_transition',
    account_id: 'acct_transition',
    host: 'mcp.createsomething.agency',
    bound_host: null,
    tool_mode: 'read_write',
    toolkit_profile_json: JSON.stringify(['webflow']),
    allowed_tool_prefixes_json: JSON.stringify(['webflow_']),
    token_hash: 'fixture',
    expires_at: '2999-01-01T00:00:00.000Z',
    revoked_at: null,
    created_at: '2026-08-15T00:00:00.000Z',
    updated_at: '2026-08-15T00:00:00.000Z'
  };
  const managedBearer = {
    id: 'mb_authority_loss',
    auth_subject: 'user_transition',
    auth_email: 'transition@example.com',
    tenant_id: 'tenant_transition',
    account_id: 'acct_transition',
    bound_host: null,
    tool_mode: 'read_write',
    toolkit_profile_json: JSON.stringify(['webflow']),
    allowed_tool_prefixes_json: JSON.stringify(['webflow_']),
    token_hash: 'fixture',
    token_prefix: 'mb_fixture',
    issued_by: 'operator',
    metadata_json: '{}',
    last_used_at: null,
    revoked_at: null,
    created_at: '2026-08-15T00:00:00.000Z',
    updated_at: '2026-08-15T00:00:00.000Z'
  };

  return {
    prepare(sql: string) {
      return {
        bind() {
          return this;
        },
        async first() {
          if (sql.includes('FROM mcp_sessions')) return mode === 'session' ? session : null;
          if (sql.includes('FROM mcp_legacy_keys')) return null;
          if (sql.includes('FROM mcp_long_lived_tokens')) {
            return mode === 'managed_bearer' ? managedBearer : null;
          }
          return null;
        },
        async run() {
          return { success: true, meta: { changes: 1 } };
        }
      };
    }
  } as unknown as D1Database;
}

test('Identity session and managed bearer resolution deny after Agency authority is removed', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'agency-entitlement-resolver-boundary-'));
  const database = join(directory, 'test.sqlite');
  const originalFetch = globalThis.fetch;
  try {
    applyMigrations(database);
    execFileSync('sqlite3', ['-bail', database], {
      input: `PRAGMA foreign_keys=ON;
			INSERT INTO partner_auth_clients (
				id, partner_key, slug, workspace_account_id, identity_account_id,
				identity_user_id, identity_tenant_id, owner_email, status
			) VALUES (
				'client_transition', 'half-dozen', 'transition', 'workspace_transition',
				'acct_transition', 'user_transition', 'tenant_transition', 'transition@example.com', 'active'
			);
			INSERT INTO partner_auth_consents (
				id, partner_client_id, consent_granted_by, granted_at
			) VALUES ('consent_transition', 'client_transition', 'user_transition', datetime('now'));
			INSERT INTO agency_mcp_entitlements (
				auth_subject, auth_email, account_id, tenant_id, workspace_account_id, service_tier,
				managed_bearer_allowed, org_membership_active, service_entitled, policy_accepted,
				contract_active, billing_active, metadata_json
			) VALUES (
				'user_transition', 'transition@example.com', 'acct_transition', 'tenant_transition',
				'workspace_transition', 'policy_os_core', 1, 1, 1, 1, 1, 1,
				'{"manual_override":false,"source":"partner_auth_client"}'
			);`,
      encoding: 'utf8'
    });
    const agencyDb = createSqliteD1(database);
    const agencyRequestBody = {
      auth_subject: 'user_transition',
      auth_email: 'transition@example.com',
      account_id: 'acct_transition',
      tenant_id: 'tenant_transition'
    };
    const initialResponse = await checkEntitlement({
      request: new Request('https://createsomething.agency/api/internal/mcp-entitlements/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test-internal-key' },
        body: JSON.stringify(agencyRequestBody)
      }),
      platform: { env: { DB: agencyDb, AGENCY_INTERNAL_API_KEY: 'test-internal-key' } }
    } as never);
    assert.equal(((await initialResponse.json()) as { allowed: boolean }).allowed, true);

    execFileSync('sqlite3', ['-bail', database], {
      input: `PRAGMA foreign_keys=ON; DELETE FROM partner_auth_clients WHERE id = 'client_transition';`,
      encoding: 'utf8'
    });

    globalThis.fetch = async (input, init) => {
      const request = new Request(input, init);
      if (request.url === 'https://createsomething.agency/api/internal/mcp-entitlements/check') {
        return checkEntitlement({
          request,
          platform: { env: { DB: agencyDb, AGENCY_INTERNAL_API_KEY: 'test-internal-key' } }
        } as never);
      }
      return originalFetch(input, init);
    };

    for (const mode of ['session', 'managed_bearer'] as const) {
      const response = await identityWorker.fetch(
        new Request('https://id.createsomething.space/v1/mcp/sessions/resolve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Resolve-Token': 'resolve-secret'
          },
          body: JSON.stringify({ token: `${mode}-fixture` })
        }),
        {
          DB: createIdentityResolverDb(mode),
          ENVIRONMENT: 'test',
          ALLOWED_ORIGINS: '',
          MCP_SESSION_RESOLVE_TOKEN: 'resolve-secret',
          AGENCY_INTERNAL_API_URL: 'https://createsomething.agency',
          AGENCY_INTERNAL_API_KEY: 'test-internal-key'
        } as never
      );
      const body = (await response.json()) as { valid: boolean; reason: string };
      assert.equal(response.status, 200);
      assert.equal(body.valid, false, `${mode} resolution must deny after authority loss`);
      assert.equal(body.reason, 'entitlement_source_unavailable');
    }
  } finally {
    globalThis.fetch = originalFetch;
    rmSync(directory, { recursive: true, force: true });
  }
});
