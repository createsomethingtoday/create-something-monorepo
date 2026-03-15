import type { D1Database, KVNamespace } from '@cloudflare/workers-types';

interface VideoRow {
	id: string;
	title: string;
}

function toNumber(value: unknown): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
}

function formatWatchTimeFromMs(ms: number): string {
	const totalSeconds = Math.max(0, Math.round(ms / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

export interface PlatformAnalyticsMetrics {
	totalViews: number;
	videoCount: number;
	avgViews: number;
	topVideo: string;
	topVideoId: string | null;
	avgWatchTime: string;
	completionRate: number;
}

export interface VideoViewsSummary {
	views: Record<string, number>;
	videoIds: string[];
}

/**
 * Return all known video IDs from D1.
 */
export async function getVideoCatalog(
	db: D1Database
): Promise<Array<{ id: string; title: string }>> {
	const result = await db.prepare('SELECT id, title FROM videos ORDER BY created_at DESC').all<VideoRow>();
	return (result.results || []).map((video) => ({ id: video.id, title: video.title }));
}

/**
 * Return view counts keyed by video ID.
 * KV is the primary source; if unavailable, fall back to event tracking.
 */
export async function getVideoViewsSummary(
	db: D1Database,
	kv: KVNamespace | undefined
): Promise<VideoViewsSummary> {
	const catalog = await getVideoCatalog(db);
	const views: Record<string, number> = {};

	for (const item of catalog) {
		views[item.id] = 0;
	}

	if (kv) {
		for (const item of catalog) {
			const current = await kv.get(`views:${item.id}`);
			views[item.id] = current ? toNumber(current) : 0;
		}
		return { views, videoIds: catalog.map((v) => v.id) };
	}

	const fallbackResult = await db
		.prepare(
			`SELECT json_extract(metadata, '$.videoId') as video_id, COUNT(*) as view_count
			 FROM user_events
			 WHERE event_type = 'video_play' AND metadata IS NOT NULL
			 GROUP BY json_extract(metadata, '$.videoId')`
		)
		.all<{ video_id: string | null; view_count: number }>();

	for (const row of fallbackResult.results || []) {
		if (!row.video_id) continue;
		views[row.video_id] = toNumber(row.view_count);
	}

	return { views, videoIds: catalog.map((v) => v.id) };
}

/**
 * Aggregate platform analytics from D1/KV.
 */
export async function getPlatformAnalyticsMetrics(
	db: D1Database,
	kv: KVNamespace | undefined
): Promise<PlatformAnalyticsMetrics> {
	const catalog = await getVideoCatalog(db);
	const viewsSummary = await getVideoViewsSummary(db, kv);
	const views = viewsSummary.views;

	let totalViews = 0;
	let topVideoId: string | null = null;
	let topViews = -1;

	for (const item of catalog) {
		const count = toNumber(views[item.id]);
		totalViews += count;
		if (count > topViews) {
			topViews = count;
			topVideoId = item.id;
		}
	}

	const playSessionsResult = await db
		.prepare(
			`SELECT COUNT(DISTINCT session_id) as sessions
			 FROM user_events
			 WHERE event_type = 'video_play'`
		)
		.first<{ sessions: number }>();

	const completeSessionsResult = await db
		.prepare(
			`SELECT COUNT(DISTINCT session_id) as sessions
			 FROM user_events
			 WHERE event_type = 'video_complete'`
		)
		.first<{ sessions: number }>();

	const avgWatchResult = await db
		.prepare(
			`SELECT AVG(duration_ms) as avg_ms
			 FROM user_events
			 WHERE event_type IN ('video_pause', 'video_complete')
			   AND duration_ms IS NOT NULL`
		)
		.first<{ avg_ms: number | null }>();

	const playSessions = toNumber(playSessionsResult?.sessions);
	const completeSessions = toNumber(completeSessionsResult?.sessions);
	const completionRate =
		playSessions > 0 ? Number(((completeSessions / playSessions) * 100).toFixed(1)) : 0;
	const avgWatchMs = toNumber(avgWatchResult?.avg_ms ?? 0);

	const topVideoTitle =
		catalog.find((item) => item.id === topVideoId)?.title || 'No videos yet';
	const videoCount = catalog.length;
	const avgViews = videoCount > 0 ? Math.round(totalViews / videoCount) : 0;

	return {
		totalViews,
		videoCount,
		avgViews,
		topVideo: topVideoTitle,
		topVideoId,
		avgWatchTime: formatWatchTimeFromMs(avgWatchMs),
		completionRate
	};
}

/**
 * Engagement score based on recent platform events.
 */
export async function getRecentEngagementRate(
	db: D1Database,
	windowMs = 30 * 24 * 60 * 60 * 1000
): Promise<number> {
	const threshold = Date.now() - windowMs;

	const sessionResult = await db
		.prepare(
			`SELECT COUNT(DISTINCT session_id) as sessions
			 FROM user_events
			 WHERE created_at >= ?
			   AND event_type = 'video_play'`
		)
		.bind(threshold)
		.first<{ sessions: number }>();

	const engagementResult = await db
		.prepare(
			`SELECT COUNT(*) as events
			 FROM user_events
			 WHERE created_at >= ?
			   AND event_type IN ('video_complete', 'comment_posted', 'content_shared', 'video_gate_converted')`
		)
		.bind(threshold)
		.first<{ events: number }>();

	const sessions = toNumber(sessionResult?.sessions);
	const events = toNumber(engagementResult?.events);
	if (sessions === 0) return 0;

	return Number(Math.min(100, (events / sessions) * 100).toFixed(1));
}

/**
 * Number of videos created in the last N days.
 */
export async function getRecentVideoCount(db: D1Database, days: number): Promise<number> {
	const thresholdMs = Date.now() - days * 24 * 60 * 60 * 1000;
	const thresholdSec = Math.floor(thresholdMs / 1000);
	const result = await db
		.prepare(
			`SELECT COUNT(*) as count
			 FROM videos
			 WHERE (created_at >= ? AND created_at > 10000000000)
			    OR (created_at >= ? AND created_at <= 10000000000)`
		)
		.bind(thresholdMs, thresholdSec)
		.first<{ count: number }>();

	return toNumber(result?.count);
}
