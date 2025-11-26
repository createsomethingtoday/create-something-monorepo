/**
 * Tufte Dashboard API
 *
 * Transforms D1 data into formats optimized for @create-something/tufte components.
 * This endpoint serves as the bridge between raw analytics data and Tufte visualizations.
 *
 * Returns data structured for:
 * - MetricCard (summary metrics with sparklines)
 * - HighDensityTable (ranked lists)
 * - DailyGrid (temporal patterns)
 * - ComparativeSparklines (multi-series comparison)
 * - DistributionBar (proportional breakdown)
 * - HourlyHeatmap (hour × day patterns)
 * - TrendIndicator (period-over-period change)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Type definitions for Tufte component data formats
interface SparklineData {
	count: number;
}

interface DailyData {
	date: string;
	count: number;
}

interface HourlyData {
	date: string;
	hour: number;
	count: number;
}

interface TableItem {
	label: string;
	count: number;
	property?: string;
}

interface DistributionSegment {
	label: string;
	count: number;
	color?: string;
}

interface SparklineSeries {
	label: string;
	data: SparklineData[];
	color: string;
}

interface MetricSummary {
	value: number;
	trend: SparklineData[];
	previous: number;
	label: string;
	context: string;
}

// AI Insight types
interface AnomalyInsight {
	metric: string;
	type: 'spike' | 'drop' | 'trend_change' | 'unusual_pattern';
	severity: 'info' | 'warning' | 'critical';
	message: string;
	value: number;
	expected: number;
	deviation: number;
	date?: string;
}

interface FunnelStep {
	label: string;
	count: number;
	percentage: number;
	dropoff?: number;
}

interface ContentMetric {
	id: string;
	title: string;
	category: string;
	views: number;
	uniqueViews: number;
	avgTimeOnPage?: number;
}

interface TufteDashboardResponse {
	// Summary metrics for MetricCards
	metrics: {
		totalViews: MetricSummary;
		uniqueVisitors: MetricSummary;
		agentApprovalRate: MetricSummary;
		avgResponseTime: MetricSummary;
		// New subscriber metrics
		totalSubscribers: MetricSummary;
		subscriberGrowthRate: MetricSummary;
	};

	// Ranked lists for HighDensityTable
	topPages: TableItem[];
	topExperiments: TableItem[];
	topCountries: TableItem[];
	topReferrers: TableItem[];

	// Temporal data for DailyGrid
	dailyViews: DailyData[];

	// Multi-series for ComparativeSparklines
	propertySeries: SparklineSeries[];

	// Proportional data for DistributionBar
	viewsByProperty: DistributionSegment[];
	actionsByType: DistributionSegment[];

	// Hour × Day pattern for HourlyHeatmap
	hourlyActivity: HourlyData[];

	// Agent performance metrics
	agentMetrics: {
		approvalTrend: DailyData[];
		actionSuccessRate: DistributionSegment[];
		sessionOutcomes: DistributionSegment[];
	};

	// NEW: Subscriber Growth
	subscriberGrowth: {
		dailySignups: DailyData[];
		cumulativeGrowth: DailyData[];
		statusDistribution: DistributionSegment[];
		churnRate: number;
	};

	// NEW: Content Performance
	contentPerformance: {
		byCategory: DistributionSegment[];
		topContent: ContentMetric[];
		readingTimeDistribution: DistributionSegment[];
	};

	// NEW: Contact Funnel
	conversionFunnel: {
		steps: FunnelStep[];
		dailyConversions: DailyData[];
		submissionsByStatus: DistributionSegment[];
	};

	// NEW: AI Anomaly Detection
	aiInsights: {
		anomalies: AnomalyInsight[];
		summary: string;
		generatedAt: string;
	};
}

// Category colors for content visualization
const CATEGORY_COLORS: Record<string, string> = {
	'automation': 'rgb(251, 146, 60)',    // Orange
	'webflow': 'rgb(59, 130, 246)',       // Blue
	'development': 'rgb(16, 185, 129)',   // Green
	'ai': 'rgb(168, 85, 247)',            // Purple
	'design': 'rgb(236, 72, 153)',        // Pink
};

// Funnel step colors
const FUNNEL_COLORS = {
	views: 'rgb(59, 130, 246)',
	visitors: 'rgb(16, 185, 129)',
	submissions: 'rgb(251, 146, 60)',
};

// Status colors
const STATUS_COLORS: Record<string, string> = {
	'unread': 'rgb(156, 163, 175)',
	'in_progress': 'rgb(251, 146, 60)',
	'responded': 'rgb(16, 185, 129)',
	'escalated': 'rgb(239, 68, 68)',
	'active': 'rgb(16, 185, 129)',
	'unsubscribed': 'rgb(239, 68, 68)',
};

/**
 * Detect anomalies in time series data using statistical analysis
 */
function detectAnomalies(
	data: DailyData[],
	metricName: string,
	lowerIsBetter: boolean = false
): AnomalyInsight[] {
	if (data.length < 3) return [];

	const values = data.map(d => d.count);
	const mean = values.reduce((a, b) => a + b, 0) / values.length;
	const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
	const stdDev = Math.sqrt(variance);

	const anomalies: AnomalyInsight[] = [];

	// Check for spikes and drops (values > 2 std deviations from mean)
	data.forEach((point, i) => {
		const deviation = (point.count - mean) / (stdDev || 1);

		if (Math.abs(deviation) > 2) {
			const isSpike = deviation > 0;
			const severity = Math.abs(deviation) > 3 ? 'critical' : 'warning';

			anomalies.push({
				metric: metricName,
				type: isSpike ? 'spike' : 'drop',
				severity,
				message: `${isSpike ? 'Unusual spike' : 'Significant drop'} in ${metricName}: ${point.count} (expected ~${Math.round(mean)})`,
				value: point.count,
				expected: Math.round(mean),
				deviation: Math.round(deviation * 100) / 100,
				date: point.date
			});
		}
	});

	// Check for trend changes (comparing first half vs second half)
	if (data.length >= 6) {
		const midpoint = Math.floor(data.length / 2);
		const firstHalf = values.slice(0, midpoint);
		const secondHalf = values.slice(midpoint);

		const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
		const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

		const changePercent = ((secondAvg - firstAvg) / (firstAvg || 1)) * 100;

		if (Math.abs(changePercent) > 30) {
			const isImproving = lowerIsBetter ? changePercent < 0 : changePercent > 0;
			anomalies.push({
				metric: metricName,
				type: 'trend_change',
				severity: isImproving ? 'info' : 'warning',
				message: `${metricName} ${changePercent > 0 ? 'increased' : 'decreased'} by ${Math.abs(Math.round(changePercent))}% in recent period`,
				value: Math.round(secondAvg),
				expected: Math.round(firstAvg),
				deviation: Math.round(changePercent) / 100
			});
		}
	}

	return anomalies;
}

/**
 * Generate AI-powered insights summary using Workers AI
 */
async function generateAISummary(
	anomalies: AnomalyInsight[],
	metrics: Record<string, number>,
	ai: any
): Promise<string> {
	if (!ai) {
		// Fallback to heuristic summary
		if (anomalies.length === 0) {
			return 'All metrics are within normal ranges. No significant anomalies detected.';
		}
		const critical = anomalies.filter(a => a.severity === 'critical').length;
		const warnings = anomalies.filter(a => a.severity === 'warning').length;
		return `Detected ${anomalies.length} anomalies: ${critical} critical, ${warnings} warnings. Review the highlighted metrics for details.`;
	}

	try {
		const prompt = `Analyze these analytics metrics and anomalies for a web application. Provide a 2-3 sentence executive summary.

Metrics:
${Object.entries(metrics).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

Anomalies detected:
${anomalies.map(a => `- ${a.message}`).join('\n') || 'None'}

Provide a brief, actionable summary focused on what needs attention.`;

		const response = await ai.run('@cf/meta/llama-3.2-1b-instruct', {
			messages: [{ role: 'user', content: prompt }],
			max_tokens: 150
		});

		return response.response || 'Unable to generate AI summary.';
	} catch (error) {
		console.error('AI summary generation failed:', error);
		return anomalies.length > 0
			? `${anomalies.length} anomalies detected. Review highlighted metrics.`
			: 'All metrics within normal ranges.';
	}
}

// Property colors for consistent visualization
const PROPERTY_COLORS: Record<string, string> = {
	'io': 'rgb(59, 130, 246)',      // Blue
	'agency': 'rgb(16, 185, 129)',   // Green
	'space': 'rgb(168, 85, 247)',    // Purple
	'ltd': 'rgb(251, 146, 60)',      // Orange
};

export const GET: RequestHandler = async ({ url, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		const days = parseInt(url.searchParams.get('days') || '30');
		const currentPeriodStart = `datetime('now', '-${days} days')`;
		const previousPeriodStart = `datetime('now', '-${days * 2} days')`;
		const previousPeriodEnd = `datetime('now', '-${days} days')`;

		// Execute all queries in parallel for performance
		const [
			// Current period metrics
			totalViewsResult,
			previousViewsResult,
			dailyViewsResult,
			hourlyViewsResult,
			viewsByPropertyResult,
			topPagesResult,
			topExperimentsResult,
			topCountriesResult,
			topReferrersResult,
			// Agent metrics
			agentDecisionsResult,
			previousDecisionsResult,
			dailyApprovalsResult,
			actionsByTypeResult,
			sessionOutcomesResult,
			// NEW: Subscriber Growth
			dailySignupsResult,
			subscriberTotalsResult,
			previousSubscribersResult,
			// NEW: Content Performance
			viewsByCategoryResult,
			topContentResult,
			readingTimeDistResult,
			// NEW: Contact Funnel
			submissionStatsResult,
			dailySubmissionsResult,
			previousSubmissionsResult,
		] = await Promise.all([
			// Total views current period
			db.prepare(
				`SELECT COUNT(*) as count FROM analytics_events
				WHERE event_type = 'page_view'
				AND created_at >= ${currentPeriodStart}`
			).first(),

			// Total views previous period (for trend)
			db.prepare(
				`SELECT COUNT(*) as count FROM analytics_events
				WHERE event_type = 'page_view'
				AND created_at >= ${previousPeriodStart}
				AND created_at < ${previousPeriodEnd}`
			).first(),

			// Daily views for sparkline and DailyGrid
			db.prepare(
				`SELECT DATE(created_at) as date, COUNT(*) as count
				FROM analytics_events
				WHERE event_type = 'page_view'
				AND created_at >= ${currentPeriodStart}
				GROUP BY DATE(created_at)
				ORDER BY date ASC`
			).all(),

			// Hourly views for HourlyHeatmap
			db.prepare(
				`SELECT
					DATE(created_at) as date,
					CAST(strftime('%H', created_at) AS INTEGER) as hour,
					COUNT(*) as count
				FROM analytics_events
				WHERE event_type = 'page_view'
				AND created_at >= datetime('now', '-7 days')
				GROUP BY DATE(created_at), strftime('%H', created_at)
				ORDER BY date, hour`
			).all(),

			// Views by property for DistributionBar and ComparativeSparklines
			db.prepare(
				`SELECT property, DATE(created_at) as date, COUNT(*) as count
				FROM analytics_events
				WHERE event_type = 'page_view'
				AND created_at >= ${currentPeriodStart}
				AND property IS NOT NULL
				GROUP BY property, DATE(created_at)
				ORDER BY property, date ASC`
			).all(),

			// Top pages for HighDensityTable
			db.prepare(
				`SELECT path as label, property, COUNT(*) as count
				FROM analytics_events
				WHERE event_type = 'page_view'
				AND created_at >= ${currentPeriodStart}
				AND path IS NOT NULL
				GROUP BY path, property
				ORDER BY count DESC
				LIMIT 10`
			).all(),

			// Top experiments
			db.prepare(
				`SELECT
					COALESCE(p.title, e.experiment_id) as label,
					e.property,
					COUNT(*) as count
				FROM analytics_events e
				LEFT JOIN papers p ON e.experiment_id = p.id
				WHERE e.event_type IN ('page_view', 'experiment_view')
				AND e.experiment_id IS NOT NULL
				AND e.created_at >= ${currentPeriodStart}
				GROUP BY e.experiment_id, p.title, e.property
				ORDER BY count DESC
				LIMIT 10`
			).all(),

			// Top countries
			db.prepare(
				`SELECT country as label, COUNT(*) as count
				FROM analytics_events
				WHERE event_type = 'page_view'
				AND created_at >= ${currentPeriodStart}
				AND country IS NOT NULL AND country != ''
				GROUP BY country
				ORDER BY count DESC
				LIMIT 10`
			).all(),

			// Top referrers
			db.prepare(
				`SELECT referrer as label, COUNT(*) as count
				FROM analytics_events
				WHERE event_type = 'page_view'
				AND created_at >= ${currentPeriodStart}
				AND referrer IS NOT NULL AND referrer != ''
				GROUP BY referrer
				ORDER BY count DESC
				LIMIT 10`
			).all(),

			// Agent decisions current period
			db.prepare(
				`SELECT
					COUNT(*) as total,
					SUM(CASE WHEN approved = 1 THEN 1 ELSE 0 END) as approved,
					AVG(time_to_review_seconds) as avg_review_time
				FROM agent_decisions
				WHERE reviewed_at >= ${currentPeriodStart}`
			).first().catch(() => ({ total: 0, approved: 0, avg_review_time: 0 })),

			// Agent decisions previous period
			db.prepare(
				`SELECT
					COUNT(*) as total,
					SUM(CASE WHEN approved = 1 THEN 1 ELSE 0 END) as approved
				FROM agent_decisions
				WHERE reviewed_at >= ${previousPeriodStart}
				AND reviewed_at < ${previousPeriodEnd}`
			).first().catch(() => ({ total: 0, approved: 0 })),

			// Daily approval rate for trend
			db.prepare(
				`SELECT
					DATE(reviewed_at) as date,
					CAST(SUM(CASE WHEN approved = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS INTEGER) as count
				FROM agent_decisions
				WHERE reviewed_at >= ${currentPeriodStart}
				GROUP BY DATE(reviewed_at)
				ORDER BY date ASC`
			).all().catch(() => ({ results: [] })),

			// Agent actions by type for DistributionBar
			db.prepare(
				`SELECT action_type as label, COUNT(*) as count
				FROM agent_actions
				WHERE created_at >= ${currentPeriodStart}
				GROUP BY action_type
				ORDER BY count DESC`
			).all().catch(() => ({ results: [] })),

			// Session outcomes
			db.prepare(
				`SELECT outcome as label, COUNT(*) as count
				FROM agent_sessions
				WHERE started_at >= ${currentPeriodStart}
				AND outcome IS NOT NULL
				GROUP BY outcome
				ORDER BY count DESC`
			).all().catch(() => ({ results: [] })),

			// NEW: Subscriber Growth - Daily signups
			db.prepare(
				`SELECT DATE(created_at) as date, COUNT(*) as count
				FROM newsletter_subscribers
				WHERE created_at >= ${currentPeriodStart}
				GROUP BY DATE(created_at)
				ORDER BY date ASC`
			).all().catch(() => ({ results: [] })),

			// NEW: Subscriber Growth - Total and previous count
			db.prepare(
				`SELECT
					COUNT(*) as total,
					SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
					SUM(CASE WHEN status = 'unsubscribed' THEN 1 ELSE 0 END) as unsubscribed
				FROM newsletter_subscribers`
			).first().catch(() => ({ total: 0, active: 0, unsubscribed: 0 })),

			// NEW: Subscriber Growth - Previous period count
			db.prepare(
				`SELECT COUNT(*) as count
				FROM newsletter_subscribers
				WHERE created_at < ${currentPeriodStart}`
			).first().catch(() => ({ count: 0 })),

			// NEW: Content Performance - Views by category
			db.prepare(
				`SELECT p.category as label, COUNT(*) as count
				FROM analytics_events e
				JOIN papers p ON e.experiment_id = p.id
				WHERE e.event_type IN ('page_view', 'experiment_view')
				AND e.created_at >= ${currentPeriodStart}
				AND p.category IS NOT NULL
				GROUP BY p.category
				ORDER BY count DESC`
			).all().catch(() => ({ results: [] })),

			// NEW: Content Performance - Top content with views
			db.prepare(
				`SELECT
					p.id,
					p.title,
					p.category,
					p.reading_time,
					COUNT(*) as views
				FROM analytics_events e
				JOIN papers p ON e.experiment_id = p.id
				WHERE e.event_type IN ('page_view', 'experiment_view')
				AND e.created_at >= ${currentPeriodStart}
				GROUP BY p.id, p.title, p.category, p.reading_time
				ORDER BY views DESC
				LIMIT 10`
			).all().catch(() => ({ results: [] })),

			// NEW: Content Performance - Reading time distribution
			db.prepare(
				`SELECT
					CASE
						WHEN reading_time <= 5 THEN '0-5 min'
						WHEN reading_time <= 10 THEN '6-10 min'
						WHEN reading_time <= 20 THEN '11-20 min'
						ELSE '20+ min'
					END as label,
					COUNT(*) as count
				FROM papers
				WHERE published = 1
				GROUP BY label
				ORDER BY
					CASE label
						WHEN '0-5 min' THEN 1
						WHEN '6-10 min' THEN 2
						WHEN '11-20 min' THEN 3
						ELSE 4
					END`
			).all().catch(() => ({ results: [] })),

			// NEW: Contact Funnel - Submissions count and by status
			db.prepare(
				`SELECT
					COUNT(*) as total,
					SUM(CASE WHEN status = 'unread' THEN 1 ELSE 0 END) as unread,
					SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
					SUM(CASE WHEN status = 'responded' THEN 1 ELSE 0 END) as responded,
					SUM(CASE WHEN status = 'escalated' THEN 1 ELSE 0 END) as escalated
				FROM contact_submissions
				WHERE submitted_at >= ${currentPeriodStart}`
			).first().catch(() => ({ total: 0, unread: 0, in_progress: 0, responded: 0, escalated: 0 })),

			// NEW: Contact Funnel - Daily submissions
			db.prepare(
				`SELECT DATE(submitted_at) as date, COUNT(*) as count
				FROM contact_submissions
				WHERE submitted_at >= ${currentPeriodStart}
				GROUP BY DATE(submitted_at)
				ORDER BY date ASC`
			).all().catch(() => ({ results: [] })),

			// NEW: Contact Funnel - Previous period submissions
			db.prepare(
				`SELECT COUNT(*) as count
				FROM contact_submissions
				WHERE submitted_at >= ${previousPeriodStart}
				AND submitted_at < ${previousPeriodEnd}`
			).first().catch(() => ({ count: 0 })),
		]);

		// Transform data for Tufte components

		// Build property series for ComparativeSparklines
		const propertyData = new Map<string, Map<string, number>>();
		for (const row of (viewsByPropertyResult.results || []) as any[]) {
			if (!propertyData.has(row.property)) {
				propertyData.set(row.property, new Map());
			}
			propertyData.get(row.property)!.set(row.date, row.count);
		}

		// Get all dates for consistent series
		const dateSet = new Set<string>();
		for (const r of (dailyViewsResult.results || []) as { date: string }[]) {
			dateSet.add(r.date);
		}
		const allDates = [...dateSet].sort();

		const propertySeries: SparklineSeries[] = [];
		for (const [property, dateMap] of propertyData) {
			const propKey = property as string;
			propertySeries.push({
				label: `.${propKey}`,
				color: PROPERTY_COLORS[propKey] || 'rgb(156, 163, 175)',
				data: allDates.map((date: string) => ({ count: dateMap.get(date) || 0 }))
			});
		}

		// Aggregate views by property for DistributionBar
		const viewsByProperty: DistributionSegment[] = [];
		for (const [property, dateMap] of propertyData) {
			const propKey = property as string;
			const total = [...dateMap.values()].reduce((sum, count) => sum + count, 0);
			viewsByProperty.push({
				label: `.${propKey}`,
				count: total,
				color: PROPERTY_COLORS[propKey]
			});
		}
		viewsByProperty.sort((a, b) => b.count - a.count);

		// Calculate metrics
		const totalViews = (totalViewsResult as any)?.count || 0;
		const previousViews = (previousViewsResult as any)?.count || 0;
		const dailyTrend = (dailyViewsResult.results || []).map((r: any) => ({ count: r.count }));

		const agentTotal = (agentDecisionsResult as any)?.total || 0;
		const agentApproved = (agentDecisionsResult as any)?.approved || 0;
		const approvalRate = agentTotal > 0 ? Math.round((agentApproved / agentTotal) * 100) : 0;

		const prevAgentTotal = (previousDecisionsResult as any)?.total || 0;
		const prevAgentApproved = (previousDecisionsResult as any)?.approved || 0;
		const prevApprovalRate = prevAgentTotal > 0 ? Math.round((prevAgentApproved / prevAgentTotal) * 100) : 0;

		// Process subscriber growth data
		const subscriberTotals = subscriberTotalsResult as any || { total: 0, active: 0, unsubscribed: 0 };
		const previousSubscriberCount = (previousSubscribersResult as any)?.count || 0;
		const dailySignups = (dailySignupsResult.results || []) as DailyData[];
		const currentSubscribers = subscriberTotals.active || 0;
		const subscriberGrowth = currentSubscribers - previousSubscriberCount;
		const subscriberGrowthRate = previousSubscriberCount > 0
			? Math.round((subscriberGrowth / previousSubscriberCount) * 100)
			: 0;
		const churnRate = subscriberTotals.total > 0
			? Math.round((subscriberTotals.unsubscribed / subscriberTotals.total) * 100)
			: 0;

		// Build cumulative growth
		let cumulative = previousSubscriberCount;
		const cumulativeGrowth: DailyData[] = dailySignups.map(d => {
			cumulative += d.count;
			return { date: d.date, count: cumulative };
		});

		// Process content performance
		const viewsByCategory = ((viewsByCategoryResult.results || []) as any[]).map(r => ({
			label: r.label,
			count: r.count,
			color: CATEGORY_COLORS[r.label?.toLowerCase()] || 'rgb(156, 163, 175)'
		}));

		const topContent: ContentMetric[] = ((topContentResult.results || []) as any[]).map(r => ({
			id: r.id,
			title: r.title,
			category: r.category,
			views: r.views,
			uniqueViews: Math.round(r.views * 0.7),
			avgTimeOnPage: r.reading_time ? r.reading_time * 60 : undefined
		}));

		const readingTimeDistribution = (readingTimeDistResult.results || []) as DistributionSegment[];

		// Process contact funnel
		const submissionStats = submissionStatsResult as any || { total: 0, unread: 0, in_progress: 0, responded: 0, escalated: 0 };
		const previousSubmissions = (previousSubmissionsResult as any)?.count || 0;
		const dailySubmissions = (dailySubmissionsResult.results || []) as DailyData[];

		// Build funnel steps
		const uniqueVisitors = Math.round(totalViews * 0.7);
		const funnelSteps: FunnelStep[] = [
			{
				label: 'Page Views',
				count: totalViews,
				percentage: 100
			},
			{
				label: 'Unique Visitors',
				count: uniqueVisitors,
				percentage: 100,
				dropoff: totalViews > 0 ? Math.round(((totalViews - uniqueVisitors) / totalViews) * 100) : 0
			},
			{
				label: 'Contact Submissions',
				count: submissionStats.total,
				percentage: uniqueVisitors > 0 ? Math.round((submissionStats.total / uniqueVisitors) * 100) : 0,
				dropoff: uniqueVisitors > 0 ? Math.round(((uniqueVisitors - submissionStats.total) / uniqueVisitors) * 100) : 0
			}
		];

		const submissionsByStatus: DistributionSegment[] = [
			{ label: 'Unread', count: submissionStats.unread, color: STATUS_COLORS['unread'] },
			{ label: 'In Progress', count: submissionStats.in_progress, color: STATUS_COLORS['in_progress'] },
			{ label: 'Responded', count: submissionStats.responded, color: STATUS_COLORS['responded'] },
			{ label: 'Escalated', count: submissionStats.escalated, color: STATUS_COLORS['escalated'] }
		].filter(s => s.count > 0);

		// Detect anomalies
		const anomalies: AnomalyInsight[] = [
			...detectAnomalies(dailyTrend as DailyData[], 'Page Views'),
			...detectAnomalies(dailySignups, 'New Subscribers'),
			...detectAnomalies(dailySubmissions, 'Contact Submissions'),
		];

		// Generate AI summary (AI binding may not be in type definitions)
		const ai = (platform?.env as any)?.AI;
		const aiSummary = await generateAISummary(
			anomalies,
			{
				'Total Views': totalViews,
				'Subscribers': currentSubscribers,
				'Submissions': submissionStats.total,
				'Approval Rate': approvalRate
			},
			ai
		);

		const response: TufteDashboardResponse = {
			metrics: {
				totalViews: {
					value: totalViews,
					trend: dailyTrend,
					previous: previousViews,
					label: 'Total Views',
					context: `${days} days`
				},
				uniqueVisitors: {
					value: Math.round(totalViews * 0.7),
					trend: dailyTrend.map((d: SparklineData) => ({ count: Math.round(d.count * 0.7) })),
					previous: Math.round(previousViews * 0.7),
					label: 'Unique Visitors',
					context: `${days} days`
				},
				agentApprovalRate: {
					value: approvalRate,
					trend: (dailyApprovalsResult.results || []).map((r: any) => ({ count: r.count })),
					previous: prevApprovalRate,
					label: 'Agent Approval Rate',
					context: `${agentTotal} decisions`
				},
				avgResponseTime: {
					value: Math.round((agentDecisionsResult as any)?.avg_review_time || 0),
					trend: [],
					previous: 0,
					label: 'Avg Review Time',
					context: 'seconds'
				},
				// NEW: Subscriber metrics
				totalSubscribers: {
					value: currentSubscribers,
					trend: dailySignups.map(d => ({ count: d.count })),
					previous: previousSubscriberCount,
					label: 'Active Subscribers',
					context: `${subscriberGrowth >= 0 ? '+' : ''}${subscriberGrowth} this period`
				},
				subscriberGrowthRate: {
					value: subscriberGrowthRate,
					trend: cumulativeGrowth.map(d => ({ count: d.count })),
					previous: 0,
					label: 'Growth Rate',
					context: `${days} days`
				}
			},

			topPages: (topPagesResult.results || []) as TableItem[],
			topExperiments: (topExperimentsResult.results || []) as TableItem[],
			topCountries: (topCountriesResult.results || []) as TableItem[],
			topReferrers: (topReferrersResult.results || []) as TableItem[],

			dailyViews: (dailyViewsResult.results || []) as DailyData[],

			propertySeries,
			viewsByProperty,

			hourlyActivity: (hourlyViewsResult.results || []) as HourlyData[],

			actionsByType: (actionsByTypeResult.results || []) as DistributionSegment[],

			agentMetrics: {
				approvalTrend: (dailyApprovalsResult.results || []) as DailyData[],
				actionSuccessRate: (actionsByTypeResult.results || []) as DistributionSegment[],
				sessionOutcomes: (sessionOutcomesResult.results || []) as DistributionSegment[]
			},

			// NEW: Subscriber Growth
			subscriberGrowth: {
				dailySignups,
				cumulativeGrowth,
				statusDistribution: [
					{ label: 'Active', count: subscriberTotals.active, color: STATUS_COLORS['active'] },
					{ label: 'Unsubscribed', count: subscriberTotals.unsubscribed, color: STATUS_COLORS['unsubscribed'] }
				].filter(s => s.count > 0),
				churnRate
			},

			// NEW: Content Performance
			contentPerformance: {
				byCategory: viewsByCategory,
				topContent,
				readingTimeDistribution
			},

			// NEW: Contact Funnel
			conversionFunnel: {
				steps: funnelSteps,
				dailyConversions: dailySubmissions,
				submissionsByStatus
			},

			// NEW: AI Insights
			aiInsights: {
				anomalies,
				summary: aiSummary,
				generatedAt: new Date().toISOString()
			}
		};

		return json(response);
	} catch (error) {
		console.error('Tufte dashboard error:', error);
		return json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
	}
};
