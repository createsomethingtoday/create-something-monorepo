/**
 * Minimal D1 shim over node:sqlite so tests run the real migrations and SQL.
 * Covers only the D1 surface this worker uses (prepare/bind/all/first/run/batch).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), '../migrations');

export function createTestDb(): D1Database {
	const sqlite = new DatabaseSync(':memory:');
	sqlite.exec('PRAGMA foreign_keys = ON');
	for (const file of readdirSync(MIGRATIONS).filter((name) => name.endsWith('.sql')).sort()) {
		sqlite.exec(readFileSync(join(MIGRATIONS, file), 'utf8'));
	}

	const prepare = (sql: string, params: unknown[] = []) => {
		const statement = {
			bind: (...values: unknown[]) => prepare(sql, values),
			async all() {
				return { results: sqlite.prepare(sql).all(...(params as never[])), success: true, meta: {} };
			},
			async first() {
				return sqlite.prepare(sql).get(...(params as never[])) ?? null;
			},
			async run() {
				const info = sqlite.prepare(sql).run(...(params as never[]));
				return { results: [], success: true, meta: { changes: Number(info.changes) } };
			}
		};
		return statement;
	};

	// D1 runs a batch as one transaction, in order.
	const batch = async (statements: Array<{ run(): Promise<unknown> }>) => {
		sqlite.exec('BEGIN');
		try {
			const results = [];
			for (const statement of statements) results.push(await statement.run());
			sqlite.exec('COMMIT');
			return results;
		} catch (error) {
			sqlite.exec('ROLLBACK');
			throw error;
		}
	};

	return { prepare, batch } as unknown as D1Database;
}
