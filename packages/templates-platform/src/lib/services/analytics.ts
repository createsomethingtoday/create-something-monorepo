/**
 * Analytics Service
 *
 * Tracks template deploys, workflow activations, and user engagement.
 * Designed to answer: "Are templates converting to .agency leads?"
 */

import type { D1Database } from '@cloudflare/workers-types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type EventType =
	| 'deploy'
	| 'deploy_start'
	| 'workflow_activation'
	| 'page_view'
	| 'upgrade_click'
	| 'agency_contact'
	| 'template_view'
	| 'landing_view';

export interface AnalyticsEvent {
	eventType: EventType;
	tenantId?: string;
	templateId?: string;
	userId?: string;
	metadata?: Record<string, unknown>;
	source?: string;
	referrer?: string;
	userAgent?: string;
	ipCountry?: string;
}

export interface DailyStats {
	date: string;
	templateId?: string;
	deploys: number;
	pageViews: number;
	landingViews: number;
	templateViews: number;
	deployStarts: number;
	deployCompletions: number;
	agencyClicks: number;
	upgradeClicks: number;
	workflowActivations: number;
}

export interface FunnelMetrics {
	period: string;
	landingViews: number;
	templateViews: number;
	deployStarts: number;
	deployCompletions: number;
	agencyClicks: number;
	conversionRate: number; // deployCompletions / landingViews
	agencyConversionRate: number; // agencyClicks / deployCompletions
}

export interface TemplateMetrics {
	templateId: string;
	templateName: string;
	deploys: number;
	activeWorkflows: number;
	agencyLeads: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRACKING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Track an analytics event
 */
export async function trackEvent(db: D1Database, event: AnalyticsEvent): Promise<string> {
	const id = crypto.randomUUID();

	await db
		.prepare(
			`INSERT INTO analytics_events (id, event_type, tenant_id, template_id, user_id, metadata, source, referrer, user_agent, ip_country)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			id,
			event.eventType,
			event.tenantId || null,
			event.templateId || null,
			event.userId || null,
			event.metadata ? JSON.stringify(event.metadata) : null,
			event.source || null,
			event.referrer || null,
			event.userAgent || null,
			event.ipCountry || null
		)
		.run();

	// Update daily aggregates
	await updateDailyStats(db, event);

	return id;
}

/**
 * Update daily aggregated stats (for fast dashboard queries)
 */
async function updateDailyStats(db: D1Database, event: AnalyticsEvent): Promise<void> {
	const today = new Date().toISOString().split('T')[0];
	const templateId = event.templateId || 'all';

	// Upsert daily stats row
	const existing = await db
		.prepare('SELECT id FROM analytics_daily WHERE date = ? AND template_id = ?')
		.bind(today, templateId)
		.first();

	if (!existing) {
		await db
			.prepare(
				`INSERT INTO analytics_daily (id, date, template_id)
         VALUES (?, ?, ?)`
			)
			.bind(crypto.randomUUID(), today, templateId)
			.run();
	}

	// Increment appropriate counter
	const columnMap: Partial<Record<EventType, string>> = {
		deploy: 'deploys',
		deploy_start: 'deploy_starts',
		page_view: 'page_views',
		landing_view: 'landing_views',
		template_view: 'template_views',
		agency_contact: 'agency_clicks',
		upgrade_click: 'upgrade_clicks',
		workflow_activation: 'workflow_activations'
	};

	const column = columnMap[event.eventType];
	if (column) {
		await db
			.prepare(
				`UPDATE analytics_daily
         SET ${column} = ${column} + 1, updated_at = datetime('now')
         WHERE date = ? AND template_id = ?`
			)
			.bind(today, templateId)
			.run();

		// Also update the 'all' aggregate if this is template-specific
		if (templateId !== 'all') {
			const allExists = await db
				.prepare('SELECT id FROM analytics_daily WHERE date = ? AND template_id = ?')
				.bind(today, 'all')
				.first();

			if (!allExists) {
				await db
					.prepare(
						`INSERT INTO analytics_daily (id, date, template_id)
             VALUES (?, ?, 'all')`
					)
					.bind(crypto.randomUUID(), today)
					.run();
			}

			await db
				.prepare(
					`UPDATE analytics_daily
           SET ${column} = ${column} + 1, updated_at = datetime('now')
           WHERE date = ? AND template_id = 'all'`
				)
				.bind(today)
				.run();
		}
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get funnel metrics for a time period
 */
export async function getFunnelMetrics(
	db: D1Database,
	days: number = 30
): Promise<FunnelMetrics> {
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - days);
	const startDateStr = startDate.toISOString().split('T')[0];

	const result = await db
		.prepare(
			`SELECT
        SUM(landing_views) as landing_views,
        SUM(template_views) as template_views,
        SUM(deploy_starts) as deploy_starts,
        SUM(deploys) as deploy_completions,
        SUM(agency_clicks) as agency_clicks
       FROM analytics_daily
       WHERE date >= ? AND template_id = 'all'`
		)
		.bind(startDateStr)
		.first<{
			landing_views: number;
			template_views: number;
			deploy_starts: number;
			deploy_completions: number;
			agency_clicks: number;
		}>();

	const landingViews = result?.landing_views || 0;
	const deployCompletions = result?.deploy_completions || 0;
	const agencyClicks = result?.agency_clicks || 0;

	return {
		period: `Last ${days} days`,
		landingViews,
		templateViews: result?.template_views || 0,
		deployStarts: result?.deploy_starts || 0,
		deployCompletions,
		agencyClicks,
		conversionRate: landingViews > 0 ? (deployCompletions / landingViews) * 100 : 0,
		agencyConversionRate: deployCompletions > 0 ? (agencyClicks / deployCompletions) * 100 : 0
	};
}

/**
 * Get daily stats for a time period
 */
export async function getDailyStats(
	db: D1Database,
	days: number = 30,
	templateId?: string
): Promise<DailyStats[]> {
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - days);
	const startDateStr = startDate.toISOString().split('T')[0];

	const { results } = await db
		.prepare(
			`SELECT * FROM analytics_daily
       WHERE date >= ? AND template_id = ?
       ORDER BY date ASC`
		)
		.bind(startDateStr, templateId || 'all')
		.all();

	return results.map((row) => ({
		date: row.date as string,
		templateId: row.template_id as string,
		deploys: row.deploys as number,
		pageViews: row.page_views as number,
		landingViews: row.landing_views as number,
		templateViews: row.template_views as number,
		deployStarts: row.deploy_starts as number,
		deployCompletions: row.deploys as number,
		agencyClicks: row.agency_clicks as number,
		upgradeClicks: row.upgrade_clicks as number,
		workflowActivations: row.workflow_activations as number
	}));
}

/**
 * Get template-level metrics
 */
export async function getTemplateMetrics(
	db: D1Database,
	days: number = 30
): Promise<TemplateMetrics[]> {
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - days);
	const startDateStr = startDate.toISOString().split('T')[0];

	const { results } = await db
		.prepare(
			`SELECT
        template_id,
        SUM(deploys) as total_deploys,
        SUM(workflow_activations) as total_workflows,
        SUM(agency_clicks) as total_agency
       FROM analytics_daily
       WHERE date >= ? AND template_id != 'all'
       GROUP BY template_id
       ORDER BY total_deploys DESC`
		)
		.bind(startDateStr)
		.all();

	return results.map((row) => ({
		templateId: row.template_id as string,
		templateName: row.template_id as string, // Would join with templates table in production
		deploys: row.total_deploys as number,
		activeWorkflows: row.total_workflows as number,
		agencyLeads: row.total_agency as number
	}));
}

/**
 * Get recent events for debugging/audit
 */
export async function getRecentEvents(
	db: D1Database,
	limit: number = 50
): Promise<Array<AnalyticsEvent & { id: string; createdAt: string }>> {
	const { results } = await db
		.prepare(
			`SELECT * FROM analytics_events
       ORDER BY created_at DESC
       LIMIT ?`
		)
		.bind(limit)
		.all();

	return results.map((row) => ({
		id: row.id as string,
		eventType: row.event_type as EventType,
		tenantId: row.tenant_id as string | undefined,
		templateId: row.template_id as string | undefined,
		userId: row.user_id as string | undefined,
		metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
		source: row.source as string | undefined,
		referrer: row.referrer as string | undefined,
		userAgent: row.user_agent as string | undefined,
		ipCountry: row.ip_country as string | undefined,
		createdAt: row.created_at as string
	}));
}

// ═══════════════════════════════════════════════════════════════════════════
// FEEDBACK
// ═══════════════════════════════════════════════════════════════════════════

export type FeedbackType = 'feature_request' | 'bug_report' | 'sdk_feedback' | 'general';
export type FeedbackStatus = 'new' | 'reviewed' | 'planned' | 'implemented' | 'wont_fix';

export interface Feedback {
	id?: string;
	userId?: string;
	tenantId?: string;
	type: FeedbackType;
	title?: string;
	description: string;
	source?: string;
	metadata?: Record<string, unknown>;
	status?: FeedbackStatus;
	createdAt?: string;
}

/**
 * Submit feedback
 */
export async function submitFeedback(db: D1Database, feedback: Feedback): Promise<string> {
	const id = crypto.randomUUID();

	await db
		.prepare(
			`INSERT INTO feedback (id, user_id, tenant_id, type, title, description, source, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			id,
			feedback.userId || null,
			feedback.tenantId || null,
			feedback.type,
			feedback.title || null,
			feedback.description,
			feedback.source || null,
			feedback.metadata ? JSON.stringify(feedback.metadata) : null
		)
		.run();

	return id;
}

/**
 * Get feedback by type
 */
export async function getFeedback(
	db: D1Database,
	options: { type?: FeedbackType; status?: FeedbackStatus; limit?: number } = {}
): Promise<Feedback[]> {
	let query = 'SELECT * FROM feedback WHERE 1=1';
	const bindings: (string | number)[] = [];

	if (options.type) {
		query += ' AND type = ?';
		bindings.push(options.type);
	}

	if (options.status) {
		query += ' AND status = ?';
		bindings.push(options.status);
	}

	query += ' ORDER BY created_at DESC';

	if (options.limit) {
		query += ' LIMIT ?';
		bindings.push(options.limit);
	}

	const stmt = db.prepare(query);
	const { results } = await stmt.bind(...bindings).all();

	return results.map((row) => ({
		id: row.id as string,
		userId: row.user_id as string | undefined,
		tenantId: row.tenant_id as string | undefined,
		type: row.type as FeedbackType,
		title: row.title as string | undefined,
		description: row.description as string,
		source: row.source as string | undefined,
		metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
		status: row.status as FeedbackStatus,
		createdAt: row.created_at as string
	}));
}

/**
 * Update feedback status
 */
export async function updateFeedbackStatus(
	db: D1Database,
	id: string,
	status: FeedbackStatus
): Promise<void> {
	await db
		.prepare(
			`UPDATE feedback SET status = ?, updated_at = datetime('now') WHERE id = ?`
		)
		.bind(status, id)
		.run();
}
