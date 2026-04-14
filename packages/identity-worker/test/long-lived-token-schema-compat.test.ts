import assert from 'node:assert/strict';
import test from 'node:test';

import {
	findMcpLongLivedTokenByAuthSubject,
	findMcpLongLivedTokenById,
	findMcpLongLivedTokenByTokenHash,
	upsertMcpLongLivedToken,
} from '../src/db/queries.ts';

type ColumnName = 'auth_subject' | 'identity_subject';

class FakeStatement {
  constructor(
    private readonly db: FakeD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    return {
      all: async <T>() => this.db.all<T>(this.sql),
      first: async <T>() => this.db.first<T>(this.sql, values),
      run: async () => this.db.run(this.sql, values),
    };
  }

  all<T>() {
    return this.db.all<T>(this.sql);
  }

  first<T>() {
    return this.db.first<T>(this.sql, []);
  }

  run() {
    return this.db.run(this.sql, []);
  }
}

class FakeD1Database {
  public readonly queries: Array<{ sql: string; values: unknown[] }> = [];

  constructor(
    private readonly columnName: ColumnName,
    private readonly row: Record<string, unknown>,
  ) {}

  prepare(sql: string) {
    return new FakeStatement(this, sql);
  }

  async all<T>(_sql: string): Promise<{ results: T[] }> {
    return {
      results: [{ name: this.columnName } as T],
    };
  }

  async first<T>(sql: string, values: unknown[]): Promise<T | null> {
    this.queries.push({ sql, values });
    if (sql.includes('FROM mcp_long_lived_tokens')) {
      return this.row as T;
    }
    return null;
  }

  async run(sql: string, values: unknown[]): Promise<{ meta: { changes: number } }> {
    this.queries.push({ sql, values });
    return { meta: { changes: 1 } };
  }
}

function makeRow(columnName: ColumnName) {
  return {
    id: 'mlt_123',
    [columnName]: 'auth0|reviewer',
    auth_email: 'reviewer@example.com',
    tenant_id: 'tenant_webflow_marketplace',
    account_id: 'acct_wf_mariana',
    bound_host: 'wf-template-review-mariana',
    tool_mode: 'read_write',
    toolkit_profile_json: '[]',
    allowed_tool_prefixes_json: '[]',
    token_hash: 'hash',
    token_prefix: 'prefix',
    issued_by: 'operator',
    metadata_json: '{}',
    last_used_at: null,
    revoked_at: null,
    created_at: '2026-04-14 00:00:00',
    updated_at: '2026-04-14 00:00:00',
  };
}

test('findMcpLongLivedTokenByTokenHash normalizes legacy identity_subject rows', async () => {
  const db = new FakeD1Database('identity_subject', makeRow('identity_subject')) as unknown as D1Database;

  const token = await findMcpLongLivedTokenByTokenHash(db, 'hash');

  assert.ok(token);
  assert.equal(token.auth_subject, 'auth0|reviewer');
});

test('findMcpLongLivedTokenById normalizes legacy identity_subject rows', async () => {
  const db = new FakeD1Database('identity_subject', makeRow('identity_subject')) as unknown as D1Database;

  const token = await findMcpLongLivedTokenById(db, 'mlt_123');

  assert.ok(token);
  assert.equal(token.auth_subject, 'auth0|reviewer');
});

test('findMcpLongLivedTokenByAuthSubject uses the detected legacy subject column', async () => {
  const rawDb = new FakeD1Database('identity_subject', makeRow('identity_subject'));
  const db = rawDb as unknown as D1Database;

  const token = await findMcpLongLivedTokenByAuthSubject(db, 'auth0|reviewer');

  assert.ok(token);
  assert.equal(token.auth_subject, 'auth0|reviewer');
  assert.match(rawDb.queries[0]?.sql ?? '', /WHERE identity_subject = \?/);
});

test('upsertMcpLongLivedToken writes against the detected legacy subject column', async () => {
  const rawDb = new FakeD1Database('identity_subject', makeRow('identity_subject'));
  const db = rawDb as unknown as D1Database;

  await upsertMcpLongLivedToken(db, {
    id: 'mlt_123',
    auth_subject: 'auth0|reviewer',
    auth_email: 'reviewer@example.com',
    tenant_id: 'tenant_webflow_marketplace',
    account_id: 'acct_wf_mariana',
    bound_host: 'wf-template-review-mariana',
    tool_mode: 'read_write',
    toolkit_profile_json: '[]',
    allowed_tool_prefixes_json: '[]',
    token_hash: 'hash',
    token_prefix: 'prefix',
    issued_by: 'operator',
    metadata_json: '{}',
  });

  assert.match(rawDb.queries[0]?.sql ?? '', /identity_subject/);
  assert.deepEqual(rawDb.queries[0]?.values?.slice(0, 2), ['mlt_123', 'auth0|reviewer']);
});
