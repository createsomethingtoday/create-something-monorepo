<script lang="ts">
	/**
	 * Agent Operations Tracking Experiment
	 *
	 * Tracks and displays the health and progress of CREATE SOMETHING Modal agents.
	 * Shows agent status, recent deployments, and Beads issues being worked on.
	 */

	import { SEO } from '@create-something/canon';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Agent metadata with descriptions and schedules
	const agentMeta: Record<string, { description: string; schedule: string; model: string }> = {
		monitor: {
			description: 'Hourly health checks for all CREATE SOMETHING properties',
			schedule: 'Every hour at :00',
			model: 'N/A (HTTP only)',
		},
		coordinator: {
			description: 'Daily work orchestration and priority setting',
			schedule: 'Daily at 8am UTC',
			model: 'Claude Sonnet 4',
		},
		review: {
			description: 'Subtractive Triad code audit',
			schedule: 'Monday at 10am UTC',
			model: 'Claude Sonnet 4',
		},
		resolution: {
			description: 'Fix proposals for review findings',
			schedule: 'Mon/Tue/Fri at 11am UTC',
			model: 'Claude Sonnet 4',
		},
		content: {
			description: 'LinkedIn post draft generation',
			schedule: 'Tue-Fri at 9am UTC',
			model: 'Claude Sonnet 4',
		},
		'canon-audit': {
			description: 'CSS Canon compliance check',
			schedule: 'On-demand',
			model: 'Claude Haiku 3.5',
		},
		'dry-check': {
			description: 'Code duplication analysis',
			schedule: 'On-demand',
			model: 'Claude Sonnet 4',
		},
		deploy: {
			description: 'Automated deployments via GitHub webhook',
			schedule: 'On push to main',
			model: 'N/A (Build)',
		},
	};

	function formatTime(iso: string): string {
		const date = new Date(iso);
		return date.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	function formatRelativeTime(iso: string): string {
		const date = new Date(iso);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffMins < 1) return 'just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		return `${diffDays}d ago`;
	}

	function formatCost(cost: number): string {
		if (cost < 0.001) return '$0.00';
		if (cost < 0.01) return `$${cost.toFixed(4)}`;
		return `$${cost.toFixed(3)}`;
	}

	// Calculate totals from agent stats
	const totalCost = $derived(
		Object.values(data.agentStats).reduce((sum, s) => sum + s.totalCost, 0)
	);

	const totalRuns = $derived(
		Object.values(data.agentStats).reduce((sum, s) => sum + s.totalRuns, 0)
	);

	const overallSuccessRate = $derived(() => {
		const successfulRuns = Object.entries(data.agentStats).reduce((sum, [_, s]) => {
			return sum + (s.totalRuns * s.successRate / 100);
		}, 0);
		return totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 100;
	});

	// Get sorted agents by last run time
	const sortedAgents = $derived(
		Object.entries(data.agentStats)
			.sort((a, b) => {
				if (!a[1].lastRun) return 1;
				if (!b[1].lastRun) return -1;
				return new Date(b[1].lastRun).getTime() - new Date(a[1].lastRun).getTime();
			})
	);

	// Get recent logs (last 20)
	const recentLogs = $derived(
		data.logs
			.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
			.slice(0, 20)
	);
</script>

<SEO
	title="Agent Operations"
	description="Real-time health and progress tracking for CREATE SOMETHING Modal agents"
	keywords="agent operations, modal agents, health monitoring, autonomous agents, infrastructure"
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io' },
		{ name: 'Experiments', url: 'https://createsomething.io/experiments' },
		{ name: 'Agent Operations', url: 'https://createsomething.io/experiments/agent-operations' }
	]}
/>

<div class="page-container min-h-screen p-6">
	<div class="max-w-6xl mx-auto space-y-12">
		<!-- Header -->
		<div class="header-section pb-8">
			<h1 class="page-title mb-3">Agent Operations Tracking</h1>
			<p class="text-secondary max-w-3xl">
				Real-time monitoring of CREATE SOMETHING's Modal-deployed agents. These autonomous
				agents handle infrastructure monitoring, code review, content generation, and deployments.
			</p>
		</div>

		<!-- Overall Status Banner -->
		{#if data.status}
			<section class="status-banner" class:healthy={data.status.all_healthy} class:degraded={!data.status.all_healthy}>
				<div class="status-indicator"></div>
				<span class="status-label">
					{data.status.all_healthy ? 'All Systems Operational' : 'System Degraded'}
				</span>
				<span class="status-updated">
					Updated {formatRelativeTime(data.status.updated_at)}
				</span>
			</section>
		{/if}

		<!-- Stats Overview -->
		<section class="stats-grid">
			<div class="stat-card">
				<div class="stat-label">Total Runs (7d)</div>
				<div class="stat-value">{totalRuns}</div>
			</div>
			<div class="stat-card">
				<div class="stat-label">Success Rate</div>
				<div class="stat-value" class:success={overallSuccessRate() > 95} class:warning={overallSuccessRate() <= 95 && overallSuccessRate() > 80}>
					{overallSuccessRate().toFixed(1)}%
				</div>
			</div>
			<div class="stat-card">
				<div class="stat-label">Total Cost (7d)</div>
				<div class="stat-value">{formatCost(totalCost)}</div>
			</div>
			<div class="stat-card">
				<div class="stat-label">Active Agents</div>
				<div class="stat-value">{data.health?.agents?.length || 0}</div>
			</div>
		</section>

		<!-- Property Health -->
		{#if data.status?.properties}
			<section class="space-y-4">
				<h2 class="section-title">Property Health</h2>
				<div class="property-grid">
					{#each data.status.properties as prop}
						<div class="property-card">
							<div class="property-header">
								<span class="property-dot" class:healthy={prop.healthy} class:unhealthy={!prop.healthy}></span>
								<span class="property-domain">{prop.domain}</span>
							</div>
							<div class="property-status">
								{#if prop.healthy}
									<span class="status-healthy">Operational</span>
								{:else}
									<span class="status-unhealthy">Down</span>
									{#if prop.down_since}
										<span class="status-since">since {formatTime(prop.down_since)}</span>
									{/if}
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Agent Status Grid -->
		<section class="space-y-4">
			<h2 class="section-title">Agent Status</h2>
			<div class="agent-grid">
				{#each sortedAgents as [agentName, stats]}
					{@const meta = agentMeta[agentName]}
					<div class="agent-card">
						<div class="agent-header">
							<div class="agent-indicator" class:success={stats.lastSuccess} class:error={!stats.lastSuccess}></div>
							<h3 class="agent-name">{agentName}</h3>
						</div>
						{#if meta}
							<p class="agent-description">{meta.description}</p>
						{/if}
						<div class="agent-meta">
							<div class="meta-row">
								<span class="meta-label">Schedule</span>
								<span class="meta-value">{meta?.schedule || 'Unknown'}</span>
							</div>
							<div class="meta-row">
								<span class="meta-label">Last Run</span>
								<span class="meta-value">{stats.lastRun ? formatRelativeTime(stats.lastRun) : 'Never'}</span>
							</div>
							<div class="meta-row">
								<span class="meta-label">Runs (7d)</span>
								<span class="meta-value">{stats.totalRuns}</span>
							</div>
							<div class="meta-row">
								<span class="meta-label">Success Rate</span>
								<span class="meta-value" class:success={stats.successRate > 95} class:warning={stats.successRate <= 95}>
									{stats.successRate.toFixed(0)}%
								</span>
							</div>
							<div class="meta-row">
								<span class="meta-label">Avg Cost</span>
								<span class="meta-value">{formatCost(stats.avgCost)}</span>
							</div>
							<div class="meta-row">
								<span class="meta-label">Model</span>
								<span class="meta-value model">{meta?.model || 'Unknown'}</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- Recent Activity Log -->
		<section class="space-y-4">
			<h2 class="section-title">Recent Activity</h2>
			<div class="activity-list">
				{#each recentLogs as log}
					<div class="activity-item">
						<div class="activity-indicator" class:success={log.success} class:error={!log.success}></div>
						<div class="activity-content">
							<div class="activity-header">
								<span class="activity-agent">{log.agent}</span>
								<span class="activity-time">{formatRelativeTime(log.timestamp)}</span>
							</div>
							<div class="activity-details">
								{#if log.success}
									{#if log.cost_usd !== undefined && log.cost_usd > 0}
										<span class="detail-chip">{formatCost(log.cost_usd)}</span>
									{/if}
									{#if log.model}
										<span class="detail-chip model">{log.model.replace('claude-', '').slice(0, 12)}</span>
									{/if}
									{#if log.all_healthy !== undefined}
										<span class="detail-chip" class:healthy={log.all_healthy} class:unhealthy={!log.all_healthy}>
											{log.all_healthy ? 'All healthy' : 'Issues detected'}
										</span>
									{/if}
									{#if log.changes && log.changes.length > 0}
										<span class="detail-chip changes">{log.changes.length} change(s)</span>
									{/if}
								{:else}
									<span class="detail-chip error">Error: {log.error?.slice(0, 50)}</span>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- Recent Incidents -->
		{#if data.status?.incidents && data.status.incidents.length > 0}
			<section class="space-y-4">
				<h2 class="section-title">Recent Incidents</h2>
				<div class="incident-list">
					{#each data.status.incidents.slice(0, 10) as incident}
						<div class="incident-item">
							<time class="incident-time">{formatTime(incident.timestamp)}</time>
							<span class="incident-message">{incident.message}</span>
						</div>
					{/each}
				</div>
			</section>
		{:else}
			<section class="space-y-4">
				<h2 class="section-title">Recent Incidents</h2>
				<p class="no-incidents">No incidents in the last 7 days</p>
			</section>
		{/if}

		<!-- Architecture Reference -->
		<section class="abstract-section pl-6 space-y-4">
			<h2 class="section-title">Architecture</h2>
			<p class="text-tertiary leading-relaxed">
				CREATE SOMETHING runs autonomous agents via <a href="https://modal.com" class="link" target="_blank" rel="noopener">Modal</a>.
				These agents handle infrastructure monitoring, code quality checks, content generation, and automated deployments.
				The agents follow the Subtractive Triad: DRY (eliminate duplication), Rams (only what earns existence),
				and Heidegger (serve the whole system).
			</p>

			<div class="architecture-grid">
				<div class="arch-card">
					<h3 class="arch-title">Scheduled Agents (5 cron jobs)</h3>
					<ul class="arch-list">
						<li><strong>Monitor</strong> - Hourly health checks</li>
						<li><strong>Coordinator</strong> - Daily orchestration (8am UTC)</li>
						<li><strong>Review</strong> - Monday Subtractive Triad audit</li>
						<li><strong>Resolution</strong> - Mon/Tue/Fri fix proposals</li>
						<li><strong>Content</strong> - Tue-Fri content drafts</li>
					</ul>
				</div>
				<div class="arch-card">
					<h3 class="arch-title">On-Demand Agents</h3>
					<ul class="arch-list">
						<li><strong>Canon Audit</strong> - CSS compliance (via launchd)</li>
						<li><strong>DRY Check</strong> - Duplication analysis</li>
						<li><strong>Deploy</strong> - GitHub webhook deployments</li>
					</ul>
				</div>
			</div>
		</section>

		<!-- Footer -->
		<footer class="footer-section">
			<p class="text-muted">
				Agent infrastructure powered by <a href="https://modal.com" class="link" target="_blank" rel="noopener">Modal</a>.
				View <a href="/status" class="link">system status</a> or
				<a href="https://github.com/createsomethingtoday/create-something-monorepo/blob/main/packages/agent-sdk/modal_agents.py" class="link" target="_blank" rel="noopener">source code</a>.
			</p>
		</footer>
	</div>
</div>

<style>
	@import '$lib/styles/visualization-experiment.css';

	/* Status Banner */
	.status-banner {
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
		padding: var(--space-performance-md);
		background: var(--color-performance-bg-subtle);
		border-radius: var(--radius-performance-scale-lg);
	}

	.status-banner.healthy {
		border-color: var(--color-performance-success-border);
	}

	.status-banner.degraded {
		border-color: var(--color-performance-error-border);
	}

	.status-indicator {
		width: 12px;
		height: 12px;
		border-radius: var(--radius-performance-scale-full);
		animation: pulse 2s infinite;
	}

	.status-banner.healthy .status-indicator {
		background: var(--color-performance-success);
	}

	.status-banner.degraded .status-indicator {
		background: var(--color-performance-error);
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.status-label {
		font-size: var(--text-performance-body-lg);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
	}

	.status-updated {
		margin-left: auto;
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-performance-md);
	}

	@media (max-width: 768px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.stat-card {
		padding: var(--space-performance-md);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		text-align: center;
	}

	.stat-label {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		margin-bottom: var(--space-performance-xs);
	}

	.stat-value {
		font-size: var(--text-performance-h2);
		font-weight: 700;
		color: var(--color-performance-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.stat-value.success {
		color: var(--color-performance-success);
	}

	.stat-value.warning {
		color: var(--color-performance-warning);
	}

	/* Property Grid */
	.property-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-performance-sm);
	}

	@media (max-width: 640px) {
		.property-grid {
			grid-template-columns: 1fr;
		}
	}

	.property-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-performance-md);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-md);
	}

	.property-header {
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
	}

	.property-dot {
		width: 8px;
		height: 8px;
		border-radius: var(--radius-performance-scale-full);
	}

	.property-dot.healthy {
		background: var(--color-performance-success);
	}

	.property-dot.unhealthy {
		background: var(--color-performance-error);
	}

	.property-domain {
		font-family: monospace;
		color: var(--color-performance-fg-primary);
	}

	.property-status {
		display: flex;
		align-items: center;
		gap: var(--space-performance-xs);
	}

	.status-healthy {
		color: var(--color-performance-success);
		font-size: var(--text-performance-body-sm);
	}

	.status-unhealthy {
		color: var(--color-performance-error);
		font-size: var(--text-performance-body-sm);
	}

	.status-since {
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-caption);
	}

	/* Agent Grid */
	.agent-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-performance-md);
	}

	.agent-card {
		padding: var(--space-performance-md);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
	}

	.agent-header {
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
		margin-bottom: var(--space-performance-xs);
	}

	.agent-indicator {
		width: 8px;
		height: 8px;
		border-radius: var(--radius-performance-scale-full);
	}

	.agent-indicator.success {
		background: var(--color-performance-success);
	}

	.agent-indicator.error {
		background: var(--color-performance-error);
	}

	.agent-name {
		font-size: var(--text-performance-body-lg);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
		font-family: monospace;
	}

	.agent-description {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
		margin-bottom: var(--space-performance-sm);
	}

	.agent-meta {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
	}

	.meta-row {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-performance-body-sm);
	}

	.meta-label {
		color: var(--color-performance-fg-muted);
	}

	.meta-value {
		color: var(--color-performance-fg-secondary);
		font-variant-numeric: tabular-nums;
	}

	.meta-value.success {
		color: var(--color-performance-success);
	}

	.meta-value.warning {
		color: var(--color-performance-warning);
	}

	.meta-value.model {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	/* Activity List */
	.activity-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
	}

	.activity-item {
		display: flex;
		align-items: flex-start;
		gap: var(--space-performance-sm);
		padding: var(--space-performance-sm) var(--space-performance-md);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-md);
	}

	.activity-indicator {
		width: 6px;
		height: 6px;
		border-radius: var(--radius-performance-scale-full);
		margin-top: 6px;
		flex-shrink: 0;
	}

	.activity-indicator.success {
		background: var(--color-performance-success);
	}

	.activity-indicator.error {
		background: var(--color-performance-error);
	}

	.activity-content {
		flex: 1;
		min-width: 0;
	}

	.activity-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-performance-xs);
	}

	.activity-agent {
		font-weight: 600;
		font-family: monospace;
		color: var(--color-performance-fg-primary);
	}

	.activity-time {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	.activity-details {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-performance-xs);
	}

	.detail-chip {
		display: inline-block;
		padding: 2px 8px;
		font-size: var(--text-performance-caption);
		background: var(--color-performance-bg-subtle);
		border-radius: var(--radius-performance-scale-sm);
		color: var(--color-performance-fg-tertiary);
	}

	.detail-chip.model {
		font-family: monospace;
	}

	.detail-chip.healthy {
		color: var(--color-performance-success);
		background: var(--color-performance-success-muted);
	}

	.detail-chip.unhealthy {
		color: var(--color-performance-error);
		background: var(--color-performance-error-muted);
	}

	.detail-chip.error {
		color: var(--color-performance-error);
		background: var(--color-performance-error-muted);
	}

	.detail-chip.changes {
		color: var(--color-performance-info);
		background: var(--color-performance-info-muted);
	}

	/* Incident List */
	.incident-list {
		display: flex;
		flex-direction: column;
	}

	.incident-item {
		display: flex;
		gap: var(--space-performance-md);
		padding: var(--space-performance-sm) 0;
	}

	.incident-time {
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-body-sm);
		white-space: nowrap;
	}

	.incident-message {
		color: var(--color-performance-fg-secondary);
		font-size: var(--text-performance-body-sm);
	}

	.no-incidents {
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-body-sm);
	}

	/* Architecture Section */
	.architecture-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-performance-md);
		margin-top: var(--space-performance-md);
	}

	@media (max-width: 640px) {
		.architecture-grid {
			grid-template-columns: 1fr;
		}
	}

	.arch-card {
		padding: var(--space-performance-md);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
	}

	.arch-title {
		font-size: var(--text-performance-body);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-sm);
	}

	.arch-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
	}

	.arch-list li {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
	}

	.arch-list li strong {
		color: var(--color-performance-fg-secondary);
	}
	.footer-section {
		padding-top: var(--space-performance-lg);
	}
</style>
