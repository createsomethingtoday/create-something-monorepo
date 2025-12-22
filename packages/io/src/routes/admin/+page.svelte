<script lang="ts">
	import { onMount } from 'svelte';

	let stats = {
		experiments: 0,
		submissions: 0,
		subscribers: 0,
		executions: 0
	};
	let loading = true;

	onMount(async () => {
		try {
			const response = await fetch('/api/admin/stats');
			if (response.ok) {
				stats = await response.json();
			}
		} catch (error) {
			console.error('Failed to load stats:', error);
		} finally {
			loading = false;
		}
	});
</script>

<div class="space-y-8">
	<div>
		<h2 class="page-title mb-2">Dashboard</h2>
		<p class="page-description">Overview of CREATE SOMETHING systems</p>
	</div>

	<!-- Stats Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
		<div class="stat-card p-6">
			<div class="stat-label mb-2">Total Experiments</div>
			<div class="stat-value">
				{#if loading}
					<div class="skeleton h-10 w-20"></div>
				{:else}
					{stats.experiments}
				{/if}
			</div>
			<a href="/admin/experiments" class="stat-link mt-2 inline-block"
				>Manage →</a
			>
		</div>

		<div class="stat-card p-6">
			<div class="stat-label mb-2">Contact Submissions</div>
			<div class="stat-value">
				{#if loading}
					<div class="skeleton h-10 w-20"></div>
				{:else}
					{stats.submissions}
				{/if}
			</div>
			<a href="/admin/submissions" class="stat-link mt-2 inline-block"
				>Review →</a
			>
		</div>

		<div class="stat-card p-6">
			<div class="stat-label mb-2">Newsletter Subscribers</div>
			<div class="stat-value">
				{#if loading}
					<div class="skeleton h-10 w-20"></div>
				{:else}
					{stats.subscribers}
				{/if}
			</div>
			<a href="/admin/subscribers" class="stat-link mt-2 inline-block"
				>View →</a
			>
		</div>

		<div class="stat-card p-6">
			<div class="stat-label mb-2">Code Executions (.space)</div>
			<div class="stat-value">
				{#if loading}
					<div class="skeleton h-10 w-20"></div>
				{:else}
					{stats.executions}
				{/if}
			</div>
			<div class="stat-label mt-2">Last 30 days</div>
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="section-divider pt-8">
		<h3 class="section-title mb-4">Quick Actions</h3>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<a href="/admin/experiments?action=feature" class="action-card p-4 group">
				<div class="action-title">Feature an Experiment</div>
				<div class="action-description">Promote experiment to homepage</div>
			</a>

			<a href="/admin/submissions?filter=unread" class="action-card p-4 group">
				<div class="action-title">Review New Submissions</div>
				<div class="action-description">Check recent service inquiries</div>
			</a>
		</div>
	</div>

	<!-- System Info -->
	<div class="section-divider pt-8">
		<h3 class="section-title mb-4">System Status</h3>
		<div class="space-y-2">
			<div class="flex justify-between system-info-row">
				<span class="system-label">Database</span>
				<span class="system-value-success">● create-something-db (Cloudflare D1)</span>
			</div>
			<div class="flex justify-between system-info-row">
				<span class="system-label">Properties</span>
				<span class="system-value">.agency • .io • .space</span>
			</div>
			<div class="flex justify-between system-info-row">
				<span class="system-label">Admin Access</span>
				<span class="system-value">Human-in-the-loop oversight</span>
			</div>
		</div>
	</div>
</div>

<style>
	.page-title {
		font-size: var(--text-h1);
		font-weight: 700;
	}

	.page-description {
		color: var(--color-fg-tertiary);
	}

	.stat-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.stat-label {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	.stat-value {
		font-size: var(--text-display);
		font-weight: 700;
	}

	.stat-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.stat-link:hover {
		color: var(--color-fg-primary);
	}

	.skeleton {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
		background: var(--color-bg-elevated);
		border-radius: var(--radius-sm);
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.section-divider {
		border-top: 1px solid var(--color-border-default);
	}

	.section-title {
		font-size: var(--text-h3);
		font-weight: 600;
	}

	.action-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.action-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.action-title {
		font-weight: 600;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.action-card:hover .action-title {
		color: var(--color-fg-primary);
	}

	.action-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.system-info-row {
		font-size: var(--text-body-sm);
	}

	.system-label {
		color: var(--color-fg-tertiary);
	}

	.system-value {
		color: var(--color-fg-primary);
	}

	.system-value-success {
		color: var(--color-success);
	}
</style>
