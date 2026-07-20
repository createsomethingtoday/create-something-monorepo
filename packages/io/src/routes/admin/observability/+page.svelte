<script lang="ts">
	/**
	 * Agent Observability Dashboard
	 *
	 * Unified view of agent operations, costs, and traces.
	 * Applies AI Interaction Atlas vocabulary for consistent categorization.
	 *
	 * Data sources:
	 * - Agentic Executor: Session costs, iteration details
	 * - Agentic Events: Error tracking, quality gate outcomes
	 */

	import { SEO } from '@create-something/canon';

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
		avgTokens: number;
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
		hasData: boolean;
	}

	let loading = $state(true);
	let errorMsg = $state<string | null>(null);
	let data = $state<ObservabilityData | null>(null);
	let days = $state(7);
	let activeRequestId = 0;
	let activeController: AbortController | null = null;

	async function loadDashboard() {
		const requestId = ++activeRequestId;
		activeController?.abort();
		const controller = new AbortController();
		activeController = controller;

		loading = true;
		errorMsg = null;
		try {
			const response = await fetch(`/api/admin/observability?days=${days}`, {
				signal: controller.signal
			});

			if (response.status === 401 || response.status === 403) {
				window.location.href = '/admin/login';
				return;
			}

			if (!response.ok) {
				let message = response.statusText || 'Request failed';
				try {
					const body = (await response.json()) as { error?: unknown };
					if (typeof body.error === 'string') {
						message = body.error;
					}
				} catch {
					// If response body isn't JSON, keep fallback message.
				}
				throw new Error(`Failed to load dashboard (${response.status}): ${message}`);
			}

			const payload = (await response.json()) as ObservabilityData;
			if (requestId !== activeRequestId) return;
			data = payload;
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') {
				return;
			}
			if (requestId !== activeRequestId) return;
			errorMsg = err instanceof Error ? err.message : 'Failed to load dashboard';
			console.error('Dashboard error:', err);
		} finally {
			if (requestId === activeRequestId) {
				loading = false;
				activeController = null;
			}
		}
	}

	$effect(() => {
		// Tracks `days` — fires on mount and whenever `days` changes
		void days;
		void loadDashboard();
	});

	$effect(() => {
		return () => {
			activeController?.abort();
		};
	});

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
				return 'var(--color-performance-fg-tertiary)';
			case 'claimed':
			case 'running':
				return 'var(--color-accent)';
			case 'done':
			case 'complete':
				return 'var(--color-performance-success)';
			case 'blocked':
			case 'error':
			case 'budget_exhausted':
				return 'var(--color-performance-error)';
			default:
				return 'var(--color-performance-fg-muted)';
		}
	}

	function totalTasks(tasks: TaskSummary): number {
		return tasks.ready + tasks.claimed + tasks.blocked + tasks.done + tasks.cancelled;
	}

	function getTouchpointWidth(count: number, total: number): number {
		if (total <= 0) return 0;
		return Math.min(100, Math.max(0, (count / total) * 100));
	}

	function hasCost(activity: Activity): activity is Activity & { cost: number } {
		return typeof activity.cost === 'number' && Number.isFinite(activity.cost);
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
				Find failed, blocked, or costly agent runs. Data: IO agent session, iteration, and event records.
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
				onclick={loadDashboard}
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
	{:else if errorMsg}
		<div class="error-state">
			<p class="error-message">{errorMsg}</p>
			<button onclick={loadDashboard} class="btn-secondary mt-4 px-4 py-2">
				Try Again
			</button>
		</div>
	{:else if data && !data.hasData}
		<!-- Empty state: tables exist but no data yet -->
		<div class="empty-state">
			<div class="empty-icon">&#9678;</div>
			<h2 class="empty-title">No agent sessions recorded yet</h2>
			<p class="empty-description">
				Data will appear here once agentic work runs against this database.
				Sessions, iterations, and events are tracked automatically by the Agentic Executor.
			</p>
		</div>
	{:else if data}
		<!-- Summary Metrics -->
		<div class="metrics-grid">
			<!-- Tasks Summary -->
			<div class="metric-card">
				<div class="metric-header">
					<span class="metric-label">Sessions</span>
					<span class="metric-value">{totalTasks(data.tasks)}</span>
				</div>
				<div class="metric-breakdown">
					<div class="breakdown-item">
						<span class="breakdown-dot" style="background: var(--color-performance-fg-tertiary)"></span>
						<span class="breakdown-label">Pending</span>
						<span class="breakdown-value">{data.tasks.ready}</span>
					</div>
					<div class="breakdown-item">
						<span class="breakdown-dot" style="background: var(--color-accent)"></span>
						<span class="breakdown-label">Running</span>
						<span class="breakdown-value">{data.tasks.claimed}</span>
					</div>
					<div class="breakdown-item">
						<span class="breakdown-dot" style="background: var(--color-performance-warning)"></span>
						<span class="breakdown-label">Blocked</span>
						<span class="breakdown-value">{data.tasks.blocked}</span>
					</div>
					<div class="breakdown-item">
						<span class="breakdown-dot" style="background: var(--color-performance-success)"></span>
						<span class="breakdown-label">Complete</span>
						<span class="breakdown-value">{data.tasks.done}</span>
					</div>
					<div class="breakdown-item">
						<span class="breakdown-dot" style="background: var(--color-performance-error)"></span>
						<span class="breakdown-label">Errors</span>
						<span class="breakdown-value">{data.tasks.cancelled}</span>
					</div>
				</div>
			</div>

			<!-- Traces Summary -->
			<div class="metric-card">
				<div class="metric-header">
					<span class="metric-label">Iterations</span>
					<span class="metric-value">{data.traces.total}</span>
				</div>
				<div class="metric-breakdown">
					<div class="breakdown-item">
						<span class="breakdown-dot" style="background: var(--color-performance-error)"></span>
						<span class="breakdown-label">Events (errors)</span>
						<span class="breakdown-value">{data.traces.errors}</span>
					</div>
					<div class="breakdown-item">
						<span class="breakdown-label">Avg Tokens</span>
						<span class="breakdown-value">
							{Math.round(data.traces.avgTokens).toLocaleString()}
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
						<span class="breakdown-label">Avg/Session</span>
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
		{#if data.agents.length > 0}
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
				</div>
			</div>
		{/if}

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
									style="width: {getTouchpointWidth(count, data.traces.total)}%"
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
								{#if hasCost(activity)}
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
					<span class="config-link-arrow">&nearr;</span>
				</a>
				<a
					href="https://dash.cloudflare.com"
					target="_blank"
					rel="noopener noreferrer"
					class="config-link"
				>
					<span class="config-link-label">Cloudflare Dashboard</span>
					<span class="config-link-arrow">&nearr;</span>
				</a>
			</div>
		</div>
	{/if}

	<!-- Footer -->
	<div class="footer-section pt-6">
		<p class="footer-text">
			Powered by <span class="footer-highlight">Agentic Executor</span> +
			<span class="footer-highlight">Langfuse</span> +
			<span class="footer-highlight">Cloudflare Tracing</span>
		</p>
	</div>
</div>

<style>
	.page-title {
		font-size: var(--text-performance-h1);
		font-weight: 700;
	}

	.page-description {
		color: var(--color-performance-fg-tertiary);
		font-size: var(--text-performance-body-sm);
	}

	.select-field {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		color: var(--color-performance-fg-primary);
		font-size: var(--text-performance-body-sm);
		transition: border-color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.select-field:focus {
		outline: none;
		border-color: var(--color-performance-border-emphasis);
	}

	.btn-secondary {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		color: var(--color-performance-fg-tertiary);
		font-size: var(--text-performance-body-sm);
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.btn-secondary:hover:not(:disabled) {
		color: var(--color-performance-fg-primary);
	}

	.btn-secondary:disabled {
		opacity: 0.5;
	}

	/* Loading & Error & Empty States */
	.loading-state,
	.error-state {
		padding: var(--space-performance-xl);
		text-align: center;
		color: var(--color-performance-fg-muted);
	}

	.error-message {
		color: var(--color-performance-error);
	}

	.empty-state {
		padding: 48px var(--space-performance-xl);
		text-align: center;
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
	}

	.empty-icon {
		font-size: 48px;
		color: var(--color-performance-fg-muted);
		margin-bottom: var(--space-performance-md);
		opacity: 0.4;
	}

	.empty-title {
		font-size: var(--text-performance-h3);
		font-weight: 600;
		margin-bottom: var(--space-performance-sm);
	}

	.empty-description {
		color: var(--color-performance-fg-tertiary);
		font-size: var(--text-performance-body-sm);
		max-width: 480px;
		margin: 0 auto;
		line-height: 1.6;
	}

	/* Metrics Grid */
	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-performance-md);
	}

	.metric-card {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		padding: var(--space-performance-md);
	}

	.metric-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: var(--space-performance-sm);
	}

	.metric-label {
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-caption);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.metric-value {
		font-size: var(--text-performance-h2);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.metric-value.cost {
		color: var(--color-accent);
	}

	.metric-breakdown {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
	}

	.breakdown-item {
		display: flex;
		align-items: center;
		gap: var(--space-performance-xs);
		font-size: var(--text-performance-caption);
	}

	.breakdown-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.breakdown-label {
		color: var(--color-performance-fg-tertiary);
		flex: 1;
	}

	.breakdown-value {
		font-variant-numeric: tabular-nums;
		color: var(--color-performance-fg-secondary);
	}

	/* Sections */
	.section {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		padding: var(--space-performance-md);
	}

	.section-title {
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-caption);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-performance-md);
	}

	/* Agents Table */
	.agents-table {
		font-size: var(--text-performance-body-sm);
	}

	.table-header {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
		gap: var(--space-performance-sm);
		padding: var(--space-performance-xs) 0;
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-caption);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.table-row {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
		gap: var(--space-performance-sm);
		padding: var(--space-performance-sm) 0;
		align-items: center;
	}

	.table-row:last-child {
		border-bottom: none;
	}

	.success-badge {
		display: inline-block;
		padding: 2px 8px;
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-caption);
		background: linear-gradient(
			90deg,
			rgba(16, 185, 129, 0.2) var(--progress, 0%),
			transparent var(--progress, 0%)
		);
	}

	/* Atlas Breakdown */
	.atlas-breakdown {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-sm);
	}

	.atlas-item {
		display: grid;
		grid-template-columns: 120px 1fr 60px;
		gap: var(--space-performance-sm);
		align-items: center;
	}

	.atlas-label {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-tertiary);
		font-family: monospace;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.atlas-bar {
		height: 8px;
		border-radius: var(--radius-performance-scale-sm);
		overflow: hidden;
	}

	.atlas-fill {
		display: block;
		height: 100%;
		background: var(--color-accent);
		border-radius: var(--radius-performance-scale-sm);
		transition: width var(--duration-performance-standard) var(--ease-performance-standard);
	}

	.atlas-value {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-secondary);
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	/* Activity List */
	.activity-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
	}

	.activity-item {
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
		padding: var(--space-performance-xs) 0;
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
		font-size: var(--text-performance-caption);
		font-weight: 600;
		flex-shrink: 0;
	}

	.activity-content {
		flex: 1;
		min-width: 0;
	}

	.activity-name {
		display: block;
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-primary);
	}

	.activity-meta {
		display: flex;
		gap: var(--space-performance-sm);
		font-size: var(--text-performance-caption);
	}

	.activity-status {
		text-transform: capitalize;
	}

	.activity-cost {
		color: var(--color-performance-fg-muted);
	}

	.activity-time {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		white-space: nowrap;
	}

	.activity-empty {
		padding: var(--space-performance-md);
		text-align: center;
		color: var(--color-performance-fg-muted);
	}

	/* Config Links */
	.config-links {
		display: flex;
		gap: var(--space-performance-md);
	}

	.config-link {
		display: flex;
		align-items: center;
		gap: var(--space-performance-xs);
		padding: var(--space-performance-sm) var(--space-performance-md);
		border-radius: var(--radius-performance-scale-md);
		color: var(--color-performance-fg-secondary);
		font-size: var(--text-performance-body-sm);
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
		text-decoration: none;
	}

	.config-link:hover {
		background: var(--color-performance-bg-surface);
		border-color: var(--color-performance-border-emphasis);
		color: var(--color-performance-fg-primary);
	}

	.config-link-arrow {
		opacity: 0.5;
	}
	.footer-section {
		text-align: center;
	}

	.footer-text {
		color: var(--color-performance-fg-subtle);
		font-size: var(--text-performance-caption);
	}

	.footer-highlight {
		color: var(--color-performance-fg-secondary);
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
