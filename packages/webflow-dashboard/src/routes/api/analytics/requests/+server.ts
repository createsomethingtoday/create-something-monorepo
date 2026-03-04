import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';
import { hasAdminAccess } from '$lib/server/security';
import { hashString } from '$lib/utils/hash';

const noCacheHeaders = {
	'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
	'Pragma': 'no-cache',
	'Expires': '0'
} as const;

function parseDays(rawDays: string | null): number {
	if (!rawDays) return 30;
	const parsed = Number.parseInt(rawDays, 10);
	if (!Number.isFinite(parsed)) return 30;
	return Math.max(7, Math.min(parsed, 365));
}

function percentageLift(current: number, previous: number): number | null {
	if (previous <= 0) return null;
	return Math.round(((current - previous) / previous) * 1000) / 10;
}

function safeRate(numerator: number, denominator: number): number {
	if (denominator <= 0) return 0;
	return Math.round((numerator / denominator) * 1000) / 10;
}

async function trackAdminAnalyticsRequest(
	db: D1Database,
	userEmail: string,
	days: number
): Promise<void> {
	try {
		await db
			.prepare(
				`INSERT INTO analytics_events (event_name, user_hash, page_path, properties)
				 VALUES (?, ?, ?, ?)`
			)
			.bind(
				'analytics_requests_report_requested',
				await hashString(userEmail),
				'/api/analytics/requests',
				JSON.stringify({ days })
			)
			.run();
	} catch (requestTrackingError) {
		console.debug('Failed to track analytics requests report query:', requestTrackingError);
	}
}

type CountRow = { count: number };

async function queryCount(db: D1Database, sql: string, params: string[] = []): Promise<number> {
	const row = await db
		.prepare(sql)
		.bind(...params)
		.first<CountRow>();
	return Number(row?.count ?? 0);
}

type EngagementRow = { action_events: number; engaged_users: number };

async function queryEngagement(
	db: D1Database,
	startModifier: string,
	endModifier?: string
): Promise<{ actionEvents: number; engagedUsers: number }> {
	const baseSql = `
		SELECT
			COUNT(*) as action_events,
			COUNT(DISTINCT user_hash) as engaged_users
		FROM analytics_events
		WHERE user_hash IS NOT NULL
			AND user_hash != 'server'
			AND event_name NOT LIKE 'auth_%'
			AND event_name != 'page_view'
			AND created_at >= datetime('now', ?)
	`;

	if (!endModifier) {
		const row = await db.prepare(baseSql).bind(startModifier).first<EngagementRow>();
		return {
			actionEvents: Number(row?.action_events ?? 0),
			engagedUsers: Number(row?.engaged_users ?? 0)
		};
	}

	const row = await db
		.prepare(`${baseSql} AND created_at < datetime('now', ?)`)
		.bind(startModifier, endModifier)
		.first<EngagementRow>();

	return {
		actionEvents: Number(row?.action_events ?? 0),
		engagedUsers: Number(row?.engaged_users ?? 0)
	};
}

type QualityRow = {
	upload_attempts: number;
	upload_successes: number;
	updates_started: number;
	updates_completed: number;
};

export const GET: RequestHandler = async ({ locals, platform, url }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (
		!hasAdminAccess(locals.user.email, {
			adminEmailsCsv: platform?.env?.ADMIN_EMAILS,
			environment: platform?.env?.ENVIRONMENT
		})
	) {
		throw error(403, 'Forbidden');
	}

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const days = parseDays(url.searchParams.get('days'));
	const currentStartModifier = `-${days} days`;
	const previousStartModifier = `-${days * 2} days`;
	const currentEndModifier = currentStartModifier;

	const [
		dashboardPageViewsCurrent,
		dashboardPageViewsPrevious,
		dashboardUniqueVisitorsCurrent,
		dashboardUniqueVisitorsPrevious,
		allTrackedUniqueVisitorsCurrent
	] = await Promise.all([
		queryCount(
			db,
			`SELECT COUNT(*) as count
			 FROM analytics_events
			 WHERE event_name = 'page_view'
				AND user_hash IS NOT NULL
				AND user_hash != 'server'
				AND page_path = '/dashboard'
				AND created_at >= datetime('now', ?)`,
			[currentStartModifier]
		),
		queryCount(
			db,
			`SELECT COUNT(*) as count
			 FROM analytics_events
			 WHERE event_name = 'page_view'
				AND user_hash IS NOT NULL
				AND user_hash != 'server'
				AND page_path = '/dashboard'
				AND created_at >= datetime('now', ?)
				AND created_at < datetime('now', ?)`,
			[previousStartModifier, currentEndModifier]
		),
		queryCount(
			db,
			`SELECT COUNT(DISTINCT user_hash) as count
			 FROM analytics_events
			 WHERE event_name = 'page_view'
				AND user_hash IS NOT NULL
				AND user_hash != 'server'
				AND page_path = '/dashboard'
				AND created_at >= datetime('now', ?)`,
			[currentStartModifier]
		),
		queryCount(
			db,
			`SELECT COUNT(DISTINCT user_hash) as count
			 FROM analytics_events
			 WHERE event_name = 'page_view'
				AND user_hash IS NOT NULL
				AND user_hash != 'server'
				AND page_path = '/dashboard'
				AND created_at >= datetime('now', ?)
				AND created_at < datetime('now', ?)`,
			[previousStartModifier, currentEndModifier]
		),
		queryCount(
			db,
			`SELECT COUNT(DISTINCT user_hash) as count
			 FROM analytics_events
			 WHERE user_hash IS NOT NULL
				AND user_hash != 'server'
				AND created_at >= datetime('now', ?)`,
			[currentStartModifier]
		)
	]);

	const [engagementCurrent, engagementPrevious] = await Promise.all([
		queryEngagement(db, currentStartModifier),
		queryEngagement(db, previousStartModifier, currentEndModifier)
	]);

	const qualityRow = await db
		.prepare(
			`SELECT
				SUM(CASE WHEN event_name = 'image_upload_attempted' THEN 1 ELSE 0 END) as upload_attempts,
				SUM(CASE WHEN event_name = 'image_upload_success' THEN 1 ELSE 0 END) as upload_successes,
				SUM(CASE WHEN event_name = 'asset_update_started' THEN 1 ELSE 0 END) as updates_started,
				SUM(CASE WHEN event_name = 'asset_update_completed' THEN 1 ELSE 0 END) as updates_completed
			FROM analytics_events
			WHERE created_at >= datetime('now', ?)`
		)
		.bind(currentStartModifier)
		.first<QualityRow>();

	const metadata = await db
		.prepare(
			`SELECT
				MIN(CASE WHEN event_name = 'page_view' THEN created_at END) as first_page_view_at,
				MAX(created_at) as last_event_at
			FROM analytics_events`
		)
		.first<{ first_page_view_at: string | null; last_event_at: string | null }>();

	const airtable = getAirtableClient(platform?.env);
	const creatorCategorySplit = await airtable.getCreatorCategorySplit();

	await trackAdminAnalyticsRequest(db, locals.user.email, days);

	const currentActionsPerUser =
		engagementCurrent.engagedUsers > 0
			? Math.round((engagementCurrent.actionEvents / engagementCurrent.engagedUsers) * 100) / 100
			: 0;
	const previousActionsPerUser =
		engagementPrevious.engagedUsers > 0
			? Math.round((engagementPrevious.actionEvents / engagementPrevious.engagedUsers) * 100) / 100
			: 0;

	return json(
		{
			period: {
				days,
				currentStart: currentStartModifier,
				previousStart: previousStartModifier,
				previousEnd: currentEndModifier
			},
			visitors: {
				assetDashboardUniqueVisitors: dashboardUniqueVisitorsCurrent,
				assetDashboardPageViews: dashboardPageViewsCurrent,
				allTrackedUniqueVisitors: allTrackedUniqueVisitorsCurrent,
				lift: {
					assetDashboardUniqueVisitorsPct: percentageLift(
						dashboardUniqueVisitorsCurrent,
						dashboardUniqueVisitorsPrevious
					),
					assetDashboardPageViewsPct: percentageLift(
						dashboardPageViewsCurrent,
						dashboardPageViewsPrevious
					)
				},
				previous: {
					assetDashboardUniqueVisitors: dashboardUniqueVisitorsPrevious,
					assetDashboardPageViews: dashboardPageViewsPrevious
				}
			},
			engagement: {
				current: {
					actionEvents: engagementCurrent.actionEvents,
					engagedUsers: engagementCurrent.engagedUsers,
					actionsPerEngagedUser: currentActionsPerUser
				},
				previous: {
					actionEvents: engagementPrevious.actionEvents,
					engagedUsers: engagementPrevious.engagedUsers,
					actionsPerEngagedUser: previousActionsPerUser
				},
				lift: {
					actionEventsPct: percentageLift(
						engagementCurrent.actionEvents,
						engagementPrevious.actionEvents
					),
					engagedUsersPct: percentageLift(
						engagementCurrent.engagedUsers,
						engagementPrevious.engagedUsers
					),
					actionsPerEngagedUserPct: percentageLift(
						currentActionsPerUser,
						previousActionsPerUser
					)
				},
				quality: {
					uploadAttempts: Number(qualityRow?.upload_attempts ?? 0),
					uploadSuccesses: Number(qualityRow?.upload_successes ?? 0),
					uploadSuccessRatePct: safeRate(
						Number(qualityRow?.upload_successes ?? 0),
						Number(qualityRow?.upload_attempts ?? 0)
					),
					updatesStarted: Number(qualityRow?.updates_started ?? 0),
					updatesCompleted: Number(qualityRow?.updates_completed ?? 0),
					updateCompletionRatePct: safeRate(
						Number(qualityRow?.updates_completed ?? 0),
						Number(qualityRow?.updates_started ?? 0)
					)
				}
			},
			creators: creatorCategorySplit,
			dataCoverage: {
				firstPageViewAt: metadata?.first_page_view_at ?? null,
				lastEventAt: metadata?.last_event_at ?? null
			}
		},
		{ headers: noCacheHeaders }
	);
};
