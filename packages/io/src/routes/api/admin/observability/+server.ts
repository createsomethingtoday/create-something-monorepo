/**
 * Agent Observability API
 *
 * Queries agentic_sessions, agentic_iterations, and agentic_events tables
 * in io's D1 database (create-something-db).
 *
 * All timestamps are Unix integers (seconds since epoch).
 */

import { json, error } from '@sveltejs/kit';
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

export const GET: RequestHandler = async ({ platform, url }) => {
	const rawDays = parseInt(url.searchParams.get('days') || '7');
	const days = Number.isNaN(rawDays) ? 7 : Math.max(1, Math.min(90, rawDays));

	try {
		const db = platform?.env?.DB;

		const data: ObservabilityData = {
			tasks: await getTaskSummary(db, days),
			agents: await getAgentSummary(db, days),
			traces: await getTraceSummary(db, days),
			recentActivity: await getRecentActivity(db, 20),
			costTrend: await getCostTrend(db, days),
			hasData: false
		};

		// Determine if any real data exists
		data.hasData =
			data.tasks.ready + data.tasks.claimed + data.tasks.done + data.tasks.cancelled > 0 ||
			data.traces.total > 0 ||
			data.recentActivity.length > 0;

		return json(data);
	} catch (err) {
		console.error('Observability API error:', err);
		throw error(500, 'Failed to fetch observability data');
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
		const result = await db
			.prepare(
				`
			SELECT
				SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as ready,
				SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as claimed,
				SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) as done,
				SUM(CASE WHEN status IN ('error', 'budget_exhausted') THEN 1 ELSE 0 END) as cancelled,
				COALESCE(SUM(cost_consumed), 0) as totalCost
			FROM agentic_sessions
			WHERE started_at > ?
		`
			)
			.bind(cutoff)
			.first<{
				ready: number;
				claimed: number;
				done: number;
				cancelled: number;
				totalCost: number;
			}>();

		return {
			ready: result?.ready || 0,
			claimed: result?.claimed || 0,
			blocked: 0,
			done: result?.done || 0,
			cancelled: result?.cancelled || 0,
			totalCost: result?.totalCost || 0
		};
	} catch {
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
		const result = await db
			.prepare(
				`
			SELECT
				COUNT(*) as executions,
				AVG(CASE WHEN status = 'complete' THEN 100.0 ELSE 0.0 END) as successRate,
				AVG(CASE WHEN completed_at IS NOT NULL
					THEN completed_at - started_at
					ELSE 0 END) as avgDuration,
				COALESCE(SUM(cost_consumed), 0) as totalCost
			FROM agentic_sessions
			WHERE started_at > ?
		`
			)
			.bind(cutoff)
			.first<{
				executions: number;
				successRate: number;
				avgDuration: number;
				totalCost: number;
			}>();

		if (result && result.executions > 0) {
			return [
				{
					name: 'agentic-executor',
					executions: result.executions,
					successRate: result.successRate,
					avgDuration: result.avgDuration,
					totalCost: result.totalCost
				}
			];
		}
		return [];
	} catch {
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

		// Count iterations and aggregate tokens
		const result = await db
			.prepare(
				`
			SELECT
				COUNT(*) as total,
				AVG(COALESCE(input_tokens + output_tokens, 0)) as avgTokens
			FROM agentic_iterations
			WHERE created_at > ?
		`
			)
			.bind(cutoff)
			.first<{
				total: number;
				avgTokens: number;
			}>();

		if (result) {
			summary.total = result.total;
			summary.avgTokens = result.avgTokens || 0;
		}

		// Count errors from agentic_events
		const errorResult = await db
			.prepare(
				`
			SELECT COUNT(*) as errors
			FROM agentic_events
			WHERE event_type IN ('quality_gate_failed', 'budget_exhausted', 'completion_rejected')
			AND created_at > ?
		`
			)
			.bind(cutoff)
			.first<{ errors: number }>();

		if (errorResult) {
			summary.errors = errorResult.errors;
		}

		// Aggregate by tool type (touchpoint proxy)
		const toolResults = await db
			.prepare(
				`
			SELECT tools_used, COUNT(*) as count
			FROM agentic_iterations
			WHERE created_at > ?
			AND tools_used IS NOT NULL
			GROUP BY tools_used
			LIMIT 10
		`
			)
			.bind(cutoff)
			.all<{ tools_used: string; count: number }>();

		if (toolResults.results) {
			for (const row of toolResults.results) {
				if (row.tools_used) {
					summary.byTouchpoint[row.tools_used] = row.count;
				}
			}
		}
	} catch {
		// Tables might not exist yet
	}

	return summary;
}

async function getRecentActivity(db: D1Database | undefined, limit: number) {
	const activity: ObservabilityData['recentActivity'] = [];

	if (!db) return activity;

	try {
		const sessions = await db
			.prepare(
				`
			SELECT
				id,
				status,
				cost_consumed,
				started_at
			FROM agentic_sessions
			ORDER BY started_at DESC
			LIMIT ?
		`
			)
			.bind(limit)
			.all<{
				id: string;
				status: string;
				cost_consumed: number;
				started_at: number;
			}>();

		if (sessions.results) {
			for (const session of sessions.results) {
				activity.push({
					id: session.id,
					type: 'session',
					name: `Session ${session.id.slice(0, 8)}`,
					status: session.status,
					timestamp: new Date(session.started_at * 1000).toISOString(),
					cost: session.cost_consumed
				});
			}
		}
	} catch {
		// Table might not exist yet
	}

	return activity;
}

async function getCostTrend(db: D1Database | undefined, days: number) {
	const trend: ObservabilityData['costTrend'] = [];

	if (!db) return trend;

	try {
		const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
		const results = await db
			.prepare(
				`
			SELECT
				date(created_at, 'unixepoch') as date,
				SUM(cost) as cost
			FROM agentic_iterations
			WHERE created_at > ?
			GROUP BY date(created_at, 'unixepoch')
			ORDER BY date ASC
		`
			)
			.bind(cutoff)
			.all<{ date: string; cost: number }>();

		if (results.results) {
			for (const row of results.results) {
				trend.push({
					date: row.date,
					cost: row.cost || 0
				});
			}
		}
	} catch {
		// Table might not exist yet
	}

	return trend;
}
