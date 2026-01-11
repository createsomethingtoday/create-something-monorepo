<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function formatTime(iso: string): string {
		const date = new Date(iso);
		return date.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			timeZoneName: 'short',
		});
	}

	function getStatusColor(healthy: boolean): string {
		return healthy ? 'var(--color-success)' : 'var(--color-error)';
	}

	function getOverallStatus(status: string): { label: string; color: string } {
		switch (status) {
			case 'operational':
				return { label: 'All Systems Operational', color: 'var(--color-success)' };
			case 'degraded':
				return { label: 'Partial Outage', color: 'var(--color-warning)' };
			default:
				return { label: 'Major Outage', color: 'var(--color-error)' };
		}
	}
</script>

<svelte:head>
	<title>Status | CREATE SOMETHING</title>
	<meta name="description" content="Current operational status of CREATE SOMETHING properties" />
</svelte:head>

<main class="container">
	<header class="header">
		<h1>System Status</h1>
		<p class="subtitle">Real-time health monitoring for CREATE SOMETHING infrastructure</p>
	</header>

	{#if data.error}
		<div class="error-card">
			<p>Unable to fetch status: {data.error}</p>
		</div>
	{:else if data.status}
		{@const overall = getOverallStatus(data.status.status)}
		<section class="overall-status" style="--status-color: {overall.color}">
			<div class="status-indicator"></div>
			<span class="status-label">{overall.label}</span>
		</section>

		<section class="properties">
			<h2>Properties</h2>
			<div class="property-grid">
				{#each data.status.properties as prop}
					<div class="property-card">
						<div class="property-header">
							<span class="dot" style="background: {getStatusColor(prop.healthy)}"></span>
							<span class="domain">{prop.domain}</span>
						</div>
						<div class="property-status">
							{#if prop.healthy}
								<span class="healthy">Operational</span>
							{:else}
								<span class="unhealthy">Down</span>
								{#if prop.down_since}
									<span class="since">since {formatTime(prop.down_since)}</span>
								{/if}
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</section>

		{#if data.status.incidents.length > 0}
			<section class="incidents">
				<h2>Recent Incidents</h2>
				<ul class="incident-list">
					{#each data.status.incidents as incident}
						<li class="incident">
							<time>{formatTime(incident.timestamp)}</time>
							<span>{incident.message}</span>
						</li>
					{/each}
				</ul>
			</section>
		{:else}
			<section class="incidents">
				<h2>Recent Incidents</h2>
				<p class="no-incidents">No incidents in the last 7 days</p>
			</section>
		{/if}

		<footer class="updated">
			Last updated: {formatTime(data.status.updated_at)}
		</footer>
	{/if}
</main>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: var(--space-lg) var(--space-md);
	}

	.header {
		margin-bottom: var(--space-xl);
	}

	h1 {
		font-size: var(--text-h1);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.subtitle {
		color: var(--color-fg-muted);
		font-size: var(--text-body);
	}

	h2 {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.overall-status {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-md);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-xl);
	}

	.status-indicator {
		width: 12px;
		height: 12px;
		border-radius: var(--radius-full);
		background: var(--status-color);
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.status-label {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.properties {
		margin-bottom: var(--space-xl);
	}

	.property-grid {
		display: grid;
		gap: var(--space-sm);
	}

	.property-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.property-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: var(--radius-full);
	}

	.domain {
		color: var(--color-fg-primary);
		font-family: monospace;
	}

	.property-status {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.healthy {
		color: var(--color-success);
		font-size: var(--text-body-sm);
	}

	.unhealthy {
		color: var(--color-error);
		font-size: var(--text-body-sm);
	}

	.since {
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
	}

	.incidents {
		margin-bottom: var(--space-xl);
	}

	.incident-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.incident {
		display: flex;
		gap: var(--space-md);
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.incident time {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		white-space: nowrap;
	}

	.incident span {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
	}

	.no-incidents {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.error-card {
		padding: var(--space-md);
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-md);
		color: var(--color-error);
	}

	.updated {
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
		text-align: center;
	}
</style>
