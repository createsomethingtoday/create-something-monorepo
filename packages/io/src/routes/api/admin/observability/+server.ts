/**
 * Agent Observability API
 * 
 * Aggregates data from multiple sources:
 * - Cloudflare traces (via API)
 * - Langfuse traces (via API)
 * - Loom task data (via SQLite/D1)
 * - Agentic Executor sessions (via D1)
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
	avgLatency: number;
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
}

export const GET: RequestHandler = async ({ platform, url }) => {
	const days = parseInt(url.searchParams.get('days') || '7');
	
	try {
		const db = platform?.env?.DB;
		
		// Mock data structure - in production, these would be real queries
		// to D1 (Agentic Executor), Loom SQLite, and Langfuse API
		
		const data: ObservabilityData = {
			tasks: await getTaskSummary(db),
			agents: await getAgentSummary(db),
			traces: await getTraceSummary(db, days),
			recentActivity: await getRecentActivity(db, 20),
			costTrend: await getCostTrend(db, days)
		};
		
		return json(data);
	} catch (err) {
		console.error('Observability API error:', err);
		throw error(500, 'Failed to fetch observability data');
	}
};

async function getTaskSummary(db: D1Database | undefined): Promise<TaskSummary> {
	// In production: query Loom work.db or replicated D1 data
	// For now, return structure that dashboard can render
	
	if (!db) {
		return {
			ready: 0,
			claimed: 0,
			blocked: 0,
			done: 0,
			cancelled: 0,
			totalCost: 0
		};
	}
	
	try {
		// Try to query agentic sessions as a proxy for task data
		const result = await db.prepare(`
			SELECT 
				SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as ready,
				SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as claimed,
				SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as done,
				SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as cancelled,
				COALESCE(SUM(cost_consumed), 0) as totalCost
			FROM agentic_sessions
		`).first<{
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
		// Table might not exist
		return {
			ready: 0,
			claimed: 0,
			blocked: 0,
			done: 0,
			cancelled: 0,
			totalCost: 0
		};
	}
}

async function getAgentSummary(db: D1Database | undefined): Promise<AgentSummary[]> {
	// In production: query Loom agents.db
	// Return agent performance metrics
	
	// Default agents based on CLAUDE.md
	const defaultAgents: AgentSummary[] = [
		{ name: 'claude-code', executions: 0, successRate: 0, avgDuration: 0, totalCost: 0 },
		{ name: 'cursor', executions: 0, successRate: 0, avgDuration: 0, totalCost: 0 },
		{ name: 'gemini', executions: 0, successRate: 0, avgDuration: 0, totalCost: 0 }
	];
	
	if (!db) {
		return defaultAgents;
	}
	
	try {
		// Query agentic sessions for agent metrics
		const results = await db.prepare(`
			SELECT 
				'agentic-executor' as name,
				COUNT(*) as executions,
				AVG(CASE WHEN status = 'completed' THEN 100.0 ELSE 0.0 END) as successRate,
				AVG(CASE WHEN completed_at IS NOT NULL 
					THEN (julianday(completed_at) - julianday(created_at)) * 86400 
					ELSE 0 END) as avgDuration,
				COALESCE(SUM(cost_consumed), 0) as totalCost
			FROM agentic_sessions
			WHERE created_at > datetime('now', '-30 days')
		`).first<AgentSummary>();
		
		if (results && results.executions > 0) {
			return [results];
		}
		return defaultAgents;
	} catch {
		return defaultAgents;
	}
}

async function getTraceSummary(db: D1Database | undefined, days: number): Promise<TraceSummary> {
	// In production: query Langfuse API or replicated trace data
	// For now, return structure
	
	const summary: TraceSummary = {
		total: 0,
		errors: 0,
		avgLatency: 0,
		byTouchpoint: {},
		byAiTask: {}
	};
	
	if (!db) {
		return summary;
	}
	
	try {
		// Query agentic iterations as trace proxy
		const result = await db.prepare(`
			SELECT 
				COUNT(*) as total,
				SUM(CASE WHEN tools_used LIKE '%error%' THEN 1 ELSE 0 END) as errors,
				AVG(COALESCE(input_tokens + output_tokens, 0)) as avgTokens
			FROM agentic_iterations
			WHERE created_at > datetime('now', '-' || ? || ' days')
		`).bind(days).first<{
			total: number;
			errors: number;
			avgTokens: number;
		}>();
		
		if (result) {
			summary.total = result.total;
			summary.errors = result.errors;
			summary.avgLatency = result.avgTokens; // Using tokens as proxy
		}
		
		// Aggregate by tool type (touchpoint proxy)
		const toolResults = await db.prepare(`
			SELECT tools_used, COUNT(*) as count
			FROM agentic_iterations
			WHERE created_at > datetime('now', '-' || ? || ' days')
			AND tools_used IS NOT NULL
			GROUP BY tools_used
			LIMIT 10
		`).bind(days).all<{ tools_used: string; count: number }>();
		
		if (toolResults.results) {
			for (const row of toolResults.results) {
				if (row.tools_used) {
					summary.byTouchpoint[row.tools_used] = row.count;
				}
			}
		}
	} catch {
		// Tables might not exist
	}
	
	return summary;
}

async function getRecentActivity(db: D1Database | undefined, limit: number) {
	const activity: ObservabilityData['recentActivity'] = [];
	
	if (!db) {
		return activity;
	}
	
	try {
		// Get recent agentic sessions
		const sessions = await db.prepare(`
			SELECT 
				id,
				status,
				cost_consumed,
				created_at
			FROM agentic_sessions
			ORDER BY created_at DESC
			LIMIT ?
		`).bind(limit).all<{
			id: string;
			status: string;
			cost_consumed: number;
			created_at: string;
		}>();
		
		if (sessions.results) {
			for (const session of sessions.results) {
				activity.push({
					id: session.id,
					type: 'session',
					name: `Session ${session.id.slice(0, 8)}`,
					status: session.status,
					timestamp: session.created_at,
					cost: session.cost_consumed
				});
			}
		}
	} catch {
		// Table might not exist
	}
	
	return activity;
}

async function getCostTrend(db: D1Database | undefined, days: number) {
	const trend: ObservabilityData['costTrend'] = [];
	
	if (!db) {
		return trend;
	}
	
	try {
		const results = await db.prepare(`
			SELECT 
				date(created_at) as date,
				SUM(cost) as cost
			FROM agentic_iterations
			WHERE created_at > datetime('now', '-' || ? || ' days')
			GROUP BY date(created_at)
			ORDER BY date ASC
		`).bind(days).all<{ date: string; cost: number }>();
		
		if (results.results) {
			for (const row of results.results) {
				trend.push({
					date: row.date,
					cost: row.cost || 0
				});
			}
		}
	} catch {
		// Table might not exist
	}
	
	return trend;
}
