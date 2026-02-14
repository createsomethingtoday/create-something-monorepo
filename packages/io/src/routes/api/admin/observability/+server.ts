/**
 * Agent Observability API
 *
 * Queries agentic_sessions, agentic_iterations, and agentic_events tables
 * in io's D1 database (create-something-db).
 *
 * Supports mixed Unix timestamp units (seconds and milliseconds).
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface AgentSummary {
	name: string;
	executions: number;
	successRate: number;
	avgDuration: number;
	totalCost: number;
}

interface TaskSummary {
	ready: number;
	claimed: number;
	blocked: number;
	done: number;
	cancelled: number;
	totalCost: number;
}

interface TraceSummary {
	total: number;
	errors: number;
	avgTokens: number;
	byTouchpoint: Record<string, number>;
	byAiTask: Record<string, number>;
}

interface ObservabilityData {
	tasks: TaskSummary;
	agents: AgentSummary[];
	traces: TraceSummary;
	recentActivity: Array<{
		id: string;
		type: 'task' | 'trace' | 'session';
		name: string;
		status: string;
		timestamp: string;
		cost?: number;
	}>;
	costTrend: Array<{
		date: string;
		cost: number;
	}>;
	hasData: boolean;
}

const DEFAULT_DAYS = 7;
const MAX_DAYS = 90;
const RECENT_ACTIVITY_LIMIT = 20;
const TIMESTAMP_MILLISECONDS_THRESHOLD = 10_000_000_000;

function toUnixSecondsSql(column: string): string {
	return `CASE WHEN ${column} > ${TIMESTAMP_MILLISECONDS_THRESHOLD} THEN ${column} / 1000.0 ELSE ${column} END`;
}

function normalizeUnixTimestampToMillis(value: unknown): number {
	const parsed = toSafeNumber(value);
	if (parsed <= 0) return 0;
	return parsed > TIMESTAMP_MILLISECONDS_THRESHOLD ? parsed : parsed * 1000;
}

function toSafeNumber(value: unknown): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string') {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return 0;
}

function parseDays(value: string | null): number {
	const parsed = Number.parseInt(value ?? String(DEFAULT_DAYS), 10);
	if (Number.isNaN(parsed)) return DEFAULT_DAYS;
	return Math.max(1, Math.min(MAX_DAYS, parsed));
}

export const GET: RequestHandler = async ({ platform, url, locals }) => {
	if (locals.user?.role !== 'admin') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const db = platform?.env?.DB;
	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const days = parseDays(url.searchParams.get('days'));

	try {
		const [tasks, agents, traces, recentActivity, costTrend] = await Promise.all([
			getTaskSummary(db, days),
			getAgentSummary(db, days),
			getTraceSummary(db, days),
			getRecentActivity(db, days, RECENT_ACTIVITY_LIMIT),
			getCostTrend(db, days)
		]);

		const totalSessions = tasks.ready + tasks.claimed + tasks.blocked + tasks.done + tasks.cancelled;

		const data: ObservabilityData = {
			tasks,
			agents,
			traces,
			recentActivity,
			costTrend,
			hasData: false
		};

		// Determine if any real data exists
		data.hasData =
			totalSessions > 0 ||
			data.tasks.totalCost > 0 ||
			data.traces.total > 0 ||
			data.recentActivity.length > 0;

		return json(data, {
			headers: {
				'Cache-Control': 'no-store'
			}
		});
	} catch (err) {
		console.error('Observability API error:', err);
		return json({ error: 'Failed to fetch observability data' }, { status: 500 });
	}
};

const emptySummary: TaskSummary = {
	ready: 0,
	claimed: 0,
	blocked: 0,
	done: 0,
	cancelled: 0,
	totalCost: 0
};

async function getTaskSummary(db: D1Database | undefined, days: number): Promise<TaskSummary> {
	if (!db) return emptySummary;

	try {
		const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
		const startedAtSeconds = toUnixSecondsSql('started_at');
		const result = await db
			.prepare(
				`
				SELECT
					SUM(CASE WHEN status IN ('pending', 'queued') THEN 1 ELSE 0 END) as ready,
				SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as claimed,
				SUM(CASE WHEN status IN ('blocked', 'paused') THEN 1 ELSE 0 END) as blocked,
					SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) as done,
					SUM(CASE WHEN status IN ('error', 'budget_exhausted', 'cancelled') THEN 1 ELSE 0 END) as cancelled,
					COALESCE(SUM(cost_consumed), 0) as totalCost
				FROM agentic_sessions
				WHERE ${startedAtSeconds} >= ?
			`
				)
				.bind(cutoff)
			.first<{
				ready: number | string | null;
				claimed: number | string | null;
				blocked: number | string | null;
				done: number | string | null;
				cancelled: number | string | null;
				totalCost: number | string | null;
			}>();

		return {
			ready: toSafeNumber(result?.ready),
			claimed: toSafeNumber(result?.claimed),
			blocked: toSafeNumber(result?.blocked),
			done: toSafeNumber(result?.done),
			cancelled: toSafeNumber(result?.cancelled),
			totalCost: toSafeNumber(result?.totalCost)
		};
	} catch (err) {
		console.error('Failed to query task summary:', err);
		return emptySummary;
	}
}

async function getAgentSummary(
	db: D1Database | undefined,
	days: number
): Promise<AgentSummary[]> {
	if (!db) return [];

	try {
		const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
		const startedAtSeconds = toUnixSecondsSql('started_at');
		const completedAtSeconds = toUnixSecondsSql('completed_at');
		const result = await db
			.prepare(
				`
				SELECT
					COUNT(*) as executions,
					SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) as successfulExecutions,
					SUM(CASE WHEN status IN ('complete', 'error', 'budget_exhausted', 'cancelled') THEN 1 ELSE 0 END) as terminalExecutions,
					AVG(CASE WHEN completed_at IS NOT NULL THEN ${completedAtSeconds} - ${startedAtSeconds} END) as avgDuration,
					COALESCE(SUM(cost_consumed), 0) as totalCost
				FROM agentic_sessions
				WHERE ${startedAtSeconds} >= ?
			`
				)
				.bind(cutoff)
			.first<{
				executions: number | string | null;
				successfulExecutions: number | string | null;
				terminalExecutions: number | string | null;
				avgDuration: number | string | null;
				totalCost: number | string | null;
			}>();

		const executions = toSafeNumber(result?.executions);
		const successfulExecutions = toSafeNumber(result?.successfulExecutions);
		const terminalExecutions = toSafeNumber(result?.terminalExecutions);
		const successRate = terminalExecutions > 0 ? (successfulExecutions / terminalExecutions) * 100 : 0;

		if (executions > 0) {
			return [
				{
					name: 'agentic-executor',
					executions,
					successRate,
					avgDuration: toSafeNumber(result?.avgDuration),
					totalCost: toSafeNumber(result?.totalCost)
				}
			];
		}
		return [];
	} catch (err) {
		console.error('Failed to query agent summary:', err);
		return [];
	}
}

async function getTraceSummary(
	db: D1Database | undefined,
	days: number
): Promise<TraceSummary> {
	const summary: TraceSummary = {
		total: 0,
		errors: 0,
		avgTokens: 0,
		byTouchpoint: {},
		byAiTask: {}
	};

	if (!db) return summary;

	try {
		const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
		const createdAtSeconds = toUnixSecondsSql('created_at');

		const [iterationTotals, errorTotals, toolResults, eventBreakdown] = await Promise.all([
			db
				.prepare(
					`
					SELECT
						COUNT(*) as total,
						AVG(COALESCE(input_tokens + output_tokens, 0)) as avgTokens
					FROM agentic_iterations
					WHERE ${createdAtSeconds} >= ?
				`
					)
				.bind(cutoff)
				.first<{
					total: number | string | null;
					avgTokens: number | string | null;
				}>(),
			db
				.prepare(
					`
					SELECT COUNT(*) as errors
					FROM agentic_events
					WHERE event_type IN ('quality_gate_failed', 'budget_exhausted', 'completion_rejected', 'session_error')
					AND ${createdAtSeconds} >= ?
				`
					)
				.bind(cutoff)
				.first<{ errors: number | string | null }>(),
			db
				.prepare(
					`
					SELECT tools_used, COUNT(*) as count
					FROM agentic_iterations
					WHERE ${createdAtSeconds} >= ?
					AND tools_used IS NOT NULL
					AND trim(tools_used) != ''
				GROUP BY tools_used
				ORDER BY count DESC
				LIMIT 50
			`
				)
				.bind(cutoff)
				.all<{ tools_used: string; count: number | string }>(),
			db
				.prepare(
					`
					SELECT event_type, COUNT(*) as count
					FROM agentic_events
					WHERE ${createdAtSeconds} >= ?
					GROUP BY event_type
					ORDER BY count DESC
				LIMIT 10
			`
				)
				.bind(cutoff)
				.all<{ event_type: string; count: number | string }>()
		]);

		summary.total = toSafeNumber(iterationTotals?.total);
		summary.avgTokens = toSafeNumber(iterationTotals?.avgTokens);
		summary.errors = toSafeNumber(errorTotals?.errors);

		const touchpointCounts: Record<string, number> = {};
		for (const row of toolResults.results ?? []) {
			const count = toSafeNumber(row.count);
			for (const tool of row.tools_used.split(',').map((token) => token.trim())) {
				if (!tool) continue;
				touchpointCounts[tool] = (touchpointCounts[tool] || 0) + count;
			}
		}

		for (const [touchpoint, count] of Object.entries(touchpointCounts)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)) {
			summary.byTouchpoint[touchpoint] = count;
		}

		for (const row of eventBreakdown.results ?? []) {
			if (!row.event_type) continue;
			summary.byAiTask[row.event_type] = toSafeNumber(row.count);
		}
	} catch (err) {
		console.error('Failed to query trace summary:', err);
		// Tables might not exist yet
	}

	return summary;
}

async function getRecentActivity(db: D1Database | undefined, days: number, limit: number) {
	const activity: ObservabilityData['recentActivity'] = [];

	if (!db) return activity;

	try {
		const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
		const startedAtSeconds = toUnixSecondsSql('started_at');
		const createdAtSeconds = toUnixSecondsSql('created_at');
		const [sessions, events] = await Promise.all([
			db
				.prepare(
					`
				SELECT
					id,
						status,
						cost_consumed,
						started_at
					FROM agentic_sessions
					WHERE ${startedAtSeconds} >= ?
					ORDER BY ${startedAtSeconds} DESC
					LIMIT ?
				`
					)
				.bind(cutoff, limit)
				.all<{
					id: string;
					status: string;
					cost_consumed: number | string | null;
					started_at: number | string;
				}>(),
			db
				.prepare(
					`
				SELECT
					id,
						event_type,
						created_at
					FROM agentic_events
					WHERE ${createdAtSeconds} >= ?
					ORDER BY ${createdAtSeconds} DESC
					LIMIT ?
				`
					)
				.bind(cutoff, limit)
				.all<{
					id: number | string;
					event_type: string;
					created_at: number | string;
				}>()
			]);

			for (const session of sessions.results ?? []) {
				const timestamp = normalizeUnixTimestampToMillis(session.started_at);
				activity.push({
					id: session.id,
					type: 'session',
				name: `Session ${session.id.slice(0, 8)}`,
				status: session.status || 'unknown',
				timestamp: new Date(timestamp).toISOString(),
				cost: toSafeNumber(session.cost_consumed)
			});
			}

			for (const event of events.results ?? []) {
				const timestamp = normalizeUnixTimestampToMillis(event.created_at);
				const isErrorEvent =
					event.event_type.includes('error') ||
					event.event_type.includes('failed') ||
				event.event_type.includes('exhausted');
			activity.push({
				id: `event-${event.id}`,
				type: 'task',
				name: event.event_type.replaceAll('_', ' '),
				status: isErrorEvent ? 'error' : 'complete',
				timestamp: new Date(timestamp).toISOString()
			});
		}
	} catch (err) {
		console.error('Failed to query recent activity:', err);
		// Table might not exist yet
	}

	activity.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
	return activity.slice(0, limit);
}

async function getCostTrend(db: D1Database | undefined, days: number) {
	const trend: ObservabilityData['costTrend'] = [];

	if (!db) return trend;

	try {
		const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
		const createdAtSeconds = toUnixSecondsSql('created_at');
		const results = await db
			.prepare(
				`
				SELECT
					date(${createdAtSeconds}, 'unixepoch') as date,
					COALESCE(SUM(cost), 0) as cost
				FROM agentic_iterations
				WHERE ${createdAtSeconds} >= ?
				GROUP BY date(${createdAtSeconds}, 'unixepoch')
				ORDER BY date ASC
			`
			)
			.bind(cutoff)
			.all<{ date: string; cost: number | string | null }>();

		if (results.results) {
			for (const row of results.results) {
				trend.push({
					date: row.date,
					cost: toSafeNumber(row.cost)
				});
			}
		}
	} catch (err) {
		console.error('Failed to query cost trend:', err);
		// Table might not exist yet
	}

	return trend;
}
