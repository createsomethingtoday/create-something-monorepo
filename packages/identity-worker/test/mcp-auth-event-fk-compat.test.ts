import assert from 'node:assert/strict';
import test from 'node:test';

import { createMcpAuthEvent } from '../src/db/queries.ts';

class FakeStatement {
	constructor(
		private readonly db: FakeD1Database,
		private readonly sql: string,
	) {}

	bind(...values: unknown[]) {
		return {
			run: async () => this.db.run(this.sql, values),
		};
	}
}

class FakeD1Database {
	public readonly runs: Array<{ sql: string; values: unknown[] }> = [];

	prepare(sql: string) {
		return new FakeStatement(this, sql);
	}

	async run(sql: string, values: unknown[]): Promise<{ meta: { changes: number } }> {
		this.runs.push({ sql, values });
		if (values[2] === 'auth0|missing-user') {
			throw new Error('FOREIGN KEY constraint failed: SQLITE_CONSTRAINT_FOREIGNKEY');
		}
		return { meta: { changes: 1 } };
	}
}

test('createMcpAuthEvent retries with a null user_id when the user foreign key is missing', async () => {
	const rawDb = new FakeD1Database();
	const db = rawDb as unknown as D1Database;

	await createMcpAuthEvent(db, {
		id: 'evt_123',
		session_id: null,
		user_id: 'auth0|missing-user',
		event_type: 'mcp_long_lived_token_resolved',
		event_data_json: '{}',
	});

	assert.equal(rawDb.runs.length, 2);
	assert.equal(rawDb.runs[0]?.values[2], 'auth0|missing-user');
	assert.equal(rawDb.runs[1]?.values[2], null);
});
