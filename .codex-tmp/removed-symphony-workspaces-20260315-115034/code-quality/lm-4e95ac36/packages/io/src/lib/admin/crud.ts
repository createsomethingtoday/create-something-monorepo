/**
 * Admin CRUD Utilities
 *
 * Shared utilities for admin API endpoints to eliminate duplicate code.
 */

import { json } from '@sveltejs/kit';

/**
 * D1 Database interface (Cloudflare)
 */
interface D1Database {
	prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement;
	run(): Promise<D1Result>;
	first<T>(): Promise<T | null>;
	all<T>(): Promise<{ results: T[] }>;
}

interface D1Result {
	success: boolean;
	meta?: unknown;
}

/**
 * Admin delete operation options
 */
export interface AdminDeleteOptions {
	/** Database instance */
	db: D1Database;
	/** Request body containing the ID */
	body: { id?: string | number };
	/** Table name to delete from */
	table: string;
	/** Entity name for error messages (e.g., "experiment", "submission") */
	entityName: string;
}

/**
 * Perform an admin delete operation
 *
 * @example
 * const { id } = await request.json();
 * return adminDelete({
 *   db,
 *   body: { id },
 *   table: 'papers',
 *   entityName: 'experiment'
 * });
 */
export async function adminDelete(options: AdminDeleteOptions) {
	const { db, body, table, entityName } = options;

	if (!body.id) {
		return json({ error: `${capitalize(entityName)} ID required` }, { status: 400 });
	}

	try {
		await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(body.id).run();
		return json({ success: true });
	} catch (error) {
		console.error(`Failed to delete ${entityName}:`, error);
		return json({ error: `Failed to delete ${entityName}` }, { status: 500 });
	}
}

/**
 * Admin list operation options
 */
export interface AdminListOptions {
	/** Database instance */
	db: D1Database;
	/** Table name to query */
	table: string;
	/** Columns to select (default: '*') */
	columns?: string;
	/** Order by clause (default: 'created_at DESC') */
	orderBy?: string;
	/** Limit (default: 100) */
	limit?: number;
	/** Entity name for error messages */
	entityName: string;
}

/**
 * Perform an admin list operation
 */
export async function adminList<T>(options: AdminListOptions) {
	const {
		db,
		table,
		columns = '*',
		orderBy = 'created_at DESC',
		limit = 100,
		entityName
	} = options;

	try {
		const result = await db
			.prepare(`SELECT ${columns} FROM ${table} ORDER BY ${orderBy} LIMIT ?`)
			.bind(limit)
			.all<T>();

		return json(result.results);
	} catch (error) {
		console.error(`Failed to list ${entityName}s:`, error);
		return json({ error: `Failed to list ${entityName}s` }, { status: 500 });
	}
}

/**
 * Capitalize first letter of a string
 */
function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}
