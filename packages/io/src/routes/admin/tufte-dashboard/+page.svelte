<script lang="ts">
	/**
	 * Tufte Dashboard Page
	 *
	 * AI-powered analytics dashboard demonstrating the hermeneutic loop:
	 * Raw D1 Data → AI Semantic Analysis → Tufte Visualization → Human Insight
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

	import { onMount } from 'svelte';
	import TufteDashboard from '$lib/components/TufteDashboard.svelte';

	let loading = true;
	let error: string | null = null;
	let data: any = null;
	let days = 30;

	async function loadDashboard() {
		loading = true;
		error = null;
		try {
			const response = await fetch(`/api/tufte/dashboard?days=${days}`);
			if (!response.ok) {
				throw new Error(`Failed to load: ${response.statusText}`);
			}
			data = await response.json();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load dashboard';
			console.error('Dashboard error:', err);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadDashboard();
	});

	// Reload when period changes
	$: if (days) {
		loadDashboard();
	}
</script>

<svelte:head>
	<title>Tufte Dashboard | CREATE SOMETHING</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-start justify-between">
		<div>
			<h1 class="page-title mb-2">Tufte Dashboard</h1>
			<p class="page-description max-w-xl">
				AI-powered analytics visualized through Edward Tufte's principles.
				Each component autonomously maximizes data-ink ratio and reveals patterns
				that conventional charts obscure.
			</p>
		</div>

		<div class="flex items-center gap-4">
			<!-- Period Selector -->
			<select
				bind:value={days}
				class="select-field px-4 py-2"
			>
				<option value={7}>Last 7 days</option>
				<option value={14}>Last 14 days</option>
				<option value={30}>Last 30 days</option>
				<option value={90}>Last 90 days</option>
			</select>

			<!-- Refresh Button -->
			<button
				on:click={loadDashboard}
				disabled={loading}
				class="btn-secondary px-4 py-2"
			>
				{loading ? 'Loading...' : 'Refresh'}
			</button>
		</div>
	</div>

	<!-- Hermeneutic Context -->
	<div class="context-card p-4">
		<h2 class="context-title mb-2">The Hermeneutic Loop</h2>
		<p class="context-flow font-mono">
			Raw Data (D1) → AI Analysis (Workers AI) → Tufte Visualization → Human Insight → Action
		</p>
		<p class="context-description mt-2">
			The AI understands metric semantics (e.g., "response_time" = lower is better) and the
			Tufte components autonomously enforce visualization best practices.
		</p>
	</div>

	<!-- Dashboard -->
	<TufteDashboard {data} {loading} {error} />

	<!-- Footer -->
	<div class="footer-section pt-6">
		<p class="footer-text">
			Powered by <span class="footer-highlight">@create-something/tufte</span> •
			Data from <span class="footer-highlight">Cloudflare D1</span> •
			AI by <span class="footer-highlight">Workers AI</span>
		</p>
	</div>
</div>

<style>
	.page-title {
		font-size: var(--text-h1);
		font-weight: 700;
	}

	.page-description {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	.select-field {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.select-field:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
	}

	.btn-secondary {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--color-bg-elevated);
		color: var(--color-fg-primary);
	}

	.btn-secondary:disabled {
		opacity: 0.5;
	}

	.context-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.context-title {
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.context-flow {
		color: var(--color-fg-tertiary);
		font-size: var(--text-caption);
	}

	.context-description {
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
	}

	.footer-section {
		border-top: 1px solid var(--color-border-default);
		text-align: center;
	}

	.footer-text {
		color: var(--color-fg-subtle);
		font-size: var(--text-caption);
	}

	.footer-highlight {
		color: var(--color-fg-secondary);
	}
</style>
