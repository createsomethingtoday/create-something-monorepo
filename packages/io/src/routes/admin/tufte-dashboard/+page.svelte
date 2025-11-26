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
			<h1 class="text-3xl font-bold mb-2">Tufte Dashboard</h1>
			<p class="text-white/60 text-sm max-w-xl">
				AI-powered analytics visualized through Edward Tufte's principles.
				Each component autonomously maximizes data-ink ratio and reveals patterns
				that conventional charts obscure.
			</p>
		</div>

		<div class="flex items-center gap-4">
			<!-- Period Selector -->
			<select
				bind:value={days}
				class="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-white/30"
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
				class="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/60 text-sm hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
			>
				{loading ? 'Loading...' : 'Refresh'}
			</button>
		</div>
	</div>

	<!-- Hermeneutic Context -->
	<div class="bg-white/5 border border-white/10 rounded-lg p-4">
		<h2 class="text-white/40 text-xs uppercase tracking-wider mb-2">The Hermeneutic Loop</h2>
		<p class="text-white/60 text-xs font-mono">
			Raw Data (D1) → AI Analysis (Workers AI) → Tufte Visualization → Human Insight → Action
		</p>
		<p class="text-white/40 text-xs mt-2">
			The AI understands metric semantics (e.g., "response_time" = lower is better) and the
			Tufte components autonomously enforce visualization best practices.
		</p>
	</div>

	<!-- Dashboard -->
	<TufteDashboard {data} {loading} {error} />

	<!-- Footer -->
	<div class="border-t border-white/10 pt-6 text-center">
		<p class="text-white/30 text-xs">
			Powered by <span class="text-white/50">@create-something/tufte</span> •
			Data from <span class="text-white/50">Cloudflare D1</span> •
			AI by <span class="text-white/50">Workers AI</span>
		</p>
	</div>
</div>
