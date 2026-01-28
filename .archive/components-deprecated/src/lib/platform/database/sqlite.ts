/**
 * SQLite Adapter (better-sqlite3)
 *
 * Local database implementation matching D1's interface.
 * Uses better-sqlite3 for synchronous SQLite access.
 *
 * Note: This is a server-only module. Do not import in client code.
 * The tool recedes; SQLite works transparently like D1.
 */

import type { Database, PreparedStatement, QueryResult, RunResult } from '../types.js';

// ============================================================================
// Dynamic Import (avoids bundling in client)
// ============================================================================

// better-sqlite3 types
interface BetterSqliteDatabase {
	prepare(query: string): BetterSqliteStatement;
	exec(query: string): void;
	pragma(pragma: string): unknown;
	serialize(): Buffer;
	transaction<T>(fn: () => T): () => T;
}

interface BetterSqliteStatement {
	all(...values: unknown[]): unknown[];
	get(...values: unknown[]): unknown | undefined;
	run(...values: unknown[]): { changes: number; lastInsertRowid: number | bigint };
}

let BetterSqlite3: new (path: string) => BetterSqliteDatabase;

/**
 * Dynamically load better-sqlite3.
 * This allows the module to be optional - only loaded when local mode is used.
 */
async function loadSqlite(): Promise<new (path: string) => BetterSqliteDatabase> {
	if (!BetterSqlite3) {
		try {
			const module = await import('better-sqlite3');
			BetterSqlite3 = module.default;
		} catch {
			throw new Error(
				'better-sqlite3 is required for local mode. Install it with: pnpm add -D better-sqlite3'
			);
		}
	}
	return BetterSqlite3;
}

// ============================================================================
// SQLite Implementation
// ============================================================================

/**
 * Create a prepared statement wrapper for better-sqlite3.
 */
function createPreparedStatement(
	db: BetterSqliteDatabase,
	query: string
): PreparedStatement {
	let boundValues: unknown[] = [];

	const wrapper: PreparedStatement = {
		bind(...values: unknown[]): PreparedStatement {
			boundValues = values;
			return wrapper;
		},

		async all<T = unknown>(): Promise<QueryResult<T>> {
			const stmt = db.prepare(query);
			const results = stmt.all(...boundValues) as T[];
			return {
				results,
				success: true,
				meta: {}
			};
		},

		async first<T = unknown>(columnName?: string): Promise<T | null> {
			const stmt = db.prepare(query);
			const row = stmt.get(...boundValues) as Record<string, unknown> | undefined;
			if (!row) return null;
			if (columnName) return (row[columnName] as T) ?? null;
			return row as unknown as T;
		},

		async run(): Promise<RunResult> {
			const stmt = db.prepare(query);
			const info = stmt.run(...boundValues);
			return {
				success: true,
				meta: {
					changes: info.changes,
					last_row_id: Number(info.lastInsertRowid)
				}
			};
		}
	};

	return wrapper;
}

/**
 * Create a local SQLite database matching the D1 interface.
 *
 * @param dbPath - Path to SQLite database file
 * @returns Database interface compatible with getPlatform()
 */
export async function createLocalDatabase(dbPath: string): Promise<Database> {
	const DatabaseConstructor = await loadSqlite();
	const db = new DatabaseConstructor(dbPath);

	// Enable WAL mode for better concurrency
	db.pragma('journal_mode = WAL');

	return {
		prepare(query: string): PreparedStatement {
			return createPreparedStatement(db, query);
		},

		async batch(statements: PreparedStatement[]): Promise<QueryResult<unknown>[]> {
			const results: QueryResult<unknown>[] = [];

			// Run in a transaction for atomicity
			const transaction = db.transaction(() => {
				for (const stmt of statements) {
					try {
						// Execute the statement by calling run()
						// Note: batch typically uses run() semantics
						stmt.run().then((result) => {
							results.push({
								results: [],
								success: result.success,
								meta: result.meta
							});
						});
					} catch {
						results.push({
							results: [],
							success: false,
							meta: {}
						});
					}
				}
			});

			transaction();
			return results;
		},

		async exec(query: string): Promise<void> {
			db.exec(query);
		},

		async dump(): Promise<ArrayBuffer> {
			const buffer = db.serialize();
			// Create a proper ArrayBuffer from the serialized data
			const arrayBuffer = new ArrayBuffer(buffer.byteLength);
			new Uint8Array(arrayBuffer).set(buffer);
			return arrayBuffer;
		}
	};
}

// ============================================================================
// Path Helpers
// ============================================================================

/**
 * Find local D1 database file in wrangler state directory.
 *
 * Wrangler stores local D1 databases in:
 * .wrangler/state/v3/d1/miniflare-D1DatabaseObject/
 *
 * @param basePath - Base path to search (e.g., '.wrangler/state/v3/d1/miniflare-D1DatabaseObject')
 * @param databaseId - Optional specific database ID
 * @returns Path to SQLite file
 */
export async function findLocalD1Path(basePath: string, databaseId?: string): Promise<string> {
	const fs = await import('fs');
	const path = await import('path');

	// If specific database ID provided, use it
	if (databaseId) {
		const normalizedId = databaseId.replace(/-/g, '');
		const dbPath = path.join(basePath, `${normalizedId}.sqlite`);
		if (fs.existsSync(dbPath)) {
			return dbPath;
		}
	}

	// Otherwise, find any SQLite file in the directory
	if (fs.existsSync(basePath)) {
		const files = fs.readdirSync(basePath);
		const sqliteFile = files.find((f: string) => f.endsWith('.sqlite'));
		if (sqliteFile) {
			return path.join(basePath, sqliteFile);
		}
	}

	throw new Error(`No local D1 database found in ${basePath}. Run 'wrangler d1 migrations apply' first.`);
}
