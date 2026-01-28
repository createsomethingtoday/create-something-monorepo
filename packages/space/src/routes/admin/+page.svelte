<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { onMount } from 'svelte';

	let stats = $state({
		totalEvents: 0,
		todayEvents: 0,
		activeSessions: 0,
		topAction: '',
	});
	let loading = $state(true);

	onMount(async () => {
		try {
			const res = await fetch('/api/admin/analytics/summary');
			if (res.ok) {
				stats = await res.json();
			}
		} catch (e) {
			console.error('Failed to load stats:', e);
		} finally {
			loading = false;
		}
	});
</script>

<SEO
	title="Admin - Dashboard"
	description="Administrative dashboard"
	propertyName="space"
	noindex={true}
/>

<div class="dashboard">
	<h1 class="page-title">Space Admin</h1>
	<p class="page-description">Unified analytics for createsomething.space</p>

	{#if loading}
		<p class="loading">Loading...</p>
	{:else}
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-value">{stats.totalEvents.toLocaleString()}</div>
				<div class="stat-label">Total Events</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{stats.todayEvents.toLocaleString()}</div>
				<div class="stat-label">Events Today</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{stats.activeSessions.toLocaleString()}</div>
				<div class="stat-label">Sessions (24h)</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{stats.topAction || '—'}</div>
				<div class="stat-label">Top Action</div>
			</div>
		</div>

		<div class="quick-links">
			<h2 class="section-title">Quick Links</h2>
			<div class="link-grid">
				<a href="/admin/analytics" class="link-card">
					<span class="link-title">Analytics Dashboard</span>
					<span class="link-description">View detailed event analytics and user behavior</span>
				</a>
			</div>
		</div>
	{/if}
</div>

<style>
	.dashboard {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.page-title {
		font-size: var(--text-h1);
		font-weight: 700;
		margin: 0;
	}

	.page-description {
		color: var(--color-fg-tertiary);
		margin: 0;
	}

	.loading {
		color: var(--color-fg-tertiary);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	.stat-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.stat-value {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.stat-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-top: var(--space-xs);
	}

	.quick-links {
		margin-top: var(--space-md);
	}

	.section-title {
		font-size: var(--text-h3);
		font-weight: 600;
		margin: 0 0 var(--space-sm) 0;
	}

	.link-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-md);
	}

	.link-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.link-card:hover {
		border-color: var(--color-border-emphasis);
		background: var(--color-bg-subtle);
	}

	.link-title {
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.link-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}
</style>
