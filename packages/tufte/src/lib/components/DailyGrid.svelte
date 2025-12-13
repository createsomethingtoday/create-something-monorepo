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
<div class="daily-grid grid gap-1" style="grid-template-columns: repeat({days}, 1fr);">
	{#each displayData as day}
		<div class="day-cell text-center p-2">
			<!-- Day label (Tufte: minimal text) -->
			<div class="day-label mb-1">
				{formatDate(day.date, 'weekday')}
			</div>

			<!-- Count (Tufte: tabular numbers for alignment) -->
			<div class="day-count tabular-nums">
				{formatNumber(day.count)}
			</div>
		</div>
	{/each}
</div>

<style>
	.daily-grid {
		font-size: var(--text-caption);
		font-family: ui-monospace, monospace;
	}

	.day-cell {
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
	}

	.day-label {
		color: var(--color-fg-muted);
		font-size: 10px;
	}

	.day-count {
		color: var(--color-fg-secondary);
		font-weight: 600;
	}
</style>
