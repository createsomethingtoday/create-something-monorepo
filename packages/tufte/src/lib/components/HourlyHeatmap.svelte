<script lang="ts">
	/**
	 * HourlyHeatmap Component
	 *
	 * Agentic component implementing Tufte's "small multiples" principle.
	 * Shows patterns across time dimensions (hours × days).
	 *
	 * This component is agentic because it:
	 * - Automatically scales intensity based on data range
	 * - Structures data into hour × day grid
	 * - Handles missing data gracefully
	 * - Reveals temporal patterns at a glance
	 */

	import { formatDate } from '$lib/utils/formatters.js';

	interface HourlyDataPoint {
		date: string; // ISO date string
		hour: number; // 0-23
		count: number;
	}

	// Props
	export let data: HourlyDataPoint[];
	export let days: number = 7;
	export let showLabels: boolean = true;

	// Agentic: organize data into grid structure
	$: uniqueDates = [...new Set(data.map((d) => d.date))].slice(-days);
	$: maxCount = Math.max(...data.map((d) => d.count), 1);

	// Agentic: create hour × day matrix
	$: heatmapData = uniqueDates.map((date) => ({
		date,
		hours: Array.from({ length: 24 }, (_, hour) => {
			const point = data.find((d) => d.date === date && d.hour === hour);
			return {
				hour,
				count: point?.count || 0,
				intensity: point ? (point.count / maxCount) * 100 : 0
			};
		})
	}));

	// Get opacity based on intensity (Tufte: use subtle variations)
	function getOpacity(intensity: number): number {
		if (intensity === 0) return 0.05;
		// Scale from 0.1 to 0.8
		return 0.1 + (intensity / 100) * 0.7;
	}
</script>

<!--
	Tufte Principles Applied:
	1. Small multiples (hour × day grid with consistent scale)
	2. High data density (24 hours × N days in compact space)
	3. Maximize data-ink ratio (color intensity is the only decoration)
	4. Reveal patterns (temporal activity becomes obvious)
-->
<div class="heatmap space-y-2">
	{#if showLabels}
		<!-- Hour labels (top) -->
		<div class="hour-labels flex gap-0.5 ml-12">
			{#each Array.from({ length: 24 }, (_, i) => i) as hour}
				{#if hour % 6 === 0}
					<div class="flex-1 text-center">{hour}</div>
				{:else}
					<div class="flex-1" />
				{/if}
			{/each}
		</div>
	{/if}

	<!-- Heatmap grid -->
	<div class="space-y-0.5">
		{#each heatmapData as day}
			<div class="flex gap-0.5 items-center">
				{#if showLabels}
					<!-- Day label (left) -->
					<div class="day-label w-10 text-right mr-2">
						{formatDate(day.date, 'weekday')}
					</div>
				{/if}

				<!-- Hour cells -->
				{#each day.hours as hourData}
					<div
						class="cell flex-1 aspect-square"
						style="opacity: {getOpacity(hourData.intensity)}"
						title="{formatDate(day.date, 'short')} {hourData.hour}:00 - {hourData.count} views"
					/>
				{/each}
			</div>
		{/each}
	</div>

	{#if showLabels}
		<!-- Legend -->
		<div class="legend flex items-center gap-2 mt-3">
			<span>Less</span>
			<div class="flex gap-0.5">
				{#each [10, 30, 50, 70, 90] as intensity}
					<div
						class="legend-cell w-4 h-4"
						style="opacity: {getOpacity(intensity)}"
					/>
				{/each}
			</div>
			<span>More</span>
		</div>
	{/if}
</div>

<style>
	.hour-labels,
	.day-label {
		font-size: 10px;
		font-family: ui-monospace, monospace;
		color: var(--color-fg-muted);
	}

	.cell {
		background: var(--color-fg-primary);
		border-radius: var(--radius-sm);
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.cell:hover {
		box-shadow: 0 0 0 1px var(--color-border-strong);
	}

	.legend {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.legend-cell {
		background: var(--color-fg-primary);
		border-radius: var(--radius-sm);
	}
</style>
