<!--
  Admin Analytics Dashboard

  Tracks template deploys, workflow activations, and .agency conversions.
  The key question: Are templates converting to .agency leads?

  Heideggerian: Numbers that matter, not vanity metrics.
-->
<script lang="ts">
	import type { DailyStats, FunnelMetrics, TemplateMetrics, Feedback } from '$lib/services/analytics';

	interface Props {
		data: {
			funnel: FunnelMetrics;
			daily: DailyStats[];
			templates: TemplateMetrics[];
			recentEvents: Array<{
				id: string;
				eventType: string;
				templateId?: string;
				source?: string;
				createdAt: string;
			}>;
			feedback: Feedback[];
			days: number;
		};
	}

	let { data }: Props = $props();

	// Calculate max for chart normalization
	const maxDeploys = Math.max(...data.daily.map((d) => d.deploys), 1);
</script>

<svelte:head>
	<title>Analytics | Templates Platform Admin</title>
</svelte:head>

<div class="admin-layout">
	<nav class="admin-nav">
		<a href="/admin" class="nav-link">← Back to Admin</a>
		<h1>Analytics Dashboard</h1>
	</nav>

	<main class="admin-main">
		<!-- Funnel Metrics -->
		<section class="metrics-section">
			<h2>Conversion Funnel (Last {data.days} days)</h2>
			<div class="funnel-grid">
				<div class="funnel-stage">
					<span class="funnel-value">{data.funnel.landingViews}</span>
					<span class="funnel-label">Landing Views</span>
				</div>
				<div class="funnel-arrow">→</div>
				<div class="funnel-stage">
					<span class="funnel-value">{data.funnel.templateViews}</span>
					<span class="funnel-label">Template Views</span>
				</div>
				<div class="funnel-arrow">→</div>
				<div class="funnel-stage">
					<span class="funnel-value">{data.funnel.deployStarts}</span>
					<span class="funnel-label">Deploy Starts</span>
				</div>
				<div class="funnel-arrow">→</div>
				<div class="funnel-stage highlight">
					<span class="funnel-value">{data.funnel.deployCompletions}</span>
					<span class="funnel-label">Deploys</span>
				</div>
				<div class="funnel-arrow">→</div>
				<div class="funnel-stage agency">
					<span class="funnel-value">{data.funnel.agencyClicks}</span>
					<span class="funnel-label">.agency Leads</span>
				</div>
			</div>

			<div class="conversion-rates">
				<div class="rate">
					<span class="rate-value">{data.funnel.conversionRate.toFixed(1)}%</span>
					<span class="rate-label">Landing → Deploy</span>
				</div>
				<div class="rate">
					<span class="rate-value">{data.funnel.agencyConversionRate.toFixed(1)}%</span>
					<span class="rate-label">Deploy → .agency</span>
				</div>
			</div>
		</section>

		<!-- Daily Chart -->
		<section class="chart-section">
			<h2>Daily Deploys</h2>
			<div class="chart-container">
				<div class="chart-bars">
					{#each data.daily as day}
						<div class="chart-bar-wrapper" title="{day.date}: {day.deploys} deploys">
							<div
								class="chart-bar"
								style="height: {(day.deploys / maxDeploys) * 100}%"
							></div>
						</div>
					{/each}
				</div>
				{#if data.daily.length > 0}
					<div class="chart-labels">
						<span>{data.daily[0]?.date}</span>
						<span>{data.daily[data.daily.length - 1]?.date}</span>
					</div>
				{/if}
			</div>
		</section>

		<div class="two-column">
			<!-- Template Performance -->
			<section class="list-section">
				<h2>Template Performance</h2>
				{#if data.templates.length === 0}
					<p class="empty-state">No template data yet</p>
				{:else}
					<!-- Mobile Card Layout -->
					<div class="template-cards">
						{#each data.templates as template}
							<div class="template-card">
								<div class="template-card-header">
									<span class="template-name">{template.templateId}</span>
								</div>
								<div class="template-card-metrics">
									<div class="metric">
										<span class="metric-value">{template.deploys}</span>
										<span class="metric-label">Deploys</span>
									</div>
									<div class="metric">
										<span class="metric-value">{template.activeWorkflows}</span>
										<span class="metric-label">Workflows</span>
									</div>
									<div class="metric">
										<span class="metric-value">{template.agencyLeads}</span>
										<span class="metric-label">.agency</span>
									</div>
								</div>
							</div>
						{/each}
					</div>

					<!-- Desktop Table Layout -->
					<div class="data-table-wrapper">
						<table class="data-table">
							<thead>
								<tr>
									<th>Template</th>
									<th>Deploys</th>
									<th>Workflows</th>
									<th>.agency</th>
								</tr>
							</thead>
							<tbody>
								{#each data.templates as template}
									<tr>
										<td>{template.templateId}</td>
										<td>{template.deploys}</td>
										<td>{template.activeWorkflows}</td>
										<td>{template.agencyLeads}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>

			<!-- Recent Events -->
			<section class="list-section">
				<h2>Recent Events</h2>
				{#if data.recentEvents.length === 0}
					<p class="empty-state">No events yet</p>
				{:else}
					<ul class="event-list">
						{#each data.recentEvents as event}
							<li class="event-item">
								<span class="event-type" data-type={event.eventType}>{event.eventType}</span>
								<span class="event-meta">
									{event.templateId || 'N/A'} · {event.source || 'direct'}
								</span>
								<span class="event-time">{new Date(event.createdAt).toLocaleString()}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		</div>

		<!-- Feedback -->
		<section class="feedback-section">
			<h2>Recent Feedback</h2>
			{#if data.feedback.length === 0}
				<p class="empty-state">No feedback yet</p>
			{:else}
				<div class="feedback-grid">
					{#each data.feedback as item}
						<div class="feedback-card">
							<div class="feedback-header">
								<span class="feedback-type" data-type={item.type}>{item.type}</span>
								<span class="feedback-status" data-status={item.status}>{item.status}</span>
							</div>
							{#if item.title}
								<h4>{item.title}</h4>
							{/if}
							<p>{item.description}</p>
							<span class="feedback-date">{new Date(item.createdAt || '').toLocaleDateString()}</span>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	</main>
</div>

<style>
	.admin-layout {
		min-height: 100vh;
		background: var(--color-bg-pure);
	}

	.admin-nav {
		padding: var(--space-md) var(--gutter);
		background: var(--color-bg-elevated);
		border-bottom: 1px solid var(--color-border-default);
		display: flex;
		align-items: center;
		gap: var(--space-lg);
	}

	.nav-link {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.admin-nav h1 {
		font-size: var(--text-h3);
		margin: 0;
	}

	.admin-main {
		max-width: var(--content-width);
		margin: 0 auto;
		padding: var(--space-xl) var(--gutter);
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
	}

	h2 {
		font-size: var(--text-h3);
		margin: 0 0 var(--space-md);
	}

	/* Funnel */
	.metrics-section {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.funnel-grid {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		margin-bottom: var(--space-lg);
		flex-wrap: wrap;
	}

	.funnel-stage {
		text-align: center;
		padding: var(--space-md);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		flex: 1;
		min-width: 100px;
	}

	.funnel-stage.highlight {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.funnel-stage.agency {
		background: linear-gradient(135deg, var(--color-info), var(--color-data-2));
		color: var(--color-fg-primary);
	}

	.funnel-value {
		display: block;
		font-size: var(--text-h2);
		font-weight: 700;
	}

	.funnel-label {
		font-size: var(--text-body-sm);
		opacity: 0.8;
	}

	.funnel-arrow {
		color: var(--color-fg-muted);
		font-size: var(--text-h3);
	}

	.conversion-rates {
		display: flex;
		gap: var(--space-xl);
		justify-content: center;
	}

	.rate {
		text-align: center;
	}

	.rate-value {
		display: block;
		font-size: var(--text-h2);
		font-weight: 600;
		color: var(--color-success);
	}

	.rate-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Chart */
	.chart-section {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.chart-container {
		height: 200px;
		display: flex;
		flex-direction: column;
	}

	.chart-bars {
		flex: 1;
		display: flex;
		align-items: flex-end;
		gap: 2px;
	}

	.chart-bar-wrapper {
		flex: 1;
		height: 100%;
		display: flex;
		align-items: flex-end;
	}

	.chart-bar {
		width: 100%;
		background: var(--color-fg-primary);
		border-radius: 2px 2px 0 0;
		min-height: 4px;
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.chart-bar-wrapper:hover .chart-bar {
		background: var(--color-fg-secondary);
	}

	.chart-labels {
		display: flex;
		justify-content: space-between;
		padding-top: var(--space-xs);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Two Column */
	.two-column {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-lg);
	}

	/* List Sections */
	.list-section {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.empty-state {
		color: var(--color-fg-muted);
		text-align: center;
		padding: var(--space-lg);
	}

	/* Template Cards (Mobile) */
	.template-cards {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.data-table-wrapper {
		display: none;
	}

	@media (min-width: 768px) {
		.template-cards {
			display: none;
		}

		.data-table-wrapper {
			display: block;
		}
	}

	.template-card {
		padding: var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.template-card-header {
		margin-bottom: var(--space-sm);
	}

	.template-name {
		font-weight: 600;
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
	}

	.template-card-metrics {
		display: flex;
		gap: var(--space-md);
	}

	.metric {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: 1;
	}

	.metric-value {
		font-size: var(--text-h3);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--color-fg-primary);
	}

	.metric-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
	}

	.data-table th,
	.data-table td {
		padding: var(--space-sm);
		text-align: left;
		border-bottom: 1px solid var(--color-border-default);
	}

	.data-table th {
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-fg-secondary);
	}

	.data-table td {
		font-size: var(--text-body-sm);
		font-variant-numeric: tabular-nums;
	}

	/* Event List */
	.event-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.event-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--color-border-default);
		font-size: var(--text-body-sm);
	}

	.event-item:last-child {
		border-bottom: none;
	}

	.event-type {
		padding: 2px 8px;
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		font-weight: 500;
		background: var(--color-bg-subtle);
	}

	.event-type[data-type='deploy'] {
		background: var(--color-success);
		color: var(--color-fg-primary);
	}

	.event-type[data-type='agency_contact'] {
		background: var(--color-data-2);
		color: var(--color-fg-primary);
	}

	.event-meta {
		flex: 1;
		color: var(--color-fg-muted);
	}

	.event-time {
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
	}

	/* Feedback */
	.feedback-section {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.feedback-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-md);
	}

	.feedback-card {
		padding: var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.feedback-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: var(--space-sm);
	}

	.feedback-type {
		padding: 2px 8px;
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		font-weight: 500;
		background: var(--color-bg-subtle);
	}

	.feedback-type[data-type='feature_request'] {
		background: var(--color-data-1);
		color: var(--color-fg-primary);
	}

	.feedback-type[data-type='sdk_feedback'] {
		background: var(--color-data-3);
		color: var(--color-fg-primary);
	}

	.feedback-status {
		padding: 2px 8px;
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		background: var(--color-bg-subtle);
		color: var(--color-fg-muted);
	}

	.feedback-status[data-status='new'] {
		background: var(--color-warning);
		color: var(--color-fg-primary);
	}

	.feedback-card h4 {
		margin: 0 0 var(--space-xs);
		font-size: var(--text-body);
	}

	.feedback-card p {
		margin: 0;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.feedback-date {
		display: block;
		margin-top: var(--space-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	@media (max-width: 768px) {
		.two-column {
			grid-template-columns: 1fr;
		}

		.funnel-arrow {
			display: none;
		}

		.funnel-grid {
			flex-direction: column;
		}

		.funnel-stage {
			width: 100%;
		}

		/* Event list mobile improvements */
		.event-item {
			flex-wrap: wrap;
		}

		.event-meta {
			order: 3;
			width: 100%;
			margin-top: var(--space-xs);
		}

		.event-time {
			order: 2;
			margin-left: auto;
		}

		/* Conversion rates stack on mobile */
		.conversion-rates {
			flex-direction: column;
			gap: var(--space-md);
		}
	}
</style>
