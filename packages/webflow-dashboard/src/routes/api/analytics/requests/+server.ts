import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasAdminAccess } from '$lib/server/security';
import { hashString } from '$lib/utils/hash';
import {
	buildCoverageWindows,
	estimateConfidence,
	parseDays,
	percentageLift,
	projectCount,
	safeRate,
	safeRatio
} from '$lib/server/analytics-normalization';

const noCacheHeaders = {
	'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
	'Pragma': 'no-cache',
	'Expires': '0'
} as const;

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

type CreatorAssetRow = {
	user_hash: string;
	asset_id: string | null;
};

async function queryLoginMetrics(
	db: D1Database,
	startModifier: string,
	endModifier?: string
): Promise<{ loginEvents: number; uniqueLoginHashes: number }> {
	const baseSql = `
		SELECT
			COUNT(*) as login_events,
			COUNT(DISTINCT json_extract(properties, '$.email_hash')) as unique_login_hashes
		FROM analytics_events
		WHERE event_name = 'auth_login_token_generated'
			AND json_valid(properties) = 1
			AND json_extract(properties, '$.email_hash') IS NOT NULL
			AND created_at >= datetime('now', ?)
	`;

	if (!endModifier) {
		const row = await db
			.prepare(baseSql)
			.bind(startModifier)
			.first<{ login_events: number; unique_login_hashes: number }>();
		return {
			loginEvents: Number(row?.login_events ?? 0),
			uniqueLoginHashes: Number(row?.unique_login_hashes ?? 0)
		};
	}

	const row = await db
		.prepare(`${baseSql} AND created_at < datetime('now', ?)`)
		.bind(startModifier, endModifier)
		.first<{ login_events: number; unique_login_hashes: number }>();

	return {
		loginEvents: Number(row?.login_events ?? 0),
		uniqueLoginHashes: Number(row?.unique_login_hashes ?? 0)
	};
}

async function queryCreatorAssetMix(
	db: D1Database,
	startModifier: string
): Promise<{
	creatorsWithAssetEvents: number;
	singleAssetCreators: number;
	multiAssetCreators: number;
	singleAssetPct: number;
	multiAssetPct: number;
}> {
	const rows = await db
		.prepare(
			`SELECT
				user_hash,
				json_extract(properties, '$.asset_id') as asset_id
			FROM analytics_events
			WHERE user_hash IS NOT NULL
				AND user_hash NOT IN ('server', 'anonymous')
				AND event_name IN ('asset_update_started', 'asset_update_completed')
				AND created_at >= datetime('now', ?)
				AND json_valid(properties) = 1
				AND json_extract(properties, '$.asset_id') IS NOT NULL`
		)
		.bind(startModifier)
		.all<CreatorAssetRow>();

	const creatorAssetMap = new Map<string, Set<string>>();
	for (const row of rows.results ?? []) {
		const existingAssets = creatorAssetMap.get(row.user_hash) ?? new Set<string>();
		if (row.asset_id) existingAssets.add(row.asset_id);
		creatorAssetMap.set(row.user_hash, existingAssets);
	}

	let singleAssetCreators = 0;
	let multiAssetCreators = 0;

	for (const assets of creatorAssetMap.values()) {
		if (assets.size === 1) singleAssetCreators += 1;
		if (assets.size > 1) multiAssetCreators += 1;
	}

	const creatorsWithAssetEvents = creatorAssetMap.size;

	return {
		creatorsWithAssetEvents,
		singleAssetCreators,
		multiAssetCreators,
		singleAssetPct: safeRate(singleAssetCreators, creatorsWithAssetEvents),
		multiAssetPct: safeRate(multiAssetCreators, creatorsWithAssetEvents)
	};
}

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

	const [
		loginCurrent,
		loginPrevious,
		engagementCurrent,
		engagementPrevious,
		creatorAssetMix
	] = await Promise.all([
		queryLoginMetrics(db, currentStartModifier),
		queryLoginMetrics(db, previousStartModifier, currentEndModifier),
		queryEngagement(db, currentStartModifier),
		queryEngagement(db, previousStartModifier, currentEndModifier),
		queryCreatorAssetMix(db, currentStartModifier)
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
				MIN(created_at) as first_event_at,
				MIN(CASE WHEN event_name = 'page_view' THEN created_at END) as first_page_view_at,
				MIN(CASE WHEN event_name = 'auth_login_token_generated' THEN created_at END) as first_login_at,
				MAX(created_at) as last_event_at
			FROM analytics_events`
		)
		.first<{
			first_event_at: string | null;
			first_page_view_at: string | null;
			first_login_at: string | null;
			last_event_at: string | null;
		}>();

	await trackAdminAnalyticsRequest(db, locals.user.email, days);

	const currentActionsPerUser =
		engagementCurrent.engagedUsers > 0
			? safeRatio(engagementCurrent.actionEvents, engagementCurrent.engagedUsers)
			: 0;
	const previousActionsPerUser =
		engagementPrevious.engagedUsers > 0
			? safeRatio(engagementPrevious.actionEvents, engagementPrevious.engagedUsers)
			: 0;
	const currentActionsPerUniqueLogin = safeRatio(
		engagementCurrent.actionEvents,
		loginCurrent.uniqueLoginHashes
	);
	const previousActionsPerUniqueLogin = safeRatio(
		engagementPrevious.actionEvents,
		loginPrevious.uniqueLoginHashes
	);
	const currentEngagedPerUniqueLogin = safeRate(
		engagementCurrent.engagedUsers,
		loginCurrent.uniqueLoginHashes
	);
	const previousEngagedPerUniqueLogin = safeRate(
		engagementPrevious.engagedUsers,
		loginPrevious.uniqueLoginHashes
	);

	const pageViewCoverage = buildCoverageWindows(days, metadata?.first_page_view_at ?? null);
	const loginCoverage = buildCoverageWindows(days, metadata?.first_login_at ?? null);
	const engagementCoverage = buildCoverageWindows(days, metadata?.first_event_at ?? null);

	const hasPageViewSignal =
		dashboardUniqueVisitorsCurrent > 0 ||
		dashboardUniqueVisitorsPrevious > 0 ||
		dashboardPageViewsCurrent > 0 ||
		dashboardPageViewsPrevious > 0;

	const primaryVisitorSource = hasPageViewSignal ? 'page_view' : 'auth_login_token_generated_proxy';
	const primaryVisitorsCurrent = hasPageViewSignal
		? dashboardUniqueVisitorsCurrent
		: loginCurrent.uniqueLoginHashes;
	const primaryVisitorsPrevious = hasPageViewSignal
		? dashboardUniqueVisitorsPrevious
		: loginPrevious.uniqueLoginHashes;

	const primaryVisitorCoverage = hasPageViewSignal ? pageViewCoverage : loginCoverage;
	const normalizedPrimaryVisitorsCurrent = projectCount(
		primaryVisitorsCurrent,
		primaryVisitorCoverage.current.observedDays,
		days
	);
	const normalizedPrimaryVisitorsPrevious = projectCount(
		primaryVisitorsPrevious,
		primaryVisitorCoverage.previous.observedDays,
		days
	);
	const normalizedActionEventsCurrent = projectCount(
		engagementCurrent.actionEvents,
		engagementCoverage.current.observedDays,
		days
	);
	const normalizedActionEventsPrevious = projectCount(
		engagementPrevious.actionEvents,
		engagementCoverage.previous.observedDays,
		days
	);
	const normalizedEngagedCreatorsCurrent = projectCount(
		engagementCurrent.engagedUsers,
		engagementCoverage.current.observedDays,
		days
	);
	const normalizedEngagedCreatorsPrevious = projectCount(
		engagementPrevious.engagedUsers,
		engagementCoverage.previous.observedDays,
		days
	);

	const normalizedPrimaryVisitorLiftPct =
		normalizedPrimaryVisitorsCurrent !== null && normalizedPrimaryVisitorsPrevious !== null
			? percentageLift(normalizedPrimaryVisitorsCurrent, normalizedPrimaryVisitorsPrevious)
			: null;
	const normalizedActionEventsLiftPct =
		normalizedActionEventsCurrent !== null && normalizedActionEventsPrevious !== null
			? percentageLift(normalizedActionEventsCurrent, normalizedActionEventsPrevious)
			: null;
	const normalizedEngagedCreatorsLiftPct =
		normalizedEngagedCreatorsCurrent !== null && normalizedEngagedCreatorsPrevious !== null
			? percentageLift(normalizedEngagedCreatorsCurrent, normalizedEngagedCreatorsPrevious)
			: null;

	const overallConfidence = estimateConfidence(
		Math.min(primaryVisitorCoverage.current.coveragePct, engagementCoverage.current.coveragePct),
		Math.min(primaryVisitorCoverage.previous.coveragePct, engagementCoverage.previous.coveragePct)
	);

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
				loginProxyUniqueVisitors: loginCurrent.uniqueLoginHashes,
				loginProxyEvents: loginCurrent.loginEvents,
				primarySource: primaryVisitorSource,
				primaryUniqueVisitors: primaryVisitorsCurrent,
				lift: {
					assetDashboardUniqueVisitorsPct: percentageLift(
						dashboardUniqueVisitorsCurrent,
						dashboardUniqueVisitorsPrevious
					),
					assetDashboardPageViewsPct: percentageLift(
						dashboardPageViewsCurrent,
						dashboardPageViewsPrevious
					),
					loginProxyUniqueVisitorsPct: percentageLift(
						loginCurrent.uniqueLoginHashes,
						loginPrevious.uniqueLoginHashes
					),
					loginProxyEventsPct: percentageLift(loginCurrent.loginEvents, loginPrevious.loginEvents),
					primaryUniqueVisitorsPct: percentageLift(
						primaryVisitorsCurrent,
						primaryVisitorsPrevious
					)
				},
				previous: {
					assetDashboardUniqueVisitors: dashboardUniqueVisitorsPrevious,
					assetDashboardPageViews: dashboardPageViewsPrevious,
					loginProxyUniqueVisitors: loginPrevious.uniqueLoginHashes,
					loginProxyEvents: loginPrevious.loginEvents,
					primaryUniqueVisitors: primaryVisitorsPrevious
				}
			},
			engagement: {
				current: {
					actionEvents: engagementCurrent.actionEvents,
					engagedUsers: engagementCurrent.engagedUsers,
					actionsPerEngagedUser: currentActionsPerUser,
					actionsPerUniqueLoginProxy: currentActionsPerUniqueLogin,
					engagedPerUniqueLoginProxyPct: currentEngagedPerUniqueLogin
				},
				previous: {
					actionEvents: engagementPrevious.actionEvents,
					engagedUsers: engagementPrevious.engagedUsers,
					actionsPerEngagedUser: previousActionsPerUser,
					actionsPerUniqueLoginProxy: previousActionsPerUniqueLogin,
					engagedPerUniqueLoginProxyPct: previousEngagedPerUniqueLogin
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
					),
					actionsPerUniqueLoginProxyPct: percentageLift(
						currentActionsPerUniqueLogin,
						previousActionsPerUniqueLogin
					),
					engagedPerUniqueLoginProxyPct: percentageLift(
						currentEngagedPerUniqueLogin,
						previousEngagedPerUniqueLogin
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
			creators: {
				source: 'analytics_events',
				methodology:
					'Creator split is based on distinct asset IDs touched in asset update events for the selected period.',
				totalCreators: creatorAssetMix.creatorsWithAssetEvents,
				singleAssetCreators: creatorAssetMix.singleAssetCreators,
				multiAssetCreators: creatorAssetMix.multiAssetCreators,
				singleAssetPct: creatorAssetMix.singleAssetPct,
				multiAssetPct: creatorAssetMix.multiAssetPct,
				// Compatibility aliases for prior "single vs multi category" wording.
				singleCategoryCreators: creatorAssetMix.singleAssetCreators,
				multiCategoryCreators: creatorAssetMix.multiAssetCreators,
				singleCategoryPct: creatorAssetMix.singleAssetPct,
				multiCategoryPct: creatorAssetMix.multiAssetPct,
				note: 'Category-level split is not currently available from DB event payloads; this is an asset-level proxy.'
			},
			normalized: {
				confidence: overallConfidence,
				visitors: {
					primarySource: primaryVisitorSource,
					currentEstimated: normalizedPrimaryVisitorsCurrent,
					previousEstimated: normalizedPrimaryVisitorsPrevious,
					liftPctEstimated: normalizedPrimaryVisitorLiftPct
				},
				engagement: {
					actionEventsEstimated: {
						current: normalizedActionEventsCurrent,
						previous: normalizedActionEventsPrevious,
						liftPctEstimated: normalizedActionEventsLiftPct
					},
					engagedCreatorsEstimated: {
						current: normalizedEngagedCreatorsCurrent,
						previous: normalizedEngagedCreatorsPrevious,
						liftPctEstimated: normalizedEngagedCreatorsLiftPct
					}
				},
				notes: [
					'Primary visitors fall back to unique login hashes when dashboard page_view events are not present.',
					'Estimated values scale observed counts to the full requested window using observed-day coverage.'
				]
			},
			coverage: {
				pageView: pageViewCoverage,
				loginProxy: loginCoverage,
				engagement: engagementCoverage
			},
			dataCoverage: {
				firstEventAt: metadata?.first_event_at ?? null,
				firstPageViewAt: metadata?.first_page_view_at ?? null,
				firstLoginAt: metadata?.first_login_at ?? null,
				lastEventAt: metadata?.last_event_at ?? null
			}
		},
		{ headers: noCacheHeaders }
	);
};
