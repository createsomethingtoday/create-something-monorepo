import assert from 'node:assert/strict';
import test from 'node:test';

import {
	findAgencyMcpEntitlementByAuthSubject,
	reconcileAgencyMcpEntitlement,
} from '../src/lib/server/mcp-entitlements.ts';

type TableName = 'agency_mcp_entitlements' | 'agency_contract_state' | 'agency_identity_seeds';

class FakeStatement {
	constructor(
		private readonly db: FakeD1Database,
		private readonly sql: string
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
}

class FakeD1Database {
	public readonly queries: Array<{ sql: string; values: unknown[] }> = [];

	private readonly entitlementRow = {
		identity_subject: 'auth0|reviewer',
		auth_email: null,
		account_id: 'acct_wf_mariana',
		tenant_id: 'tenant_webflow_marketplace',
		workspace_account_id: 'acct_wf_mariana',
		service_tier: 'policy_os_trial',
		managed_bearer_allowed: 1,
		org_membership_active: 1,
		service_entitled: 1,
		policy_accepted: 1,
		contract_active: 1,
		billing_active: 1,
		denial_reason: null,
		metadata_json: '{}',
		created_at: '2026-04-14 00:00:00',
		updated_at: '2026-04-14 00:00:00',
	};

	prepare(sql: string) {
		return new FakeStatement(this, sql);
	}

	async all<T>(sql: string): Promise<{ results: T[] }> {
		const table = /PRAGMA table_info\(([^)]+)\)/.exec(sql)?.[1] as TableName | undefined;
		if (!table) {
			return { results: [] };
		}

		const columns =
			table === 'agency_identity_seeds'
				? []
				: [{ name: 'identity_subject' }] as Array<{ name: string }>;
		return { results: columns as T[] };
	}

	async first<T>(sql: string, values: unknown[]): Promise<T | null> {
		this.queries.push({ sql, values });
		if (sql.includes('FROM agency_mcp_entitlements')) {
			return this.entitlementRow as T;
		}
		return null;
	}

	async run(sql: string, values: unknown[]): Promise<{ meta: { changes: number } }> {
		this.queries.push({ sql, values });
		return { meta: { changes: 1 } };
	}
}

test('findAgencyMcpEntitlementByAuthSubject reads legacy identity_subject rows', async () => {
	const rawDb = new FakeD1Database();
	const db = rawDb as unknown as D1Database;

	const row = await findAgencyMcpEntitlementByAuthSubject(db, 'auth0|reviewer');

	assert.ok(row);
	assert.equal(row.auth_subject, 'auth0|reviewer');
	assert.match(rawDb.queries[0]?.sql ?? '', /WHERE identity_subject = \?/);
});

test('reconcileAgencyMcpEntitlement updates legacy identity_subject rows', async () => {
	const rawDb = new FakeD1Database();
	const db = rawDb as unknown as D1Database;

	const row = await reconcileAgencyMcpEntitlement(db, {
		authSubject: 'auth0|reviewer',
		authEmail: null,
		accountId: 'acct_wf_mariana',
		tenantId: 'tenant_webflow_marketplace',
	});

	assert.ok(row);
	assert.equal(row.auth_subject, 'auth0|reviewer');
	assert.ok(
		rawDb.queries.some(
			(query) =>
				query.sql.includes('FROM agency_contract_state') && query.sql.includes('identity_subject')
		)
	);
	assert.ok(
		rawDb.queries.some(
			(query) =>
				query.sql.includes('UPDATE agency_mcp_entitlements') &&
				query.sql.includes('WHERE identity_subject = ?')
		)
	);
});
