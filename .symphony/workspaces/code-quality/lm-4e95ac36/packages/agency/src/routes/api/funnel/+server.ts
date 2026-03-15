/**
 * Funnel Dashboard API
 *
 * GET /api/funnel - Get funnel summary
 * POST /api/funnel - Record daily metrics
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	generateId,
	calculateConversionRate,
	type FunnelSummary,
	type FunnelMetrics,
	type FunnelMetricsInput,
	type Lead
} from '$lib/funnel';

export const GET: RequestHandler = async ({ url, platform }) => {
	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	// Get date range (default: last 7 days)
	const endDate = url.searchParams.get('end') || new Date().toISOString().split('T')[0];
	const startParam = url.searchParams.get('start');
	const startDate =
		startParam ||
		new Date(new Date(endDate).getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

	// Calculate prior period for comparison
	const periodLength = Math.ceil(
		(new Date(endDate).getTime() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000)
	);
	const priorEnd = new Date(new Date(startDate).getTime() - 24 * 60 * 60 * 1000)
		.toISOString()
		.split('T')[0];
	const priorStart = new Date(new Date(priorEnd).getTime() - periodLength * 24 * 60 * 60 * 1000)
		.toISOString()
		.split('T')[0];

	try {
		// Get current period metrics
		const currentMetrics = await db
			.prepare(
				`
			SELECT
				COALESCE(SUM(linkedin_impressions), 0) as impressions,
				COALESCE(SUM(linkedin_reach), 0) as reach,
				COALESCE(SUM(linkedin_engagements), 0) as engagements,
				COALESCE(SUM(website_visits), 0) as website_visits,
				COALESCE(SUM(discovery_calls_completed), 0) as discovery_calls,
				COALESCE(SUM(proposals_sent), 0) as proposals_sent,
				COALESCE(SUM(deals_closed), 0) as deals_closed,
				COALESCE(SUM(revenue_closed), 0) as revenue
			FROM funnel_metrics
			WHERE date >= ? AND date <= ?
		`
			)
			.bind(startDate, endDate)
			.first();

		// Get prior period for comparison
		const priorMetrics = await db
			.prepare(
				`
			SELECT
				COALESCE(SUM(linkedin_impressions), 0) as impressions,
				COALESCE(SUM(linkedin_reach), 0) as reach,
				COALESCE(SUM(linkedin_engagements), 0) as engagements
			FROM funnel_metrics
			WHERE date >= ? AND date <= ?
		`
			)
			.bind(priorStart, priorEnd)
			.first();

		// Get leads by stage
		const leadsQuery = await db
			.prepare(
				`
			SELECT stage, COUNT(*) as count, COALESCE(SUM(estimated_value), 0) as value
			FROM leads
			GROUP BY stage
		`
			)
			.all();

		const pipeline: Record<string, number> = {
			awareness: 0,
			consideration: 0,
			decision: 0,
			won: 0,
			lost: 0
		};
		let totalEstimated = 0;
		let totalClosed = 0;

		for (const row of (leadsQuery.results as Array<{ stage: string; count: number; value: number }>) || []) {
			pipeline[row.stage] = row.count;
			if (row.stage === 'won') {
				totalClosed = row.value;
			} else if (row.stage !== 'lost') {
				totalEstimated += row.value;
			}
		}

		// Calculate deltas
		const priorImpressions = (priorMetrics as { impressions: number })?.impressions || 0;
		const priorReach = (priorMetrics as { reach: number })?.reach || 0;
		const priorEngagements = (priorMetrics as { engagements: number })?.engagements || 0;

		const current = currentMetrics as {
			impressions: number;
			reach: number;
			engagements: number;
			website_visits: number;
			discovery_calls: number;
			proposals_sent: number;
			deals_closed: number;
			revenue: number;
		};

		const impressionsDelta =
			priorImpressions > 0 ? ((current.impressions - priorImpressions) / priorImpressions) * 100 : 0;
		const reachDelta = priorReach > 0 ? ((current.reach - priorReach) / priorReach) * 100 : 0;
		const engagementsDelta =
			priorEngagements > 0 ? ((current.engagements - priorEngagements) / priorEngagements) * 100 : 0;

		// Get total leads for conversion calculations
		const totalLeads = Object.values(pipeline).reduce((a, b) => a + b, 0);

		const summary: FunnelSummary = {
			period: {
				start: startDate,
				end: endDate
			},
			totals: {
				impressions: current.impressions,
				reach: current.reach,
				engagements: current.engagements,
				website_visits: current.website_visits,
				discovery_calls: current.discovery_calls,
				proposals_sent: current.proposals_sent,
				deals_closed: current.deals_closed,
				revenue: current.revenue
			},
			changes: {
				impressions_delta: impressionsDelta,
				reach_delta: reachDelta,
				engagements_delta: engagementsDelta
			},
			pipeline: {
				awareness: pipeline.awareness,
				consideration: pipeline.consideration,
				decision: pipeline.decision,
				won: pipeline.won,
				lost: pipeline.lost
			},
			pipeline_value: {
				total_estimated: totalEstimated,
				total_closed: totalClosed
			},
			conversion_rates: {
				impression_to_engagement: calculateConversionRate(current.engagements, current.impressions),
				visit_to_lead: calculateConversionRate(totalLeads, current.website_visits),
				lead_to_call: calculateConversionRate(current.discovery_calls, totalLeads),
				call_to_proposal: calculateConversionRate(current.proposals_sent, current.discovery_calls),
				proposal_to_close: calculateConversionRate(current.deals_closed, current.proposals_sent)
			}
		};

		return json(summary);
	} catch (err) {
		console.error('Funnel query error:', err);
		// Return empty summary if tables don't exist yet
		const emptySummary: FunnelSummary = {
			period: { start: startDate, end: endDate },
			totals: {
				impressions: 0,
				reach: 0,
				engagements: 0,
				website_visits: 0,
				discovery_calls: 0,
				proposals_sent: 0,
				deals_closed: 0,
				revenue: 0
			},
			changes: { impressions_delta: 0, reach_delta: 0, engagements_delta: 0 },
			pipeline: { awareness: 0, consideration: 0, decision: 0, won: 0, lost: 0 },
			pipeline_value: { total_estimated: 0, total_closed: 0 },
			conversion_rates: {
				impression_to_engagement: 0,
				visit_to_lead: 0,
				lead_to_call: 0,
				call_to_proposal: 0,
				proposal_to_close: 0
			}
		};
		return json(emptySummary);
	}
};

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const input: FunnelMetricsInput = await request.json();

	if (!input.date) {
		throw error(400, 'Date is required');
	}

	const id = generateId('fm');
	const now = new Date().toISOString();

	try {
		// Upsert: Update if date exists, insert if not
		await db
			.prepare(
				`
			INSERT INTO funnel_metrics (
				id, date,
				linkedin_impressions, linkedin_reach, linkedin_followers, linkedin_follower_delta,
				linkedin_engagements, linkedin_profile_views,
				website_visits, website_unique_visitors, content_downloads,
				discovery_calls_scheduled, discovery_calls_completed, proposals_sent,
				deals_closed, revenue_closed,
				notes, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(date) DO UPDATE SET
				linkedin_impressions = COALESCE(excluded.linkedin_impressions, linkedin_impressions),
				linkedin_reach = COALESCE(excluded.linkedin_reach, linkedin_reach),
				linkedin_followers = COALESCE(excluded.linkedin_followers, linkedin_followers),
				linkedin_follower_delta = COALESCE(excluded.linkedin_follower_delta, linkedin_follower_delta),
				linkedin_engagements = COALESCE(excluded.linkedin_engagements, linkedin_engagements),
				linkedin_profile_views = COALESCE(excluded.linkedin_profile_views, linkedin_profile_views),
				website_visits = COALESCE(excluded.website_visits, website_visits),
				website_unique_visitors = COALESCE(excluded.website_unique_visitors, website_unique_visitors),
				content_downloads = COALESCE(excluded.content_downloads, content_downloads),
				discovery_calls_scheduled = COALESCE(excluded.discovery_calls_scheduled, discovery_calls_scheduled),
				discovery_calls_completed = COALESCE(excluded.discovery_calls_completed, discovery_calls_completed),
				proposals_sent = COALESCE(excluded.proposals_sent, proposals_sent),
				deals_closed = COALESCE(excluded.deals_closed, deals_closed),
				revenue_closed = COALESCE(excluded.revenue_closed, revenue_closed),
				notes = COALESCE(excluded.notes, notes),
				updated_at = excluded.updated_at
		`
			)
			.bind(
				id,
				input.date,
				input.linkedin_impressions ?? null,
				input.linkedin_reach ?? null,
				input.linkedin_followers ?? null,
				input.linkedin_follower_delta ?? null,
				input.linkedin_engagements ?? null,
				input.linkedin_profile_views ?? null,
				input.website_visits ?? null,
				input.website_unique_visitors ?? null,
				input.content_downloads ?? null,
				input.discovery_calls_scheduled ?? null,
				input.discovery_calls_completed ?? null,
				input.proposals_sent ?? null,
				input.deals_closed ?? null,
				input.revenue_closed ?? null,
				input.notes ?? null,
				now,
				now
			)
			.run();

		return json({ success: true, date: input.date });
	} catch (err) {
		console.error('Funnel insert error:', err);
		throw error(500, 'Failed to record metrics');
	}
};
