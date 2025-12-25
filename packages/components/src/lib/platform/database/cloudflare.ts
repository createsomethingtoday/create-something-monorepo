/**
 * Cloudflare D1 Adapter
 *
 * Wraps the native D1 binding with our interface.
 * Essentially a passthrough since D1 already matches our interface.
 *
 * The tool recedes; D1 is used transparently.
 */

import type { Database, PreparedStatement, QueryResult, RunResult } from '../types.js';

// ============================================================================
// D1 Native Types (from Cloudflare)
// ============================================================================

interface D1Database {
	prepare(query: string): D1PreparedStatement;
	batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
	exec(query: string): Promise<D1ExecResult>;
	dump(): Promise<ArrayBuffer>;
}

interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement;
	all<T = unknown>(): Promise<D1Result<T>>;
	first<T = unknown>(columnName?: string): Promise<T | null>;
	run(): Promise<D1Result<unknown>>;
}

interface D1Result<T> {
	results?: T[];
	success: boolean;
	meta: Record<string, unknown>;
}

interface D1ExecResult {
	count: number;
	duration: number;
}

// ============================================================================
// Wrapper Implementation
// ============================================================================

/**
 * Wrap a D1 prepared statement with our interface.
 * Internal helper - not exported.
 */
function wrapStatement(d1Stmt: D1PreparedStatement): PreparedStatement {
	// We need to track the underlying D1 statement for batch operations
	const wrapper = {
		// Store reference for batch extraction
		__d1Statement: d1Stmt,

		bind(...values: unknown[]): PreparedStatement {
			return wrapStatement(d1Stmt.bind(...values));
		},

		async all<T = unknown>(): Promise<QueryResult<T>> {
			const result = await d1Stmt.all<T>();
			return {
				results: result.results ?? [],
				success: result.success,
				meta: result.meta as QueryResult<T>['meta']
			};
		},

		async first<T = unknown>(columnName?: string): Promise<T | null> {
			return d1Stmt.first<T>(columnName);
		},

		async run(): Promise<RunResult> {
			const result = await d1Stmt.run();
			return {
				success: result.success,
				meta: {
					changes: (result.meta as { changes?: number }).changes ?? 0,
					last_row_id: (result.meta as { last_row_id?: number }).last_row_id ?? 0,
					duration: (result.meta as { duration?: number }).duration
				}
			};
		}
	};

	return wrapper as PreparedStatement;
}

/**
 * Wrap D1 database with our platform-agnostic interface.
 *
 * @param d1 - Native Cloudflare D1 database binding
 * @returns Database interface that works with getPlatform()
 */
export function wrapD1(d1: D1Database): Database {
	return {
		prepare(query: string): PreparedStatement {
			return wrapStatement(d1.prepare(query));
		},

		async batch<T>(statements: PreparedStatement[]): Promise<QueryResult<T>[]> {
			// Extract underlying D1 statements
			const d1Statements = statements.map(
				(s) => (s as unknown as { __d1Statement: D1PreparedStatement }).__d1Statement
			);
			const results = await d1.batch<T>(d1Statements);
			return results.map((r) => ({
				results: r.results ?? [],
				success: r.success,
				meta: r.meta as QueryResult<T>['meta']
			}));
		},

		async exec(query: string): Promise<void> {
			await d1.exec(query);
		},

		async dump(): Promise<ArrayBuffer> {
			return d1.dump();
		}
	};
}

/**
 * Type guard to check if an object is a D1 database.
 */
export function isD1Database(obj: unknown): obj is D1Database {
	return (
		obj !== null &&
		typeof obj === 'object' &&
		'prepare' in obj &&
		typeof (obj as D1Database).prepare === 'function'
	);
}
