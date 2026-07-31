<script lang="ts">
	/**
	 * Tufte Dashboard Page
	 *
	 * Operational analytics dashboard:
	 * Raw D1 data → pattern checks → charts → operator decision
	 *
	 * This page showcases all @create-something/tufte components:
	 * - MetricCard: Summary metrics with sparklines
	 * - HighDensityTable: Ranked lists
	 * - DailyGrid: Temporal small multiples
	 * - ComparativeSparklines: Multi-series comparison
	 * - DistributionBar: Proportional breakdown
	 * - HourlyHeatmap: Hour × day patterns
	 * - TrendIndicator: Period-over-period change
	 */

	import { SEO } from '@create-something/canon';
	import { onMount } from 'svelte';
	import { TufteDashboard } from '@create-something/canon/domains/io';
	import { fetchAdminJson } from '$lib/admin/client';

	let loading = true;
	let error: string | null = null;
	let data: any = null;
	let days = 30;

	async function loadDashboard() {
		loading = true;
		error = null;
		const result = await fetchAdminJson(`/api/tufte/dashboard?days=${days}`);
		if (result.ok) {
			data = result.data;
		} else {
			error = result.error.message || 'Operational analysis is unavailable.';
		}
		loading = false;
	}

	onMount(() => {
		loadDashboard();
	});

	function changeDashboardRange(event: Event) {
		days = Number((event.currentTarget as HTMLSelectElement).value);
		void loadDashboard();
	}
</script>

<SEO
	title="Admin - Tufte Dashboard"
	description="Administrative dashboard"
	propertyName="io"
	noindex={true}
/>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-start justify-between">
		<div>
			<h1 class="page-title mb-2">Operational Analysis</h1>
			<p class="page-description max-w-xl">
				Review page, subscriber, agent, and inquiry trends. Data: IO database records;
				Workers AI adds a summary when available.
			</p>
		</div>

		<div class="flex items-center gap-4">
			<!-- Period Selector -->
			<select
				value={days}
				onchange={changeDashboardRange}
				class="select-field px-4 py-2"
			>
				<option value={7}>Last 7 days</option>
				<option value={14}>Last 14 days</option>
				<option value={30}>Last 30 days</option>
				<option value={90}>Last 90 days</option>
			</select>

			<!-- Refresh Button -->
			<button
				onclick={loadDashboard}
				disabled={loading}
				class="btn-secondary px-4 py-2"
			>
				{loading ? 'Loading...' : 'Refresh'}
			</button>
		</div>
	</div>

	<!-- Data path -->
	<div class="context-card p-4">
		<h2 class="context-title mb-2">How this page works</h2>
		<p class="context-flow font-mono">
			Database records → pattern checks → charts → operator decision
		</p>
		<p class="context-description mt-2">
			Workers AI may add a short summary. The counts and charts still come from the database.
		</p>
	</div>

	<!-- Dashboard -->
	<TufteDashboard {data} {loading} {error} />

	<!-- Footer -->
	<div class="footer-section pt-6">
		<p class="footer-text">
			Charts: <span class="footer-highlight">@create-something/tufte</span> •
			Records: <span class="footer-highlight">Cloudflare D1</span> •
			Optional summary: <span class="footer-highlight">Workers AI</span>
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

	.context-card {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
	}

	.context-title {
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-caption);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.context-flow {
		color: var(--color-performance-fg-tertiary);
		font-size: var(--text-performance-caption);
	}

	.context-description {
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-caption);
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
</style>
