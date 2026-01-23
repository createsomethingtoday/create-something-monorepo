<script lang="ts">
	import ExperimentsChart from '$lib/components/routing/ExperimentsChart.svelte';
	import { SEO } from '@create-something/components';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<SEO
	title="Routing Dashboard"
	description="Model routing optimization metrics and experiments"
	keywords="model routing, Haiku, Sonnet, Opus, optimization, cost reduction, AI models"
	propertyName="space"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.space' },
		{ name: 'Experiments', url: 'https://createsomething.space/experiments' },
		{ name: 'Routing Dashboard', url: 'https://createsomething.space/experiments/routing-dashboard' }
	]}
/>

<div class="container">
	<header class="page-header">
		<h1>Routing Dashboard</h1>
		<p class="subtitle">
			Haiku optimization metrics: Plan (Sonnet) → Execute (Haiku) → Review (Opus)
		</p>
	</header>

	{#if data.success}
		<ExperimentsChart experiments={data.data} />

		<section class="experiments-list">
			<h2>Recent Experiments</h2>
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>Task</th>
							<th>Model</th>
							<th>Strategy</th>
							<th>Success</th>
							<th>Cost</th>
							<th>Date</th>
						</tr>
					</thead>
					<tbody>
						{#each data.data.slice().reverse().slice(0, 20) as exp}
							<tr class:success={exp.success} class:failed={!exp.success}>
								<td>
									<div class="task-info">
										<span class="task-id">{exp.taskId}</span>
										<span class="task-desc">{exp.description}</span>
									</div>
								</td>
								<td>
									<span class="model-badge {exp.modelUsed}">{exp.modelUsed.toUpperCase()}</span>
								</td>
								<td class="strategy">{exp.routingStrategy}</td>
								<td>
									<span class="status-badge {exp.success ? 'success' : 'failed'}">
										{exp.success ? '✓' : '✗'}
									</span>
								</td>
								<td class="cost">${exp.cost.toFixed(4)}</td>
								<td class="date">{new Date(exp.timestamp).toLocaleDateString()}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{:else}
		<div class="error-state">
			<p>Failed to load experiments: {data.error}</p>
		</div>
	{/if}
</div>

<style>
	.container {
		max-width: 87.5rem;
		margin: 0 auto;
		padding: var(--space-xl) var(--space-lg);
	}

	.page-header {
		margin-bottom: var(--space-xl);
	}

	.page-header h1 {
		font-size: var(--text-h1);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm) 0;
	}

	.subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.experiments-list {
		margin-top: var(--space-2xl);
	}

	.experiments-list h2 {
		font-size: var(--text-h2);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-lg) 0;
	}

	.table-wrapper {
		overflow-x: auto;
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		background: var(--color-bg-surface);
	}

	thead {
		background: var(--color-bg-subtle);
		border-bottom: 1px solid var(--color-border-emphasis);
	}

	th {
		padding: var(--space-md);
		text-align: left;
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	td {
		padding: var(--space-md);
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		border-bottom: 1px solid var(--color-border-default);
	}

	tr:last-child td {
		border-bottom: none;
	}

	tr.success {
		background: rgba(68, 170, 68, 0.02);
	}

	tr.failed {
		background: rgba(212, 77, 77, 0.02);
	}

	.task-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.task-id {
		font-family: 'Stack Sans', monospace;
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.task-desc {
		color: var(--color-fg-primary);
	}

	.model-badge {
		display: inline-block;
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
		font-weight: 600;
		font-family: 'Stack Sans', monospace;
	}

	.model-badge.haiku {
		background: var(--color-data-1-muted);
		color: var(--color-data-1);
	}

	.model-badge.sonnet {
		background: var(--color-data-3-muted);
		color: var(--color-data-3);
	}

	.model-badge.opus {
		background: var(--color-data-4-muted);
		color: var(--color-data-4);
	}

	.strategy {
		font-family: 'Stack Sans', monospace;
		font-size: var(--text-body-sm);
	}

	.status-badge {
		display: inline-block;
		width: 24px;
		height: 24px;
		line-height: 24px;
		text-align: center;
		border-radius: 50%;
		font-weight: 700;
	}

	.status-badge.success {
		background: var(--color-success-muted);
		color: var(--color-success);
	}

	.status-badge.failed {
		background: var(--color-error-muted);
		color: var(--color-error);
	}

	.cost {
		font-family: 'Stack Sans', monospace;
	}

	.date {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.error-state {
		padding: var(--space-xl);
		text-align: center;
		color: var(--color-error);
	}
</style>
