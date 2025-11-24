<script lang="ts">
	/**
	 * DistributionBar Component
	 *
	 * Agentic component that shows proportional distribution visually.
	 * Implements Tufte's principle: "Show data variation, not design variation"
	 *
	 * This component is agentic because it:
	 * - Automatically calculates proportions
	 * - Chooses colors intelligently
	 * - Handles labeling based on segment size
	 * - Makes distribution patterns obvious at a glance
	 */

	import { formatNumber, getPercentage } from '$lib/utils/formatters.js';

	interface Segment {
		label: string;
		count: number;
		color?: string;
	}

	// Props
	export let segments: Segment[];
	export let showLabels: boolean = true;
	export let showPercentages: boolean = true;
	export let height: string = 'h-8';
	export let minLabelWidth: number = 8; // Minimum % width to show label

	// Agentic: calculate total and percentages
	$: total = segments.reduce((sum, s) => sum + s.count, 0);
	$: segmentsWithPercentages = segments.map((s) => ({
		...s,
		percentage: getPercentage(s.count, total),
		width: total > 0 ? (s.count / total) * 100 : 0
	}));

	// Default colors - brighter/more saturated for better visibility
	const defaultColors = [
		'rgb(96, 165, 250)', // bright blue
		'rgb(34, 197, 94)', // bright green
		'rgb(192, 132, 252)', // bright purple
		'rgb(251, 191, 36)' // bright yellow/orange
	];
</script>

<!--
	Tufte Principles Applied:
	1. Show data variation (proportions visible at a glance)
	2. Maximize data-ink ratio (minimal decoration)
	3. Integrate text and data (labels within segments when possible)
-->
<div class="space-y-2">
	<!-- Distribution bar -->
	<div class="flex {height} rounded overflow-hidden bg-white/5">
		{#each segmentsWithPercentages as segment, i}
			{#if segment.width > 0}
				<div
					class="flex items-center justify-center text-xs font-medium transition-all hover:opacity-80"
					style="width: {segment.width}%; background-color: {segment.color ||
						defaultColors[i % defaultColors.length]};"
					title="{segment.label}: {formatNumber(segment.count)} ({segment.percentage}%)"
				>
					<!-- Only show label if segment is wide enough (Tufte: clarity over completeness) -->
					{#if segment.width >= minLabelWidth}
						<span class="text-white px-2 truncate">
							{segment.percentage}%
						</span>
					{/if}
				</div>
			{/if}
		{/each}
	</div>

	<!-- Legend below (Tufte: integrate supporting information) -->
	{#if showLabels}
		<div class="flex flex-wrap gap-x-6 gap-y-2 text-sm">
			{#each segmentsWithPercentages as segment, i}
				<div class="flex items-center gap-2">
					<div
						class="w-4 h-4 rounded"
						style="background-color: {segment.color ||
							defaultColors[i % defaultColors.length]};"
					/>
					<span class="text-white/90 font-medium">{segment.label}</span>
					<span class="text-white/60 font-mono">
						{formatNumber(segment.count)}
						{#if showPercentages}
							<span class="text-white/50">({segment.percentage}%)</span>
						{/if}
					</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
