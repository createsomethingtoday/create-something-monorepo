<script lang="ts">
	import { SEO } from '@create-something/canon';

	let { data } = $props();

	const { metrics, user } = data;

	// Format currency
	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
		}).format(amount);
	}

	// Format time ago
	function timeAgo(isoString: string): string {
		const date = new Date(isoString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));

		if (diffMins < 1) return 'just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) return `${diffHours}h ago`;
		const diffDays = Math.floor(diffHours / 24);
		return `${diffDays}d ago`;
	}

	// Status badge color
	function statusColor(status: string): string {
		return status === 'success' ? 'var(--color-success)' : 'var(--color-error)';
	}
</script>

<SEO
	title="Dashboard | CREATE SOMETHING AGENCY"
	description="Your agent activity dashboard - see recovered revenue, execution metrics, and daily analytics."
	propertyName="agency"
/>

<div class="dashboard">
	<!-- Header -->
	<header class="dashboard-header">
		<div class="header-content">
			<h1 class="dashboard-title">Dashboard</h1>
			<p class="dashboard-subtitle">
				Your agents have been busy. Here's what they've done.
			</p>
		</div>
		<div class="period-selector">
			<span class="period-label">Last 30 days</span>
		</div>
	</header>

	<!-- Summary Cards -->
	<section class="summary-grid">
		<div class="summary-card highlight">
			<span class="summary-label">Revenue Recovered</span>
			<span class="summary-value">{formatCurrency(metrics.summary.revenueRecovered)}</span>
			<span class="summary-note">From no-show recovery + upsells</span>
		</div>

		<div class="summary-card">
			<span class="summary-label">Total Executions</span>
			<span class="summary-value">{metrics.summary.totalExecutions.toLocaleString()}</span>
			<span class="summary-note">Workflows triggered</span>
		</div>

		<div class="summary-card">
			<span class="summary-label">Success Rate</span>
			<span class="summary-value">{metrics.summary.successRate}%</span>
			<span class="summary-note">Completed successfully</span>
		</div>

		<div class="summary-card">
			<span class="summary-label">Hours Automated</span>
			<span class="summary-value">{metrics.summary.hoursAutomated}</span>
			<span class="summary-note">Manual work saved</span>
		</div>
	</section>

	<!-- Main Content Grid -->
	<div class="content-grid">
		<!-- Agent Performance -->
		<section class="agents-section">
			<h2 class="section-title">Agent Performance</h2>

			<div class="agents-list">
				{#each metrics.byAgent as agent}
					<div class="agent-card">
						<div class="agent-header">
							<h3 class="agent-name">{agent.name}</h3>
							<span class="agent-last-run">{timeAgo(agent.lastRun)}</span>
						</div>

						<div class="agent-metrics">
							<div class="agent-metric">
								<span class="metric-value">{agent.executions}</span>
								<span class="metric-label">Executions</span>
							</div>
							<div class="agent-metric">
								<span class="metric-value">{agent.successRate}%</span>
								<span class="metric-label">Success</span>
							</div>
							{#if agent.revenueRecovered}
								<div class="agent-metric highlight">
									<span class="metric-value">{formatCurrency(agent.revenueRecovered)}</span>
									<span class="metric-label">Recovered</span>
								</div>
							{/if}
							{#if agent.conversions}
								<div class="agent-metric">
									<span class="metric-value">{agent.conversions}</span>
									<span class="metric-label">Conversions</span>
								</div>
							{/if}
							{#if agent.verificationsCompleted}
								<div class="agent-metric">
									<span class="metric-value">{agent.verificationsCompleted}</span>
									<span class="metric-label">Verified</span>
								</div>
							{/if}
							{#if agent.reviewsGenerated}
								<div class="agent-metric">
									<span class="metric-value">{agent.reviewsGenerated}</span>
									<span class="metric-label">Reviews</span>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- Recent Activity -->
		<section class="activity-section">
			<h2 class="section-title">Recent Activity</h2>

			<div class="activity-list">
				{#each metrics.recentActivity as activity}
					<div class="activity-item">
						<div class="activity-status" style="background-color: {statusColor(activity.status)}"></div>
						<div class="activity-content">
							<p class="activity-agent">{activity.agentName}</p>
							<p class="activity-outcome">{activity.outcome}</p>
						</div>
						<span class="activity-time">{timeAgo(activity.timestamp)}</span>
					</div>
				{/each}
			</div>
		</section>
	</div>

	<!-- Daily Trend (Simple sparkline representation) -->
	<section class="trend-section">
		<h2 class="section-title">Daily Revenue Trend</h2>
		<div class="trend-chart">
			{#each metrics.dailyTrend as day}
				<div class="trend-bar-container">
					<div
						class="trend-bar"
						style="height: {(day.revenue / 520) * 100}%"
						title="{day.date}: {formatCurrency(day.revenue)}"
					></div>
					<span class="trend-label">{day.date.slice(-2)}</span>
				</div>
			{/each}
		</div>
	</section>

	<!-- WORKWAY Attribution -->
	<footer class="dashboard-footer">
		<p class="footer-note">
			Powered by <a href="https://workway.co" target="_blank" rel="noopener">WORKWAY</a>
		</p>
	</footer>
</div>

<style>
	.dashboard {
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--space-xl);
	}

	/* Header */
	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: var(--space-xl);
	}

	.dashboard-title {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.dashboard-subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
	}

	.period-selector {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.period-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* Summary Grid */
	.summary-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-md);
		margin-bottom: var(--space-xl);
	}

	.summary-card {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.summary-card.highlight {
		background: var(--color-fg-primary);
		color: var(--color-bg-primary);
	}

	.summary-card.highlight .summary-label,
	.summary-card.highlight .summary-note {
		color: var(--color-bg-primary);
		opacity: 0.8;
	}

	.summary-label {
		display: block;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-xs);
	}

	.summary-value {
		display: block;
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		margin-bottom: var(--space-xs);
	}

	.summary-note {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Content Grid */
	.content-grid {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: var(--space-xl);
		margin-bottom: var(--space-xl);
	}

	.section-title {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	/* Agents Section */
	.agents-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.agent-card {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.agent-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-md);
	}

	.agent-name {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.agent-last-run {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.agent-metrics {
		display: flex;
		gap: var(--space-lg);
	}

	.agent-metric {
		display: flex;
		flex-direction: column;
	}

	.agent-metric .metric-value {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.agent-metric.highlight .metric-value {
		color: var(--color-success, #22c55e);
	}

	.agent-metric .metric-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Activity Section */
	.activity-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.activity-item {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
	}

	.activity-status {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		margin-top: 6px;
		flex-shrink: 0;
	}

	.activity-content {
		flex: 1;
		min-width: 0;
	}

	.activity-agent {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.activity-outcome {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.activity-time {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		white-space: nowrap;
	}

	/* Trend Section */
	.trend-section {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-xl);
	}

	.trend-chart {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		height: 120px;
		gap: var(--space-sm);
	}

	.trend-bar-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 100%;
	}

	.trend-bar {
		width: 100%;
		background: var(--color-fg-primary);
		border-radius: var(--radius-sm) var(--radius-sm) 0 0;
		min-height: 4px;
		transition: height var(--duration-standard) var(--ease-standard);
	}

	.trend-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-top: var(--space-xs);
	}

	/* Footer */
	.dashboard-footer {
		text-align: center;
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.footer-note {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.footer-note a {
		color: var(--color-fg-secondary);
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.summary-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.content-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.dashboard {
			padding: var(--space-md);
		}

		.dashboard-header {
			flex-direction: column;
			gap: var(--space-md);
		}

		.summary-grid {
			grid-template-columns: 1fr;
		}

		.agent-metrics {
			flex-wrap: wrap;
		}
	}
</style>
