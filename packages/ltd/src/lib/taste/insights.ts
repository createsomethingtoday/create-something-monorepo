/**
 * Taste Insights
 *
 * Shared types, constants, and logic for taste reading insights.
 * Used by both the API endpoint and the page server load function.
 *
 * Philosophy: Taste is cultivated through reflection.
 *
 * @packageDocumentation
 */

// =============================================================================
// TYPES
// =============================================================================

export interface TasteReadingStats {
	totalViewed: number;
	totalStudied: number;
	totalTimeSeconds: number;
	channelsExplored: number;
	totalChannels: number;
}

export interface ChannelStats {
	channel: string;
	viewCount: number;
	studiedCount: number;
	timeSeconds: number;
}

export interface MostStudiedReference {
	id: string;
	title: string;
	type: 'example' | 'resource';
	channel: string;
	viewCount: number;
	timeSeconds: number;
	imageUrl?: string;
}

export interface CollectionGrowth {
	date: string;
	collectionCount: number;
	itemCount: number;
}

export interface DailyActivity {
	date: string;
	views: number;
	studied: number;
	timeSeconds: number;
}

export interface TasteProfile {
	summary: string;
	topChannels: string[];
	focusAreas: string[];
	explorationScore: number;
}

export interface InsightsData {
	userId: string | null;
	stats: TasteReadingStats;
	channelBreakdown: ChannelStats[];
	mostStudied: MostStudiedReference[];
	collectionGrowth: CollectionGrowth[];
	dailyActivity: DailyActivity[];
	profile: TasteProfile;
	error?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * All available taste channels for exploration
 */
export const ALL_CHANNELS = [
	'canon-minimalism',
	'motion-language',
	'people-dieter-rams',
	'examples-swiss-design',
	'motion-minimal-simple',
	'brutalist-x-web-design',
	'interfaces-motion',
	'minimal-modern-web',
] as const;

export type TasteChannel = (typeof ALL_CHANNELS)[number];

/**
 * Empty data structure for unauthenticated or error states
 */
export const EMPTY_INSIGHTS: InsightsData = {
	userId: null,
	stats: {
		totalViewed: 0,
		totalStudied: 0,
		totalTimeSeconds: 0,
		channelsExplored: 0,
		totalChannels: ALL_CHANNELS.length,
	},
	channelBreakdown: [],
	mostStudied: [],
	collectionGrowth: [],
	dailyActivity: [],
	profile: {
		summary: 'Begin your taste exploration journey',
		topChannels: [],
		focusAreas: ['Design Exploration'],
		explorationScore: 0,
	},
};

// =============================================================================
// PROFILE GENERATION
// =============================================================================

/**
 * Generate a taste profile summary from channel breakdown and stats
 *
 * @example
 * ```typescript
 * const profile = generateProfileSummary(channelBreakdown, stats);
 * // { summary: "Focuses on Motion Design with 15 deeply studied references", ... }
 * ```
 */
export function generateProfileSummary(
	channelBreakdown: ChannelStats[],
	stats: TasteReadingStats
): TasteProfile {
	const topChannels = channelBreakdown
		.sort((a, b) => b.timeSeconds - a.timeSeconds)
		.slice(0, 3)
		.map((c) => c.channel);

	// Derive focus areas from channel names
	const focusAreas: string[] = [];
	const channelNames = topChannels.join(' ').toLowerCase();

	if (channelNames.includes('motion') || channelNames.includes('animation')) {
		focusAreas.push('Motion Design');
	}
	if (channelNames.includes('minimal') || channelNames.includes('brutalist')) {
		focusAreas.push('Minimalism');
	}
	if (channelNames.includes('swiss') || channelNames.includes('typography')) {
		focusAreas.push('Typography');
	}
	if (channelNames.includes('rams') || channelNames.includes('dieter')) {
		focusAreas.push('Industrial Design');
	}
	if (channelNames.includes('interface') || channelNames.includes('web')) {
		focusAreas.push('Interface Design');
	}

	if (focusAreas.length === 0) {
		focusAreas.push('Design Exploration');
	}

	// Calculate exploration score (0-100)
	const channelCoverage = (stats.channelsExplored / stats.totalChannels) * 40;
	const studyDepth = Math.min(stats.totalStudied * 2, 30);
	const timeInvestment = Math.min(stats.totalTimeSeconds / 3600, 30); // Cap at 30 points for 1 hour+
	const explorationScore = Math.round(channelCoverage + studyDepth + timeInvestment);

	// Generate summary
	const summaryParts: string[] = [];

	if (topChannels.length > 0) {
		summaryParts.push(`Focuses on ${focusAreas.slice(0, 2).join(' and ')}`);
	}

	if (stats.totalStudied > 10) {
		summaryParts.push(`with ${stats.totalStudied} deeply studied references`);
	} else if (stats.totalStudied > 0) {
		summaryParts.push(`with ${stats.totalStudied} studied references`);
	}

	if (stats.channelsExplored >= stats.totalChannels * 0.8) {
		summaryParts.push('and broad exploration across channels');
	}

	const summary =
		summaryParts.length > 0 ? summaryParts.join(' ') : 'Beginning taste exploration journey';

	return {
		summary,
		topChannels,
		focusAreas,
		explorationScore,
	};
}

// =============================================================================
// D1 DATABASE TYPES
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
// QUERY TYPES
// =============================================================================

interface StatsRow {
	total_viewed: number;
	total_studied: number;
	total_time: number;
	channels_explored: number;
}

interface ChannelRow {
	channel: string;
	view_count: number;
	studied_count: number;
	time_seconds: number;
}

interface StudiedRow {
	id: string;
	type: string;
	channel: string;
	view_count: number;
	time_seconds: number;
	title: string;
	image_url: string;
}

interface DailyRow {
	date: string;
	views: number;
	studied: number;
	time_seconds: number;
}

interface CollectionRow {
	date: string;
	collection_count: number;
	item_count?: number;
}

// =============================================================================
// DATA FETCHING
// =============================================================================

export interface FetchInsightsOptions {
	userId: string;
	days?: number;
	includeItemCounts?: boolean;
}

/**
 * Fetch taste insights from D1 database
 *
 * @example
 * ```typescript
 * // In +server.ts or +page.server.ts
 * const insights = await fetchTasteInsights(db, { userId, days: 30 });
 * ```
 */
export async function fetchTasteInsights(
	db: D1Database,
	options: FetchInsightsOptions
): Promise<InsightsData> {
	const { userId, days = 30, includeItemCounts = false } = options;

	const startDate = new Date();
	startDate.setDate(startDate.getDate() - days);
	const startDateStr = startDate.toISOString().split('T')[0];

	// Parallel queries for efficiency
	const [statsResult, channelResult, studiedResult, dailyResult, collectionsResult] =
		await Promise.all([
			// Overall stats
			db
				.prepare(
					`
				SELECT
					COUNT(*) as total_viewed,
					SUM(CASE WHEN studied = 1 THEN 1 ELSE 0 END) as total_studied,
					SUM(total_time_seconds) as total_time,
					COUNT(DISTINCT channel) as channels_explored
				FROM taste_readings
				WHERE user_id = ?
			`
				)
				.bind(userId)
				.first<StatsRow>(),

			// Per-channel breakdown
			db
				.prepare(
					`
				SELECT
					channel,
					COUNT(*) as view_count,
					SUM(CASE WHEN studied = 1 THEN 1 ELSE 0 END) as studied_count,
					SUM(total_time_seconds) as time_seconds
				FROM taste_readings
				WHERE user_id = ? AND channel IS NOT NULL
				GROUP BY channel
				ORDER BY time_seconds DESC
			`
				)
				.bind(userId)
				.all<ChannelRow>(),

			// Most studied references
			db
				.prepare(
					`
				SELECT
					r.reference_id as id,
					r.reference_type as type,
					r.channel,
					r.view_count,
					r.total_time_seconds as time_seconds,
					COALESCE(e.title, res.title) as title,
					e.image_url
				FROM taste_readings r
				LEFT JOIN examples e ON r.reference_type = 'example' AND r.reference_id = e.id
				LEFT JOIN resources res ON r.reference_type = 'resource' AND r.reference_id = res.id
				WHERE r.user_id = ? AND r.studied = 1
				ORDER BY r.total_time_seconds DESC
				LIMIT 10
			`
				)
				.bind(userId)
				.all<StudiedRow>(),

			// Daily activity
			db
				.prepare(
					`
				SELECT
					date,
					views,
					studied,
					time_seconds
				FROM taste_readings_daily
				WHERE user_id = ? AND date >= ?
				ORDER BY date ASC
			`
				)
				.bind(userId, startDateStr)
				.all<DailyRow>(),

			// Collection growth
			includeItemCounts
				? db
						.prepare(
							`
					SELECT
						DATE(created_at) as date,
						COUNT(*) OVER (ORDER BY DATE(created_at)) as collection_count,
						(
							SELECT COUNT(*) FROM taste_collection_items ci
							WHERE ci.collection_id IN (
								SELECT id FROM taste_collections WHERE user_id = ? AND DATE(created_at) <= DATE(c.created_at)
							)
						) as item_count
					FROM taste_collections c
					WHERE user_id = ?
					GROUP BY DATE(created_at)
					ORDER BY date ASC
				`
						)
						.bind(userId, userId)
						.all<CollectionRow>()
				: db
						.prepare(
							`
					SELECT
						DATE(created_at) as date,
						COUNT(*) as collection_count
					FROM taste_collections
					WHERE user_id = ?
					GROUP BY DATE(created_at)
					ORDER BY date ASC
				`
						)
						.bind(userId)
						.all<CollectionRow>(),
		]);

	const stats: TasteReadingStats = {
		totalViewed: statsResult?.total_viewed ?? 0,
		totalStudied: statsResult?.total_studied ?? 0,
		totalTimeSeconds: statsResult?.total_time ?? 0,
		channelsExplored: statsResult?.channels_explored ?? 0,
		totalChannels: ALL_CHANNELS.length,
	};

	const channelBreakdown: ChannelStats[] = (channelResult.results || []).map((r) => ({
		channel: r.channel,
		viewCount: r.view_count,
		studiedCount: r.studied_count,
		timeSeconds: r.time_seconds,
	}));

	const mostStudied: MostStudiedReference[] = (studiedResult.results || []).map((r) => ({
		id: r.id,
		title: r.title || 'Untitled',
		type: r.type as 'example' | 'resource',
		channel: r.channel,
		viewCount: r.view_count,
		timeSeconds: r.time_seconds,
		imageUrl: r.image_url,
	}));

	const dailyActivity: DailyActivity[] = (dailyResult.results || []).map((r) => ({
		date: r.date,
		views: r.views,
		studied: r.studied,
		timeSeconds: r.time_seconds,
	}));

	// Calculate cumulative collection growth
	let cumulativeCount = 0;
	const collectionGrowth: CollectionGrowth[] = (collectionsResult.results || []).map((r) => {
		if (includeItemCounts) {
			return {
				date: r.date,
				collectionCount: r.collection_count,
				itemCount: r.item_count ?? 0,
			};
		}
		cumulativeCount += r.collection_count;
		return {
			date: r.date,
			collectionCount: cumulativeCount,
			itemCount: 0,
		};
	});

	const profile = generateProfileSummary(channelBreakdown, stats);

	return {
		userId,
		stats,
		channelBreakdown,
		mostStudied,
		collectionGrowth,
		dailyActivity,
		profile,
	};
}
