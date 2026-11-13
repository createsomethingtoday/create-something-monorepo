import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

/** Offline SQLite implementation of the D1 calls used by the service.
 * Each batch is a real transaction, including statement failure rollback.
 */
export function createTestDatabase(options: {legacy?:boolean} = {}) {
	const sqlite = new DatabaseSync(':memory:');
	sqlite.exec(readFileSync(new URL('../migrations/0001_inbox.sql', import.meta.url), 'utf8'));
	if(!options.legacy) {
		sqlite.exec('BEGIN IMMEDIATE');
		try { for(const name of ['0002_delivery_auth.sql','0003_subscription_replay.sql','0004_owner_conversations.sql','0005_shared_context.sql','0006_refresh_fencing.sql'])sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url),'utf8'));sqlite.exec('COMMIT'); }
		catch(error) { sqlite.exec('ROLLBACK');throw error; }
	}
	let beforeBatch: (() => void) | undefined;
	class Statement {
		constructor(readonly sql: string, readonly values: unknown[] = []) {}
		bind(...values: unknown[]) { return new Statement(this.sql, values); }
		execute() {
			const statement = sqlite.prepare(this.sql);
			const results = statement.all(...this.values as (string | number | null)[]);
			return { success: true, results, meta: { changes: Number(sqlite.prepare('SELECT changes() AS n').get()!.n) } };
		}
		async all() { return this.execute(); }
		async run() { return this.execute(); }
		async first(column?: string) {
			const row = this.execute().results[0];
			return column ? row?.[column] ?? null : row ?? null;
		}
	}
	const db = {
		prepare(sql: string) { return new Statement(sql); },
		async batch(statements: Statement[]) {
			const hook = beforeBatch;
			beforeBatch = undefined;
			hook?.();
			sqlite.exec('BEGIN IMMEDIATE');
			try {
				const result = statements.map(statement => statement.execute());
				sqlite.exec('COMMIT');
				return result;
			} catch (cause) {
				sqlite.exec('ROLLBACK');
				throw cause;
			}
		}
	} as unknown as D1Database;
	return { db, sqlite, beforeNextBatch(hook: () => void) { beforeBatch = hook; }, close() { sqlite.close(); } };
}
