import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const migrationRoot = new URL('../migrations/', import.meta.url);

function sqlite(database: string, sql: string): string {
	return execFileSync('sqlite3', [database], { input: sql, encoding: 'utf8' }).trim();
}

test('handoff resolution migration makes terminal decisions audited and immutable', () => {
	const directory = mkdtempSync(join(tmpdir(), 'customer-map-handoff-'));
	const database = join(directory, 'test.sqlite');
	try {
		const base = readFileSync(new URL('0035_customer_map_workspaces.sql', migrationRoot), 'utf8');
		const resolution = readFileSync(new URL('0037_customer_map_handoff_resolution.sql', migrationRoot), 'utf8');
		sqlite(database, `${base}\n${resolution}`);
		const columns = sqlite(database, "SELECT name FROM pragma_table_info('customer_map_handoffs') ORDER BY cid;");
		assert.match(columns, /resolved_at/);
		assert.match(columns, /resolved_by/);
		assert.match(columns, /resolution_note/);

		sqlite(
			database,
			`INSERT INTO customer_maps
			 (id, title, account_id, tenant_id, workspace_account_id, created_by, current_version, review_state, created_at, updated_at)
			 VALUES ('map_1', 'Pinned map', 'acct_a', 'tenant_a', 'workspace_a', 'identity|alice', 1, 'approved', '2026-07-17T00:00:00.000Z', '2026-07-17T00:00:00.000Z');
			 INSERT INTO customer_map_handoffs
			 (id, map_id, account_id, map_version, status, payload_json, created_by, created_at)
			 VALUES ('handoff_1', 'map_1', 'acct_a', 1, 'prepared', '{"schema":"create-something/map-to-build-handoff@1"}', 'identity|alice', '2026-07-17T00:00:00.000Z');`
		);

		assert.throws(
			() => sqlite(database, "UPDATE customer_map_handoffs SET status = 'accepted' WHERE id = 'handoff_1';"),
			/resolution facts/i
		);
		assert.throws(
			() => sqlite(database, "UPDATE customer_map_handoffs SET resolved_by = 'identity|alice' WHERE id = 'handoff_1';"),
			/prepared handoff/i
		);
		assert.throws(
			() => sqlite(database, `INSERT INTO customer_map_handoffs
			 (id, map_id, account_id, map_version, status, payload_json, created_by, created_at)
			 VALUES ('handoff_2', 'map_1', 'acct_a', 1, 'accepted', '{}', 'identity|alice', '2026-07-17T00:00:00.000Z');`),
			/resolution facts/i
		);
		sqlite(
			database,
			`UPDATE customer_map_handoffs
			 SET status = 'cancelled', resolved_at = '2026-07-18T00:00:00.000Z', resolved_by = 'identity|alice', resolution_note = 'Timing changed'
			 WHERE id = 'handoff_1';`
		);
		assert.equal(
			sqlite(database, "SELECT status || '|' || resolved_by || '|' || resolution_note FROM customer_map_handoffs WHERE id = 'handoff_1';"),
			'cancelled|identity|alice|Timing changed'
		);
		assert.throws(
			() => sqlite(database, "UPDATE customer_map_handoffs SET status = 'accepted' WHERE id = 'handoff_1';"),
			/terminal/i
		);
		assert.throws(
			() => sqlite(database, "UPDATE customer_map_handoffs SET payload_json = '{}' WHERE id = 'handoff_1';"),
			/immutable/i
		);
		assert.throws(
			() => sqlite(database, "UPDATE customer_map_handoffs SET resolved_by = 'identity|mallory' WHERE id = 'handoff_1';"),
			/immutable/i
		);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});
