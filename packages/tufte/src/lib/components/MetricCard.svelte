<script lang="ts">
	/**
	 * MetricCard Component
	 *
	 * Agentic component that implements Tufte's principle #5:
	 * "Integrate text, graphics, and data"
	 *
	 * This component is agentic because it:
	 * - Automatically combines label, value, trend, and context
	 * - Enforces proper typography (tabular numbers)
	 * - Applies CREATE SOMETHING design tokens
	 * - Handles optional elements gracefully
	 */

	import Sparkline from './Sparkline.svelte';
	import { formatNumber } from '$lib/utils/formatters.js';
	import type { DataPoint } from '$lib/utils/sparkline.js';

	// Props
	export let label: string;
	export let value: number;
	export let trend: DataPoint[] | undefined = undefined;
	export let context: string | undefined = undefined;
	export let percentage: number | undefined = undefined;

	// Agentic: component decides when to show trend based on data availability
	$: showTrend = trend && trend.length > 0;
	$: showPercentage = percentage !== undefined;
	$: showContext = context !== undefined;
</script>

<!--
	Tufte Principles Applied:
	1. Integrate text, graphics, and data (label + value + sparkline together)
	2. Maximize data-ink ratio (minimal decoration, subtle borders)
	3. Show data variation (inline sparkline shows trend)
-->
<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
	<!-- Header with label + optional inline sparkline or percentage -->
	<div class="flex items-baseline justify-between mb-2">
		<div class="text-sm text-white/60">{label}</div>

		{#if showTrend && trend}
			<!-- Inline sparkline (Tufte: word-sized graphics) -->
			<div class="w-12 h-4">
				<Sparkline data={trend} width={40} height={12} showFill={false} />
			</div>
		{/if}

		{#if showPercentage && !showTrend}
			<!-- Alternative: show percentage if no trend -->
			<div class="text-xs text-white/40 font-mono">{percentage}%</div>
		{/if}
	</div>

	<!-- Primary metric (Tufte: tabular numbers for proper alignment) -->
	<div class="text-3xl font-bold tabular-nums">{formatNumber(value)}</div>

	<!-- Context (Tufte: integrate supporting information) -->
	{#if showContext}
		<div class="text-xs text-white/40 mt-1 font-mono">{context}</div>
	{/if}
</div>
