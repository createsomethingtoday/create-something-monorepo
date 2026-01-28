/**
 * D1 Database Query Helpers
 *
 * Type-safe wrappers for common D1 query patterns.
 * "Less, but better" - one place for database typing.
 */

import type { Paper } from '../types/paper.js';

// ============================================================================
// Type Definitions
// ============================================================================

export interface CategoryStat {
	name: string;
	slug: string;
	count: number;
}

export interface CategoryRow {
	category: string;
	count: number;
}

export interface ExperimentStats {
	total_executions: number;
	completed_count: number;
	avg_time_seconds: number;
	avg_errors: number;
	total_errors: number;
	completion_rate?: number;
	fastest_time?: number;
	slowest_time?: number;
}

// D1Database type from Cloudflare
type D1Database = {
	prepare(query: string): D1PreparedStatement;
};

type D1PreparedStatement = {
	bind(...values: unknown[]): D1PreparedStatement;
	all<T = unknown>(): Promise<D1Result<T>>;
	first<T = unknown>(colName?: string): Promise<T | null>;
	run(): Promise<D1Result<unknown>>;
};

type D1Result<T> = {
	results?: T[];
	success: boolean;
	meta: object;
};

// ============================================================================
// Paper Queries
// ============================================================================

/**
 * Standard columns for Paper queries.
 * Matches the Paper interface from types/paper.ts
 */
export const PAPER_COLUMNS = `
	id, title, category, content, html_content, reading_time,
	difficulty_level, technical_focus, published_on, excerpt_short,
	excerpt_long, slug, featured, published, is_hidden, archived,
	date, excerpt, description, thumbnail_image, featured_card_image,
	featured_image, video_walkthrough_url, interactive_demo_url,
	resource_downloads, prerequisites, meta_title, meta_description,
	focus_keywords, ascii_art, ascii_thumbnail, created_at, updated_at,
	published_at, pathway, "order", summary, code_snippet
`;

/**
 * Fetch all published papers
 */
export async function fetchPublishedPapers(db: D1Database): Promise<Paper[]> {
	const result = await db
		.prepare(
			`SELECT ${PAPER_COLUMNS}
       FROM papers
       WHERE published = 1 AND is_hidden = 0 AND archived = 0
       ORDER BY featured DESC, COALESCE(published_at, created_at) DESC`
		)
		.all<Paper>();

	return result.results ?? [];
}

/**
 * Fetch a single paper by slug
 */
export async function fetchPaperBySlug(db: D1Database, slug: string): Promise<Paper | null> {
	const result = await db
		.prepare(`SELECT ${PAPER_COLUMNS} FROM papers WHERE slug = ? LIMIT 1`)
		.bind(slug)
		.first<Paper>();

	return result;
}

/**
 * Fetch related papers by category, excluding current paper
 */
export async function fetchRelatedPapers(
	db: D1Database,
	category: string,
	excludeId: string,
	limit = 3
): Promise<Paper[]> {
	const result = await db
		.prepare(
			`SELECT ${PAPER_COLUMNS}
       FROM papers
       WHERE category = ? AND id != ? AND published = 1 AND is_hidden = 0 AND archived = 0
       ORDER BY COALESCE(published_at, created_at) DESC
       LIMIT ?`
		)
		.bind(category, excludeId, limit)
		.all<Paper>();

	return result.results ?? [];
}

/**
 * Fetch papers by category
 */
export async function fetchPapersByCategory(db: D1Database, category: string): Promise<Paper[]> {
	const result = await db
		.prepare(
			`SELECT ${PAPER_COLUMNS}
       FROM papers
       WHERE category = ? AND published = 1 AND is_hidden = 0 AND archived = 0
       ORDER BY COALESCE(published_at, created_at) DESC`
		)
		.bind(category)
		.all<Paper>();

	return result.results ?? [];
}

// ============================================================================
// Category Queries
// ============================================================================

/**
 * Fetch category statistics
 */
export async function fetchCategoryStats(db: D1Database): Promise<CategoryStat[]> {
	const result = await db
		.prepare(
			`SELECT category, COUNT(*) as count
       FROM papers
       WHERE published = 1 AND is_hidden = 0 AND archived = 0
       GROUP BY category
       ORDER BY count DESC`
		)
		.all<CategoryRow>();

	return (result.results ?? []).map((row) => ({
		name: row.category.charAt(0).toUpperCase() + row.category.slice(1),
		slug: row.category,
		count: row.count
	}));
}

// ============================================================================
// Experiment Stats Queries
// ============================================================================

/**
 * Fetch experiment execution statistics
 */
export async function fetchExperimentStats(
	db: D1Database,
	paperId: string
): Promise<ExperimentStats | null> {
	const stats = await db
		.prepare(
			`SELECT
         COUNT(*) as total_executions,
         SUM(completed) as completed_count,
         AVG(time_spent_seconds) as avg_time_seconds,
         AVG(errors_encountered) as avg_errors,
         SUM(errors_encountered) as total_errors,
         MIN(time_spent_seconds) as fastest_time,
         MAX(time_spent_seconds) as slowest_time
       FROM experiment_executions
       WHERE paper_id = ?`
		)
		.bind(paperId)
		.first<ExperimentStats>();

	if (!stats) return null;

	return {
		...stats,
		completion_rate:
			stats.total_executions > 0 ? (stats.completed_count / stats.total_executions) * 100 : 0
	};
}

// ============================================================================
// Generic Query Helpers
// ============================================================================

/**
 * Safe query wrapper that handles errors gracefully
 */
export async function safeQuery<T>(
	queryFn: () => Promise<T>,
	fallback: T
): Promise<T> {
	try {
		return await queryFn();
	} catch (error) {
		console.error('Database query error:', error);
		return fallback;
	}
}

// ============================================================================
// Typed Query Builder
// ============================================================================

/**
 * Query result with type safety
 */
export interface QueryResult<T> {
	success: boolean;
	results: T[];
	meta: {
		rows_read?: number;
		rows_written?: number;
		duration?: number;
	};
}

/**
 * Where clause condition types
 */
type WhereOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'IS NULL' | 'IS NOT NULL';

interface WhereCondition {
	column: string;
	operator: WhereOperator;
	value?: unknown;
}

/**
 * Order direction
 */
type OrderDirection = 'ASC' | 'DESC';

interface OrderClause {
	column: string;
	direction: OrderDirection;
}

/**
 * Typed query builder for D1 databases
 *
 * Provides a fluent API for building type-safe SQL queries.
 * "Less, but better" - simple interface, powerful results.
 *
 * @example
 * // Select with type safety
 * const users = await query<User>(db)
 *   .from('users')
 *   .where('status', '=', 'active')
 *   .orderBy('created_at', 'DESC')
 *   .limit(10)
 *   .all();
 *
 * @example
 * // Select single row
 * const user = await query<User>(db)
 *   .from('users')
 *   .where('id', '=', userId)
 *   .first();
 */
export function query<T>(db: D1Database) {
	return new QueryBuilder<T>(db);
}

/**
 * Query builder class
 *
 * Builds SQL queries with type safety and parameter binding.
 */
export class QueryBuilder<T> {
	private db: D1Database;
	private tableName: string = '';
	private selectColumns: string = '*';
	private whereConditions: WhereCondition[] = [];
	private orderClauses: OrderClause[] = [];
	private limitValue?: number;
	private offsetValue?: number;

	constructor(db: D1Database) {
		this.db = db;
	}

	/**
	 * Set the table to query from
	 */
	from(table: string): this {
		this.tableName = table;
		return this;
	}

	/**
	 * Set columns to select
	 */
	select(columns: string | string[]): this {
		this.selectColumns = Array.isArray(columns) ? columns.join(', ') : columns;
		return this;
	}

	/**
	 * Add a where condition
	 */
	where(column: string, operator: WhereOperator, value?: unknown): this {
		this.whereConditions.push({ column, operator, value });
		return this;
	}

	/**
	 * Add an equals where condition (shorthand)
	 */
	whereEquals(column: string, value: unknown): this {
		return this.where(column, '=', value);
	}

	/**
	 * Add IS NULL condition
	 */
	whereNull(column: string): this {
		return this.where(column, 'IS NULL');
	}

	/**
	 * Add IS NOT NULL condition
	 */
	whereNotNull(column: string): this {
		return this.where(column, 'IS NOT NULL');
	}

	/**
	 * Add an IN condition
	 */
	whereIn(column: string, values: unknown[]): this {
		return this.where(column, 'IN', values);
	}

	/**
	 * Add order by clause
	 */
	orderBy(column: string, direction: OrderDirection = 'ASC'): this {
		this.orderClauses.push({ column, direction });
		return this;
	}

	/**
	 * Set limit
	 */
	limit(n: number): this {
		this.limitValue = n;
		return this;
	}

	/**
	 * Set offset
	 */
	offset(n: number): this {
		this.offsetValue = n;
		return this;
	}

	/**
	 * Build the SQL query and parameters
	 */
	private build(): { sql: string; params: unknown[] } {
		if (!this.tableName) {
			throw new Error('Table name is required. Call .from() first.');
		}

		const params: unknown[] = [];
		const parts: string[] = [`SELECT ${this.selectColumns} FROM ${this.tableName}`];

		// Build WHERE clause
		if (this.whereConditions.length > 0) {
			const whereParts = this.whereConditions.map((cond) => {
				if (cond.operator === 'IS NULL' || cond.operator === 'IS NOT NULL') {
					return `${cond.column} ${cond.operator}`;
				}
				if (cond.operator === 'IN' && Array.isArray(cond.value)) {
					const placeholders = cond.value.map(() => '?').join(', ');
					params.push(...cond.value);
					return `${cond.column} IN (${placeholders})`;
				}
				params.push(cond.value);
				return `${cond.column} ${cond.operator} ?`;
			});
			parts.push(`WHERE ${whereParts.join(' AND ')}`);
		}

		// Build ORDER BY clause
		if (this.orderClauses.length > 0) {
			const orderParts = this.orderClauses.map((o) => `${o.column} ${o.direction}`);
			parts.push(`ORDER BY ${orderParts.join(', ')}`);
		}

		// Add LIMIT
		if (this.limitValue !== undefined) {
			parts.push(`LIMIT ?`);
			params.push(this.limitValue);
		}

		// Add OFFSET
		if (this.offsetValue !== undefined) {
			parts.push(`OFFSET ?`);
			params.push(this.offsetValue);
		}

		return { sql: parts.join(' '), params };
	}

	/**
	 * Execute query and return all results
	 */
	async all(): Promise<T[]> {
		const { sql, params } = this.build();
		let stmt = this.db.prepare(sql);
		if (params.length > 0) {
			stmt = stmt.bind(...params);
		}
		const result = await stmt.all<T>();
		return result.results ?? [];
	}

	/**
	 * Execute query and return first result
	 */
	async first(): Promise<T | null> {
		this.limitValue = 1;
		const { sql, params } = this.build();
		let stmt = this.db.prepare(sql);
		if (params.length > 0) {
			stmt = stmt.bind(...params);
		}
		return stmt.first<T>();
	}

	/**
	 * Execute query and return count
	 */
	async count(): Promise<number> {
		this.selectColumns = 'COUNT(*) as count';
		const { sql, params } = this.build();
		let stmt = this.db.prepare(sql);
		if (params.length > 0) {
			stmt = stmt.bind(...params);
		}
		const result = await stmt.first<{ count: number }>();
		return result?.count ?? 0;
	}

	/**
	 * Get the raw SQL for debugging
	 */
	toSQL(): { sql: string; params: unknown[] } {
		return this.build();
	}
}

/**
 * Insert builder for D1 databases
 *
 * @example
 * const result = await insert(db)
 *   .into('users')
 *   .values({ name: 'John', email: 'john@example.com' })
 *   .run();
 */
export function insert(db: D1Database) {
	return new InsertBuilder(db);
}

/**
 * Insert builder class
 */
export class InsertBuilder {
	private db: D1Database;
	private tableName: string = '';
	private data: Record<string, unknown> = {};

	constructor(db: D1Database) {
		this.db = db;
	}

	/**
	 * Set the table to insert into
	 */
	into(table: string): this {
		this.tableName = table;
		return this;
	}

	/**
	 * Set values to insert
	 */
	values(data: Record<string, unknown>): this {
		this.data = data;
		return this;
	}

	/**
	 * Build the SQL query and parameters
	 */
	private build(): { sql: string; params: unknown[] } {
		if (!this.tableName) {
			throw new Error('Table name is required. Call .into() first.');
		}

		const columns = Object.keys(this.data);
		const values = Object.values(this.data);
		const placeholders = columns.map(() => '?').join(', ');

		const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
		return { sql, params: values };
	}

	/**
	 * Execute the insert
	 */
	async run(): Promise<{ success: boolean; lastRowId?: number }> {
		const { sql, params } = this.build();
		const result = await this.db.prepare(sql).bind(...params).run();
		return {
			success: result.success,
			lastRowId: (result.meta as { last_row_id?: number })?.last_row_id
		};
	}

	/**
	 * Get the raw SQL for debugging
	 */
	toSQL(): { sql: string; params: unknown[] } {
		return this.build();
	}
}

/**
 * Update builder for D1 databases
 *
 * @example
 * const result = await update(db)
 *   .table('users')
 *   .set({ name: 'Jane', updated_at: Date.now() })
 *   .where('id', '=', userId)
 *   .run();
 */
export function update(db: D1Database) {
	return new UpdateBuilder(db);
}

/**
 * Update builder class
 */
export class UpdateBuilder {
	private db: D1Database;
	private tableName: string = '';
	private data: Record<string, unknown> = {};
	private whereConditions: WhereCondition[] = [];

	constructor(db: D1Database) {
		this.db = db;
	}

	/**
	 * Set the table to update
	 */
	table(name: string): this {
		this.tableName = name;
		return this;
	}

	/**
	 * Set values to update
	 */
	set(data: Record<string, unknown>): this {
		this.data = data;
		return this;
	}

	/**
	 * Add a where condition
	 */
	where(column: string, operator: WhereOperator, value?: unknown): this {
		this.whereConditions.push({ column, operator, value });
		return this;
	}

	/**
	 * Build the SQL query and parameters
	 */
	private build(): { sql: string; params: unknown[] } {
		if (!this.tableName) {
			throw new Error('Table name is required. Call .table() first.');
		}

		const params: unknown[] = [];
		const setClauses = Object.entries(this.data).map(([col, val]) => {
			params.push(val);
			return `${col} = ?`;
		});

		let sql = `UPDATE ${this.tableName} SET ${setClauses.join(', ')}`;

		if (this.whereConditions.length > 0) {
			const whereParts = this.whereConditions.map((cond) => {
				if (cond.operator === 'IS NULL' || cond.operator === 'IS NOT NULL') {
					return `${cond.column} ${cond.operator}`;
				}
				params.push(cond.value);
				return `${cond.column} ${cond.operator} ?`;
			});
			sql += ` WHERE ${whereParts.join(' AND ')}`;
		}

		return { sql, params };
	}

	/**
	 * Execute the update
	 */
	async run(): Promise<{ success: boolean; rowsAffected?: number }> {
		const { sql, params } = this.build();
		const result = await this.db.prepare(sql).bind(...params).run();
		return {
			success: result.success,
			rowsAffected: (result.meta as { changes?: number })?.changes
		};
	}

	/**
	 * Get the raw SQL for debugging
	 */
	toSQL(): { sql: string; params: unknown[] } {
		return this.build();
	}
}
