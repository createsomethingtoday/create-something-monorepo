import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

/**
 * Test double for D1, backed by an in-memory SQLite database.
 *
 * Tests run the real statements against the real migration, so a mistake in
 * the SQL (the rate-limit upsert in particular) fails a test instead of
 * reaching production. Covers the D1 calls the Creator API uses.
 */
export function createSqliteD1(...migrationFiles: URL[]): D1Database {
	const sqlite = new DatabaseSync(':memory:');
	for (const file of migrationFiles) {
		sqlite.exec(readFileSync(file, 'utf8'));
	}

	type Param = null | number | bigint | string;
	const result = (results: unknown[]) => ({ results, success: true, meta: {} });

	const statement = (sql: string, params: Param[] = []) => ({
		bind: (...next: Param[]) => statement(sql, next),
		all: async () => result(sqlite.prepare(sql).all(...params)),
		run: async () => result(sqlite.prepare(sql).all(...params)),
		first: async () => sqlite.prepare(sql).get(...params) ?? null
	});

	return {
		prepare: (sql: string) => statement(sql),
		batch: async (statements: { all: () => Promise<unknown> }[]) => {
			const results = [];
			for (const each of statements) results.push(await each.all());
			return results;
		}
	} as unknown as D1Database;
}

export const CREATOR_API_MIGRATION = new URL(
	'../../../../migrations/005_creator_api.sql',
	import.meta.url
);
