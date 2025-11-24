<script lang="ts">
	/**
	 * DailyGrid Component
	 *
	 * Agentic component that implements Tufte's "small multiples" principle:
	 * - Show multiple dimensions side-by-side for comparison
	 * - Consistent layout aids pattern recognition
	 * - Compact display maximizes data density
	 *
	 * This component is agentic because it:
	 * - Automatically slices to last N days
	 * - Formats dates intelligently
	 * - Handles missing data gracefully
	 */

	import { formatNumber, formatDate } from '$lib/utils/formatters.js';
	import type { DataPoint } from '$lib/utils/sparkline.js';

	// Props
	export let data: DataPoint[];
	export let days: number = 7;

	// Agentic: automatically take last N days
	$: displayData = data.slice(-days);
</script>

<!--
	Tufte Principles Applied:
	1. Small multiples (consistent grid for comparison)
	2. High data density (7 days in compact grid)
	3. Minimal decoration (subtle backgrounds only)
-->
<div class="grid gap-1 text-xs font-mono" style="grid-template-columns: repeat({days}, 1fr);">
	{#each displayData as day}
		<div class="text-center p-2 bg-white/5 rounded">
			<!-- Day label (Tufte: minimal text) -->
			<div class="text-white/40 text-[10px] mb-1">
				{formatDate(day.date, 'weekday')}
			</div>

			<!-- Count (Tufte: tabular numbers for alignment) -->
			<div class="text-white/80 font-semibold tabular-nums">
				{formatNumber(day.count)}
			</div>
		</div>
	{/each}
</div>
