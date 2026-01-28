<script lang="ts">
	import { SEO, Card } from '@create-something/canon';
	import type { PageData } from './$types';
	import { formatNumber, formatCurrency, formatPercent, getDeltaIndicator } from '$lib/funnel';

	let { data }: { data: PageData } = $props();

	const { summary, leads } = data;

	// Stage colors
	const stageColors: Record<string, string> = {
		awareness: 'var(--color-info)',
		consideration: 'var(--color-warning)',
		decision: 'var(--color-data-3)',
		won: 'var(--color-success)',
		lost: 'var(--color-error)'
	};
</script>

<SEO
	title="Admin - Funnel Dashboard"
	description="Administrative dashboard"
	propertyName="agency"
	noindex={true}
/>

<main class="dashboard">
	<header class="header">
		<h1>GTM Funnel</h1>
		<p class="period">
			{summary.period.start} — {summary.period.end}
		</p>
	</header>

	<!-- Awareness Metrics -->
	<section class="section">
		<h2 class="section-title">Awareness</h2>
		<div class="metrics-grid">
			<Card variant="standard" radius="md" padding="md" class="flex flex-col gap-2">
				<span class="metric-label">Impressions</span>
				<span class="metric-value">{formatNumber(summary.totals.impressions)}</span>
				<span class="metric-delta" class:positive={summary.changes.impressions_delta > 0}>
					{getDeltaIndicator(summary.changes.impressions_delta)} vs prior
				</span>
			</Card>
			<Card variant="standard" radius="md" padding="md" class="flex flex-col gap-2">
				<span class="metric-label">Reach</span>
				<span class="metric-value">{formatNumber(summary.totals.reach)}</span>
				<span class="metric-delta" class:positive={summary.changes.reach_delta > 0}>
					{getDeltaIndicator(summary.changes.reach_delta)} vs prior
				</span>
			</Card>
			<Card variant="standard" radius="md" padding="md" class="flex flex-col gap-2">
				<span class="metric-label">Engagements</span>
				<span class="metric-value">{formatNumber(summary.totals.engagements)}</span>
				<span class="metric-delta" class:positive={summary.changes.engagements_delta > 0}>
					{getDeltaIndicator(summary.changes.engagements_delta)} vs prior
				</span>
			</Card>
			<Card variant="standard" radius="md" padding="md" class="flex flex-col gap-2">
				<span class="metric-label">Engagement Rate</span>
				<span class="metric-value">{formatPercent(summary.conversion_rates.impression_to_engagement)}</span>
			</Card>
		</div>
	</section>

	<!-- Consideration Metrics -->
	<section class="section">
		<h2 class="section-title">Consideration</h2>
		<div class="metrics-grid">
			<Card variant="standard" radius="md" padding="md" class="flex flex-col gap-2">
				<span class="metric-label">Website Visits</span>
				<span class="metric-value">{formatNumber(summary.totals.website_visits)}</span>
			</Card>
			<Card variant="standard" radius="md" padding="md" class="flex flex-col gap-2">
				<span class="metric-label">Visit → Lead</span>
				<span class="metric-value">{formatPercent(summary.conversion_rates.visit_to_lead)}</span>
			</Card>
		</div>
	</section>

	<!-- Decision Metrics -->
	<section class="section">
		<h2 class="section-title">Decision</h2>
		<div class="metrics-grid">
			<Card variant="standard" radius="md" padding="md" class="flex flex-col gap-2">
				<span class="metric-label">Discovery Calls</span>
				<span class="metric-value">{summary.totals.discovery_calls}</span>
			</Card>
			<Card variant="standard" radius="md" padding="md" class="flex flex-col gap-2">
				<span class="metric-label">Proposals Sent</span>
				<span class="metric-value">{summary.totals.proposals_sent}</span>
			</Card>
			<Card variant="standard" radius="md" padding="md" class="flex flex-col gap-2">
				<span class="metric-label">Call → Proposal</span>
				<span class="metric-value">{formatPercent(summary.conversion_rates.call_to_proposal)}</span>
			</Card>
		</div>
	</section>

	<!-- Conversion Metrics -->
	<section class="section">
		<h2 class="section-title">Conversion</h2>
		<div class="metrics-grid">
			<Card variant="glass" radius="md" padding="md" class="glass-emphasis flex flex-col gap-2">
				<span class="metric-label">Deals Closed</span>
				<span class="metric-value">{summary.totals.deals_closed}</span>
			</Card>
			<Card variant="glass" radius="md" padding="md" class="glass-emphasis flex flex-col gap-2">
				<span class="metric-label">Revenue</span>
				<span class="metric-value">{formatCurrency(summary.totals.revenue)}</span>
			</Card>
			<Card variant="standard" radius="md" padding="md" class="flex flex-col gap-2">
				<span class="metric-label">Proposal → Close</span>
				<span class="metric-value">{formatPercent(summary.conversion_rates.proposal_to_close)}</span>
			</Card>
		</div>
	</section>

	<!-- Pipeline -->
	<section class="section">
		<h2 class="section-title">Pipeline</h2>
		<div class="pipeline">
			{#each Object.entries(summary.pipeline) as [stage, count]}
				<div class="pipeline-stage">
					<div class="stage-bar" style="--stage-color: {stageColors[stage]}">
						<span class="stage-count">{count}</span>
					</div>
					<span class="stage-label">{stage}</span>
				</div>
			{/each}
		</div>
		<div class="pipeline-value">
			<span>Pipeline Value: {formatCurrency(summary.pipeline_value.total_estimated)}</span>
			<span>Closed: {formatCurrency(summary.pipeline_value.total_closed)}</span>
		</div>
	</section>

	<!-- Recent Leads -->
	<section class="section">
		<h2 class="section-title">Recent Leads</h2>
		{#if leads.length === 0}
			<p class="empty-state">No leads yet. They'll appear here as they come in.</p>
		{:else}
			<div class="leads-table">
				<table>
					<thead>
						<tr>
							<th>Name</th>
							<th>Company</th>
							<th>Source</th>
							<th>Stage</th>
							<th>Value</th>
						</tr>
					</thead>
					<tbody>
						{#each leads.slice(0, 10) as lead}
							<tr>
								<td>{lead.name}</td>
								<td>{lead.company || '—'}</td>
								<td>{lead.source}</td>
								<td>
									<span class="stage-badge" style="--stage-color: {stageColors[lead.stage]}">
										{lead.stage}
									</span>
								</td>
								<td>{lead.estimated_value ? formatCurrency(lead.estimated_value) : '—'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<!-- Quick Actions -->
	<section class="section">
		<h2 class="section-title">Quick Actions</h2>
		<Card variant="glass" radius="md" padding="md" class="glass-emphasis flex flex-wrap gap-4">
			<a href="/admin/funnel/record" class="action-button">Record Daily Metrics</a>
			<a href="/admin/funnel/leads/new" class="action-button">Add Lead</a>
			<a href="/admin/social" class="action-button">Social Calendar</a>
			<a href="/admin/community" class="action-button">Community</a>
		</Card>
	</section>
</main>

<style>
	.dashboard {
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--space-lg);
	}

	.header {
		margin-bottom: var(--space-xl);
	}

	.header h1 {
		font-size: var(--text-h1);
		margin: 0 0 var(--space-xs) 0;
	}

	.period {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.section {
		margin-bottom: var(--space-xl);
	}

	.section-title {
		font-size: var(--text-h3);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-md) 0;
		padding-bottom: var(--space-xs);
		border-bottom: 1px solid var(--color-border-default);
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: var(--space-md);
	}

	.metric-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.metric-value {
		font-size: var(--text-h2);
		font-weight: 600;
	}

	.metric-delta {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.metric-delta.positive {
		color: var(--color-success);
	}

	.pipeline {
		display: flex;
		gap: var(--space-sm);
		align-items: flex-end;
		margin-bottom: var(--space-md);
	}

	.pipeline-stage {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
	}

	.stage-bar {
		width: 100%;
		min-height: 60px;
		background: var(--stage-color, var(--color-bg-subtle));
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0.8;
	}

	.stage-count {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.stage-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: capitalize;
	}

	.pipeline-value {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.leads-table {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		padding: var(--space-sm);
		text-align: left;
		border-bottom: 1px solid var(--color-border-default);
	}

	th {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	td {
		font-size: var(--text-body-sm);
	}

	.stage-badge {
		display: inline-block;
		padding: 2px 8px;
		background: var(--stage-color, var(--color-bg-subtle));
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		text-transform: capitalize;
		opacity: 0.8;
	}

	.empty-state {
		color: var(--color-fg-muted);
		font-style: italic;
		padding: var(--space-lg);
		text-align: center;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
	}

	.action-button {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		text-decoration: none;
		font-size: var(--text-body-sm);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.action-button:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}
</style>
