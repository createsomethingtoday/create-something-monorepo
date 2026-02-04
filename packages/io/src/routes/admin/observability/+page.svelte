<script lang="ts">
	/**
	 * Agent Observability Dashboard
	 *
	 * Unified view of agent operations, costs, and traces.
	 * Applies AI Interaction Atlas vocabulary for consistent categorization.
	 *
	 * Data sources:
	 * - Loom: Task status, agent performance, cost tracking
	 * - Agentic Executor: Session costs, iteration details
	 * - Langfuse: LLM traces, MCP tool calls
	 * - Cloudflare: Infrastructure spans
	 */

	import { SEO } from '@create-something/canon';
	import { onMount } from 'svelte';

	interface TaskSummary {
		ready: number;
		claimed: number;
		blocked: number;
		done: number;
		cancelled: number;
		totalCost: number;
	}

	interface AgentSummary {
		name: string;
		executions: number;
		successRate: number;
		avgDuration: number;
		totalCost: number;
	}

	interface TraceSummary {
		total: number;
		errors: number;
		avgLatency: number;
		byTouchpoint: Record<string, number>;
		byAiTask: Record<string, number>;
	}

	interface Activity {
		id: string;
		type: 'task' | 'trace' | 'session';
		name: string;
		status: string;
		timestamp: string;
		cost?: number;
	}

	interface ObservabilityData {
		tasks: TaskSummary;
		agents: AgentSummary[];
		traces: TraceSummary;
		recentActivity: Activity[];
		costTrend: Array<{ date: string; cost: number }>;
	}

	let loading = true;
	let error: string | null = null;
	let data: ObservabilityData | null = null;
	let days = 7;

	async function loadDashboard() {
		loading = true;
		error = null;
		try {
			const response = await fetch(`/api/admin/observability?days=${days}`);
			if (!response.ok) {
				throw new Error(`Failed to load: ${response.statusText}`);
			}
			data = await response.json();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load dashboard';
			console.error('Dashboard error:', err);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadDashboard();
	});

	$: if (days) {
		loadDashboard();
	}

	function formatCost(cost: number): string {
		return `$${cost.toFixed(4)}`;
	}

	function formatPercent(value: number): string {
		return `${Math.round(value)}%`;
	}

	function formatDuration(seconds: number): string {
		if (seconds < 60) return `${Math.round(seconds)}s`;
		if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
		return `${(seconds / 3600).toFixed(1)}h`;
	}

	function getStatusColor(status: string): string {
		switch (status.toLowerCase()) {
			case 'ready':
			case 'pending':
				return 'var(--color-fg-tertiary)';
			case 'claimed':
			case 'running':
				return 'var(--color-accent)';
			case 'done':
			case 'completed':
				return 'var(--color-success)';
			case 'blocked':
			case 'failed':
				return 'var(--color-error)';
			default:
				return 'var(--color-fg-muted)';
		}
	}

	function totalTasks(tasks: TaskSummary): number {
		return tasks.ready + tasks.claimed + tasks.blocked + tasks.done + tasks.cancelled;
	}
</script>

<SEO
	title="Agent Observability"
	description="Unified agent operations dashboard"
	propertyName="io"
	noindex={true}
/>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-start justify-between">
		<div>
			<h1 class="page-title mb-2">Agent Observability</h1>
			<p class="page-description max-w-xl">
				Unified view of agent operations across Loom, Agentic Executor, and Langfuse.
				Organized by AI Interaction Atlas dimensions.
			</p>
		</div>

		<div class="flex items-center gap-4">
			<select bind:value={days} class="select-field px-4 py-2">
				<option value={1}>Last 24 hours</option>
				<option value={7}>Last 7 days</option>
				<option value={14}>Last 14 days</option>
				<option value={30}>Last 30 days</option>
			</select>

			<button
				on:click={loadDashboard}
				disabled={loading}
				class="btn-secondary px-4 py-2"
			>
				{loading ? 'Loading...' : 'Refresh'}
			</button>
		</div>
	</div>

	{#if loading && !data}
		<div class="loading-state">
			<p>Loading observability data...</p>
		</div>
	{:else if error}
		<div class="error-state">
			<p class="error-message">{error}</p>
			<button on:click={loadDashboard} class="btn-secondary mt-4 px-4 py-2">
				Try Again
			</button>
		</div>
	{:else if data}
		<!-- Summary Metrics -->
		<div class="metrics-grid">
			<!-- Tasks Summary -->
			<div class="metric-card">
				<div class="metric-header">
					<span class="metric-label">Tasks</span>
					<span class="metric-value">{totalTasks(data.tasks)}</span>
				</div>
				<div class="metric-breakdown">
					<div class="breakdown-item">
						<span class="breakdown-dot" style="background: var(--color-fg-tertiary)"></span>
						<span class="breakdown-label">Ready</span>
						<span class="breakdown-value">{data.tasks.ready}</span>
					</div>
					<div class="breakdown-item">
						<span class="breakdown-dot" style="background: var(--color-accent)"></span>
						<span class="breakdown-label">In Progress</span>
						<span class="breakdown-value">{data.tasks.claimed}</span>
					</div>
					<div class="breakdown-item">
						<span class="breakdown-dot" style="background: var(--color-warning)"></span>
						<span class="breakdown-label">Blocked</span>
						<span class="breakdown-value">{data.tasks.blocked}</span>
					</div>
					<div class="breakdown-item">
						<span class="breakdown-dot" style="background: var(--color-success)"></span>
						<span class="breakdown-label">Done</span>
						<span class="breakdown-value">{data.tasks.done}</span>
					</div>
				</div>
			</div>

			<!-- Traces Summary -->
			<div class="metric-card">
				<div class="metric-header">
					<span class="metric-label">Traces</span>
					<span class="metric-value">{data.traces.total}</span>
				</div>
				<div class="metric-breakdown">
					<div class="breakdown-item">
						<span class="breakdown-dot" style="background: var(--color-error)"></span>
						<span class="breakdown-label">Errors</span>
						<span class="breakdown-value">{data.traces.errors}</span>
					</div>
					<div class="breakdown-item">
						<span class="breakdown-label">Error Rate</span>
						<span class="breakdown-value">
							{data.traces.total > 0
								? formatPercent((data.traces.errors / data.traces.total) * 100)
								: '0%'}
						</span>
					</div>
				</div>
			</div>

			<!-- Cost Summary -->
			<div class="metric-card">
				<div class="metric-header">
					<span class="metric-label">Total Cost</span>
					<span class="metric-value cost">{formatCost(data.tasks.totalCost)}</span>
				</div>
				<div class="metric-breakdown">
					<div class="breakdown-item">
						<span class="breakdown-label">Avg/Task</span>
						<span class="breakdown-value">
							{totalTasks(data.tasks) > 0
								? formatCost(data.tasks.totalCost / totalTasks(data.tasks))
								: '$0.00'}
						</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Agents Section -->
		<div class="section">
			<h2 class="section-title">Agent Performance</h2>
			<div class="agents-table">
				<div class="table-header">
					<span class="col-agent">Agent</span>
					<span class="col-executions">Executions</span>
					<span class="col-success">Success Rate</span>
					<span class="col-duration">Avg Duration</span>
					<span class="col-cost">Cost</span>
				</div>
				{#each data.agents as agent}
					<div class="table-row">
						<span class="col-agent font-mono">{agent.name}</span>
						<span class="col-executions">{agent.executions}</span>
						<span class="col-success">
							<span
								class="success-badge"
								style="--progress: {agent.successRate}%"
							>
								{formatPercent(agent.successRate)}
							</span>
						</span>
						<span class="col-duration">{formatDuration(agent.avgDuration)}</span>
						<span class="col-cost">{formatCost(agent.totalCost)}</span>
					</div>
				{/each}
				{#if data.agents.length === 0}
					<div class="table-empty">
						No agent data available
					</div>
				{/if}
			</div>
		</div>

		<!-- Atlas Breakdown -->
		{#if Object.keys(data.traces.byTouchpoint).length > 0}
			<div class="section">
				<h2 class="section-title">By Touchpoint (Atlas)</h2>
				<div class="atlas-breakdown">
					{#each Object.entries(data.traces.byTouchpoint) as [touchpoint, count]}
						<div class="atlas-item">
							<span class="atlas-label">{touchpoint}</span>
							<span class="atlas-bar">
								<span
									class="atlas-fill"
									style="width: {(count / data.traces.total) * 100}%"
								></span>
							</span>
							<span class="atlas-value">{count}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Recent Activity -->
		<div class="section">
			<h2 class="section-title">Recent Activity</h2>
			<div class="activity-list">
				{#each data.recentActivity as activity}
					<div class="activity-item">
						<div class="activity-icon" style="background: {getStatusColor(activity.status)}">
							{activity.type[0].toUpperCase()}
						</div>
						<div class="activity-content">
							<span class="activity-name">{activity.name}</span>
							<span class="activity-meta">
								<span
									class="activity-status"
									style="color: {getStatusColor(activity.status)}"
								>
									{activity.status}
								</span>
								{#if activity.cost}
									<span class="activity-cost">{formatCost(activity.cost)}</span>
								{/if}
							</span>
						</div>
						<span class="activity-time">
							{new Date(activity.timestamp).toLocaleString()}
						</span>
					</div>
				{/each}
				{#if data.recentActivity.length === 0}
					<div class="activity-empty">
						No recent activity
					</div>
				{/if}
			</div>
		</div>

		<!-- Configuration Links -->
		<div class="section config-section">
			<h2 class="section-title">Configuration</h2>
			<div class="config-links">
				<a
					href="https://cloud.langfuse.com"
					target="_blank"
					rel="noopener noreferrer"
					class="config-link"
				>
					<span class="config-link-label">Langfuse Dashboard</span>
					<span class="config-link-arrow">↗</span>
				</a>
				<a
					href="https://dash.cloudflare.com"
					target="_blank"
					rel="noopener noreferrer"
					class="config-link"
				>
					<span class="config-link-label">Cloudflare Dashboard</span>
					<span class="config-link-arrow">↗</span>
				</a>
			</div>
		</div>
	{/if}

	<!-- Footer -->
	<div class="footer-section pt-6">
		<p class="footer-text">
			Powered by <span class="footer-highlight">Loom</span> +
			<span class="footer-highlight">Langfuse</span> +
			<span class="footer-highlight">Cloudflare Tracing</span>
		</p>
	</div>
</div>

<style>
	.page-title {
		font-size: var(--text-h1);
		font-weight: 700;
	}

	.page-description {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	.select-field {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.select-field:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
	}

	.btn-secondary {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--color-bg-elevated);
		color: var(--color-fg-primary);
	}

	.btn-secondary:disabled {
		opacity: 0.5;
	}

	/* Loading & Error States */
	.loading-state,
	.error-state {
		padding: var(--space-xl);
		text-align: center;
		color: var(--color-fg-muted);
	}

	.error-message {
		color: var(--color-error);
	}

	/* Metrics Grid */
	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-md);
	}

	.metric-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.metric-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: var(--space-sm);
	}

	.metric-label {
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.metric-value {
		font-size: var(--text-h2);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.metric-value.cost {
		color: var(--color-accent);
	}

	.metric-breakdown {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.breakdown-item {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-caption);
	}

	.breakdown-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.breakdown-label {
		color: var(--color-fg-tertiary);
		flex: 1;
	}

	.breakdown-value {
		font-variant-numeric: tabular-nums;
		color: var(--color-fg-secondary);
	}

	/* Sections */
	.section {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.section-title {
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-md);
	}

	/* Agents Table */
	.agents-table {
		font-size: var(--text-body-sm);
	}

	.table-header {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
		gap: var(--space-sm);
		padding: var(--space-xs) 0;
		border-bottom: 1px solid var(--color-border-default);
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.table-row {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
		gap: var(--space-sm);
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--color-border-subtle);
		align-items: center;
	}

	.table-row:last-child {
		border-bottom: none;
	}

	.table-empty {
		padding: var(--space-md);
		text-align: center;
		color: var(--color-fg-muted);
	}

	.success-badge {
		display: inline-block;
		padding: 2px 8px;
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		background: linear-gradient(
			90deg,
			rgba(16, 185, 129, 0.2) var(--progress, 0%),
			transparent var(--progress, 0%)
		);
		border: 1px solid var(--color-border-default);
	}

	/* Atlas Breakdown */
	.atlas-breakdown {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.atlas-item {
		display: grid;
		grid-template-columns: 120px 1fr 60px;
		gap: var(--space-sm);
		align-items: center;
	}

	.atlas-label {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		font-family: monospace;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.atlas-bar {
		height: 8px;
		background: var(--color-bg-elevated);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.atlas-fill {
		display: block;
		height: 100%;
		background: var(--color-accent);
		border-radius: var(--radius-sm);
		transition: width var(--duration-standard) var(--ease-standard);
	}

	.atlas-value {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	/* Activity List */
	.activity-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.activity-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-xs) 0;
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.activity-item:last-child {
		border-bottom: none;
	}

	.activity-icon {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-size: var(--text-caption);
		font-weight: 600;
		flex-shrink: 0;
	}

	.activity-content {
		flex: 1;
		min-width: 0;
	}

	.activity-name {
		display: block;
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
	}

	.activity-meta {
		display: flex;
		gap: var(--space-sm);
		font-size: var(--text-caption);
	}

	.activity-status {
		text-transform: capitalize;
	}

	.activity-cost {
		color: var(--color-fg-muted);
	}

	.activity-time {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		white-space: nowrap;
	}

	.activity-empty {
		padding: var(--space-md);
		text-align: center;
		color: var(--color-fg-muted);
	}

	/* Config Links */
	.config-links {
		display: flex;
		gap: var(--space-md);
	}

	.config-link {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		transition: all var(--duration-micro) var(--ease-standard);
		text-decoration: none;
	}

	.config-link:hover {
		background: var(--color-bg-surface);
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.config-link-arrow {
		opacity: 0.5;
	}

	/* Footer */
	.footer-section {
		border-top: 1px solid var(--color-border-default);
		text-align: center;
	}

	.footer-text {
		color: var(--color-fg-subtle);
		font-size: var(--text-caption);
	}

	.footer-highlight {
		color: var(--color-fg-secondary);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.table-header,
		.table-row {
			grid-template-columns: 1fr 1fr;
		}

		.col-duration,
		.col-cost {
			display: none;
		}

		.config-links {
			flex-direction: column;
		}
	}
</style>
