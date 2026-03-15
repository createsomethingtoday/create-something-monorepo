/**
 * Popular Content Analytics
 *
 * Shared logic for fetching popular and trending content.
 * Used by /api/analytics/popular endpoints across properties.
 *
 * @packageDocumentation
 */

// =============================================================================
// TYPES
// =============================================================================

export interface PopularContent {
	path: string;
	title: string;
	type: 'paper' | 'experiment';
	views: number;
	uniqueSessions: number;
	avgReadTime: number;
	avgScrollDepth: number;
}

export interface UserReadingHistory {
	path: string;
	title: string;
	type: 'paper' | 'experiment';
	lastViewed: string;
	viewCount: number;
	maxScrollDepth: number;
	totalTimeSpent: number;
}

export interface PopularResponse {
	popular: PopularContent[];
	trending: PopularContent[];
	userHistory?: UserReadingHistory[];
	period: string;
	generatedAt: string;
}

export type ContentType = 'papers' | 'experiments' | 'all';

export interface PopularQueryOptions {
	type?: ContentType;
	period?: '7d' | '30d' | 'all';
	limit?: number;
	userId?: string | null;
}

// =============================================================================
// D1 DATABASE TYPE
// =============================================================================

interface D1Result<T> {
	results?: T[];
}

interface D1PreparedStatement {
	bind(...args: unknown[]): D1PreparedStatement;
	first<T>(): Promise<T | null>;
	all<T>(): Promise<D1Result<T>>;
}

interface D1Database {
	prepare(query: string): D1PreparedStatement;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Extract a readable title from a URL path
 * /papers/code-mode-hermeneutic-analysis -> Code Mode Hermeneutic Analysis
 */
export function extractTitle(path: string): string {
	const slug = path.split('/').pop() || '';
	return slug
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

/**
 * Path patterns for content types (used with LIKE operator)
 * These are static constants, never user-provided values.
 */
const PATH_PATTERNS = {
	papers: '%/papers/%',
	experiments: '%/experiments/%',
} as const;

/**
 * Get path filter configuration for parameterized queries
 *
 * Returns an object with patterns array for use with bound parameters.
 * This eliminates SQL injection risk by ensuring all values go through
 * the database's parameter binding mechanism.
 */
function getPathFilterConfig(type: ContentType): { patterns: string[] } {
	switch (type) {
		case 'papers':
			return { patterns: [PATH_PATTERNS.papers] };
		case 'experiments':
			return { patterns: [PATH_PATTERNS.experiments] };
		default:
			return { patterns: [PATH_PATTERNS.papers, PATH_PATTERNS.experiments] };
	}
}

/**
 * Calculate start date for period
 */
function getStartDate(period: '7d' | '30d' | 'all'): string {
	const now = new Date();
	switch (period) {
		case '7d':
			return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
		case '30d':
			return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
		default:
			return '2020-01-01T00:00:00Z';
	}
}

/**
 * Determine content type from path
 */
function getContentType(path: string): 'paper' | 'experiment' {
	return path.includes('/papers/') ? 'paper' : 'experiment';
}

// =============================================================================
// QUERY FUNCTIONS
// =============================================================================

interface PopularRow {
	path: string;
	views: number;
	unique_sessions: number;
	avg_read_time: number;
	avg_scroll_depth: number;
}

interface TrendingRow {
	path: string;
	recent_views: number;
	previous_views: number;
	growth: number;
}

interface UserHistoryRow {
	path: string;
	view_count: number;
	last_viewed: string;
	max_scroll_depth: number;
	total_time_spent: number;
}

/**
 * Fetch popular content from D1
 *
 * Uses parameterized queries for path filtering to prevent SQL injection.
 */
async function fetchPopular(
	db: D1Database,
	startDate: string,
	pathPatterns: string[],
	limit: number
): Promise<PopularContent[]> {
	// Build parameterized path filter with placeholders
	const pathPlaceholders = pathPatterns.map(() => 'url LIKE ?').join(' OR ');
	const pathFilter = pathPatterns.length > 0 ? `AND (${pathPlaceholders})` : '';

	const query = `
		SELECT
			url as path,
			COUNT(*) as views,
			COUNT(DISTINCT session_id) as unique_sessions,
			COALESCE(AVG(CASE WHEN action = 'time_on_page' THEN value END), 0) as avg_read_time,
			COALESCE(MAX(CASE WHEN action = 'scroll_depth' THEN value END), 0) as avg_scroll_depth
		FROM unified_events
		WHERE category IN ('navigation', 'content')
			AND action IN ('page_view', 'time_on_page', 'scroll_depth')
			AND created_at >= ?
			${pathFilter}
		GROUP BY url
		ORDER BY views DESC
		LIMIT ?
	`;

	// Bind parameters in order: startDate, ...pathPatterns, limit
	const results = await db
		.prepare(query)
		.bind(startDate, ...pathPatterns, limit)
		.all<PopularRow>();

	return (results.results || []).map((row) => ({
		path: row.path,
		title: extractTitle(row.path),
		type: getContentType(row.path),
		views: row.views,
		uniqueSessions: row.unique_sessions,
		avgReadTime: Math.round(row.avg_read_time || 0),
		avgScrollDepth: Math.round(row.avg_scroll_depth || 0),
	}));
}

/**
 * Fetch trending content (week-over-week growth)
 *
 * Uses parameterized queries for path filtering to prevent SQL injection.
 */
async function fetchTrending(
	db: D1Database,
	pathPatterns: string[],
	limit: number
): Promise<PopularContent[]> {
	// Build parameterized path filter with placeholders
	const pathPlaceholders = pathPatterns.map(() => 'url LIKE ?').join(' OR ');
	const pathFilter = pathPatterns.length > 0 ? `AND (${pathPlaceholders})` : '';

	// Note: path patterns are needed twice in this query (once for recent, once for previous)
	const query = `
		WITH recent AS (
			SELECT url, COUNT(*) as views
			FROM unified_events
			WHERE category = 'navigation' AND action = 'page_view'
				AND created_at >= datetime('now', '-7 days')
				${pathFilter}
			GROUP BY url
		),
		previous AS (
			SELECT url, COUNT(*) as views
			FROM unified_events
			WHERE category = 'navigation' AND action = 'page_view'
				AND created_at >= datetime('now', '-14 days')
				AND created_at < datetime('now', '-7 days')
				${pathFilter}
			GROUP BY url
		)
		SELECT
			r.url as path,
			r.views as recent_views,
			COALESCE(p.views, 0) as previous_views,
			CASE WHEN COALESCE(p.views, 0) = 0 THEN 100
				 ELSE ((r.views - p.views) * 100.0 / p.views)
			END as growth
		FROM recent r
		LEFT JOIN previous p ON r.url = p.url
		WHERE r.views >= 3
		ORDER BY growth DESC
		LIMIT ?
	`;

	// Bind parameters: ...pathPatterns (for recent CTE), ...pathPatterns (for previous CTE), limit
	const results = await db
		.prepare(query)
		.bind(...pathPatterns, ...pathPatterns, limit)
		.all<TrendingRow>();

	return (results.results || []).map((row) => ({
		path: row.path,
		title: extractTitle(row.path),
		type: getContentType(row.path),
		views: row.recent_views,
		uniqueSessions: 0,
		avgReadTime: 0,
		avgScrollDepth: 0,
	}));
}

/**
 * Fetch user's reading history
 *
 * Uses parameterized queries for path filtering to prevent SQL injection.
 */
async function fetchUserHistory(
	db: D1Database,
	userId: string,
	pathPatterns: string[]
): Promise<UserReadingHistory[]> {
	// Build parameterized path filter with placeholders
	const pathPlaceholders = pathPatterns.map(() => 'url LIKE ?').join(' OR ');
	const pathFilter = pathPatterns.length > 0 ? `AND (${pathPlaceholders})` : '';

	const query = `
		SELECT
			url as path,
			COUNT(*) as view_count,
			MAX(created_at) as last_viewed,
			MAX(CASE WHEN action = 'scroll_depth' THEN value ELSE 0 END) as max_scroll_depth,
			SUM(CASE WHEN action = 'time_on_page' THEN value ELSE 0 END) as total_time_spent
		FROM unified_events
		WHERE user_id = ?
			AND category IN ('navigation', 'content')
			${pathFilter}
		GROUP BY url
		ORDER BY last_viewed DESC
		LIMIT 20
	`;

	// Bind parameters: userId, ...pathPatterns
	const results = await db.prepare(query).bind(userId, ...pathPatterns).all<UserHistoryRow>();

	return (results.results || []).map((row) => ({
		path: row.path,
		title: extractTitle(row.path),
		type: getContentType(row.path),
		lastViewed: row.last_viewed,
		viewCount: row.view_count,
		maxScrollDepth: Math.round(row.max_scroll_depth || 0),
		totalTimeSpent: Math.round(row.total_time_spent || 0),
	}));
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Fetch popular analytics data
 *
 * @example
 * ```typescript
 * // In +server.ts
 * import { fetchPopularAnalytics } from '@create-something/components/analytics';
 *
 * export const GET = async ({ platform, url, cookies }) => {
 *   const db = platform?.env?.DB;
 *   const result = await fetchPopularAnalytics(db, {
 *     type: 'experiments',
 *     period: '30d',
 *     limit: 10,
 *     userId: authenticatedUserId,
 *   });
 *   return json(result);
 * };
 * ```
 */
export async function fetchPopularAnalytics(
	db: D1Database,
	options: PopularQueryOptions = {}
): Promise<PopularResponse> {
	const { type = 'all', period = '30d', limit = 10, userId = null } = options;

	const safeLimit = Math.min(limit, 50);
	const { patterns: pathPatterns } = getPathFilterConfig(type);
	const startDate = getStartDate(period);

	const [popular, trending] = await Promise.all([
		fetchPopular(db, startDate, pathPatterns, safeLimit),
		fetchTrending(db, pathPatterns, safeLimit),
	]);

	const response: PopularResponse = {
		popular,
		trending,
		period,
		generatedAt: new Date().toISOString(),
	};

	if (userId) {
		response.userHistory = await fetchUserHistory(db, userId, pathPatterns);
	}

	return response;
}
