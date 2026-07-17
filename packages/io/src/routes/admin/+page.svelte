<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { onMount } from 'svelte';
	import { fetchAdminJson, type AdminRequestError } from '$lib/admin/client';

	interface AdminStats {
		experiments: number;
		submissions: number | null;
		subscribers: number | null;
		executions: number | null;
	}

	let stats: AdminStats | null = null;
	let loadError: AdminRequestError | null = null;
	let loading = true;

	onMount(async () => {
		const result = await fetchAdminJson<AdminStats>('/api/admin/stats');
		if (result.ok) {
			stats = result.data;
		} else {
			loadError = result.error;
		}
		loading = false;
	});

	function displayStat(value: number | null | undefined) {
		return value === null || value === undefined ? '—' : value.toLocaleString();
	}
</script>

<SEO
	title="Admin - Dashboard"
	description="Administrative dashboard"
	propertyName="io"
	noindex={true}
/>

<div class="space-y-8">
	<div>
		<h2 class="page-title mb-2">Dashboard</h2>
		<p class="page-description">Overview of CREATE SOMETHING systems</p>
	</div>

	{#if loadError}
		<div class="stats-error" role="alert">
			<strong>Some dashboard metrics are unavailable.</strong>
			<span>{loadError.message}</span>
		</div>
	{/if}

	<!-- Stats Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
		<div class="stat-card p-6">
			<div class="stat-label mb-2">Total Experiments</div>
			<div class="stat-value">
				{#if loading}
					<div class="skeleton h-10 w-20"></div>
				{:else}
					{displayStat(stats?.experiments)}
				{/if}
			</div>
			<a href="/admin/experiments" class="stat-link mt-2 inline-block"
				>Review →</a
			>
		</div>

		<div class="stat-card p-6">
			<div class="stat-label mb-2">Contact Submissions</div>
			<div class="stat-value">
				{#if loading}
					<div class="skeleton h-10 w-20"></div>
				{:else}
					{displayStat(stats?.submissions)}
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
					{displayStat(stats?.subscribers)}
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
					{displayStat(stats?.executions)}
				{/if}
			</div>
			<div class="stat-label mt-2">Last 30 days</div>
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="section-divider pt-8">
		<h3 class="section-title mb-4">Quick Actions</h3>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<a href="/admin/experiments" class="action-card p-4 group">
				<div class="action-title">Review Experiment Catalog</div>
				<div class="action-description">Inspect the repository-owned published catalog</div>
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
		font-size: var(--text-performance-h1);
		font-weight: 700;
	}

	.page-description {
		color: var(--color-performance-fg-tertiary);
	}

	.stats-error {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
		padding: var(--space-performance-md);
		border-radius: var(--radius-performance-scale-lg);
		color: var(--color-performance-error);
	}

	.stat-card {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
	}

	.stat-label {
		color: var(--color-performance-fg-tertiary);
		font-size: var(--text-performance-body-sm);
	}

	.stat-value {
		font-size: var(--text-performance-display);
		font-weight: 700;
	}

	.stat-link {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
		transition: color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.stat-link:hover {
		color: var(--color-performance-fg-primary);
	}

	.skeleton {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
		border-radius: var(--radius-performance-scale-sm);
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}


	.section-title {
		font-size: var(--text-performance-h3);
		font-weight: 600;
	}

	.action-card {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		transition: border-color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.action-card:hover {
		border-color: var(--color-performance-border-emphasis);
	}

	.action-title {
		font-weight: 600;
		transition: color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.action-card:hover .action-title {
		color: var(--color-performance-fg-primary);
	}

	.action-description {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
	}

	.system-info-row {
		font-size: var(--text-performance-body-sm);
	}

	.system-label {
		color: var(--color-performance-fg-tertiary);
	}

	.system-value {
		color: var(--color-performance-fg-primary);
	}

	.system-value-success {
		color: var(--color-performance-success);
	}
</style>
