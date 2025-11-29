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
