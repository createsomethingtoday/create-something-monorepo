/**
 * Admin API: Get agent performance metrics
 * Returns approval rate, escalation rate, and other key metrics
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { PMAgentEnv } from '$lib/agents/pm-agent/tools';

export const GET: RequestHandler = async ({ platform }) => {
	if (!platform?.env) {
		throw error(500, 'Platform environment not available');
	}

	const env = platform.env as unknown as PMAgentEnv;

	try {
		// Get metrics from the views we created
		const approvalMetrics = await env.DB.prepare('SELECT * FROM agent_metrics').first();

		const escalationMetrics = await env.DB.prepare('SELECT * FROM agent_escalation_rate').first();

		// Get recent activity (last 24 hours)
		const recentActivity = await env.DB.prepare(
			`SELECT COUNT(*) as count
       FROM agent_actions
       WHERE created_at > datetime('now', '-1 day')`
		).first();

		// Get tool usage stats
		const toolUsage = await env.DB.prepare(
			`SELECT
         action_type,
         COUNT(*) as count,
         SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successes
       FROM agent_actions
       GROUP BY action_type
       ORDER BY count DESC`
		).all();

		return json({
			success: true,
			metrics: {
				approval_rate: approvalMetrics?.approval_rate_percent || 0,
				avg_review_time_seconds: approvalMetrics?.avg_review_time_seconds || 0,
				total_decisions: approvalMetrics?.total_decisions || 0,
				approved_count: approvalMetrics?.approved_count || 0,
				rejected_count: approvalMetrics?.rejected_count || 0,
				escalation_rate: escalationMetrics?.escalation_rate_percent || 0,
				drafts_pending: escalationMetrics?.drafts_pending || 0,
				escalated_count: escalationMetrics?.escalated_count || 0,
				recent_activity_24h: recentActivity?.count || 0,
				tool_usage: toolUsage.results || []
			}
		});
	} catch (err) {
		console.error('Error fetching agent metrics:', err);
		throw error(500, err instanceof Error ? err.message : 'Failed to fetch metrics');
	}
};
