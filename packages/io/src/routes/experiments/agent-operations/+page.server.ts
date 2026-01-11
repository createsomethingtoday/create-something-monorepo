import type { PageServerLoad } from './$types';

const STATUS_URL = 'https://createsomethingtoday--cs-agents-status.modal.run';
const LOGS_URL = 'https://createsomethingtoday--cs-agents-logs.modal.run';
const HEALTH_URL = 'https://createsomethingtoday--cs-agents-health.modal.run';

interface PropertyStatus {
	domain: string;
	healthy: boolean;
	status_code: number;
	down_since: string | null;
}

interface Incident {
	timestamp: string;
	message: string;
}

interface StatusResponse {
	status: 'operational' | 'degraded' | 'outage';
	all_healthy: boolean;
	properties: PropertyStatus[];
	incidents: Incident[];
	updated_at: string;
}

interface AgentHealth {
	status: string;
	service: string;
	agents: string[];
}

interface AgentLog {
	timestamp: string;
	agent: string;
	success: boolean;
	cost_usd?: number;
	error?: string;
	output?: string;
	model?: string;
	input_tokens?: number;
	output_tokens?: number;
	all_healthy?: boolean;
	changes?: string[];
}

interface LogsResponse {
	logs: AgentLog[];
	count: number;
}

export const load: PageServerLoad = async ({ fetch }) => {
	// Fetch all data in parallel
	const [statusResult, healthResult, logsResult] = await Promise.allSettled([
		fetch(STATUS_URL).then(r => r.ok ? r.json() : null),
		fetch(HEALTH_URL).then(r => r.ok ? r.json() : null),
		fetch(`${LOGS_URL}?days=7`).then(r => r.ok ? r.json() : null),
	]);

	const status: StatusResponse | null = statusResult.status === 'fulfilled' ? statusResult.value as StatusResponse : null;
	const health: AgentHealth | null = healthResult.status === 'fulfilled' ? healthResult.value as AgentHealth : null;
	const logsData: LogsResponse | null = logsResult.status === 'fulfilled' ? logsResult.value as LogsResponse : null;

	// Process logs to get agent stats
	const agentStats: Record<string, {
		lastRun: string | null;
		lastSuccess: boolean;
		totalRuns: number;
		successRate: number;
		totalCost: number;
		avgCost: number;
	}> = {};

	if (logsData?.logs) {
		const logsByAgent: Record<string, AgentLog[]> = {};

		for (const log of logsData.logs) {
			if (!logsByAgent[log.agent]) {
				logsByAgent[log.agent] = [];
			}
			logsByAgent[log.agent].push(log);
		}

		for (const [agent, logs] of Object.entries(logsByAgent)) {
			const successCount = logs.filter(l => l.success).length;
			const totalCost = logs.reduce((sum, l) => sum + (l.cost_usd || 0), 0);
			const sortedLogs = logs.sort((a, b) =>
				new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			);

			agentStats[agent] = {
				lastRun: sortedLogs[0]?.timestamp || null,
				lastSuccess: sortedLogs[0]?.success ?? false,
				totalRuns: logs.length,
				successRate: logs.length > 0 ? (successCount / logs.length) * 100 : 0,
				totalCost: totalCost,
				avgCost: logs.length > 0 ? totalCost / logs.length : 0,
			};
		}
	}

	// Get recent deployments from logs (deploy agent)
	const recentDeployments = logsData?.logs
		?.filter(l => l.agent === 'deploy')
		.slice(0, 5) || [];

	return {
		status,
		health,
		logs: logsData?.logs || [],
		agentStats,
		recentDeployments,
		error: null,
	};
};
