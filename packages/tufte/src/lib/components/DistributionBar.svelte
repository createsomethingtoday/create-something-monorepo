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

	// Canon data visualization palette
	const defaultColors = [
		'var(--color-data-1)', // Blue
		'var(--color-data-2)', // Green
		'var(--color-data-3)', // Purple
		'var(--color-data-4)' // Amber
	];
</script>

<!--
	Tufte Principles Applied:
	1. Show data variation (proportions visible at a glance)
	2. Maximize data-ink ratio (minimal decoration)
	3. Integrate text and data (labels within segments when possible)
-->
<div class="distribution-bar space-y-2">
	<!-- Distribution bar -->
	<div class="bar flex {height} overflow-hidden">
		{#each segmentsWithPercentages as segment, i}
			{#if segment.width > 0}
				<div
					class="segment flex items-center justify-center"
					style="width: {segment.width}%; background-color: {segment.color ||
						defaultColors[i % defaultColors.length]};"
					title="{segment.label}: {formatNumber(segment.count)} ({segment.percentage}%)"
				>
					<!-- Only show label if segment is wide enough (Tufte: clarity over completeness) -->
					{#if segment.width >= minLabelWidth}
						<span class="segment-label px-2 truncate">
							{segment.percentage}%
						</span>
					{/if}
				</div>
			{/if}
		{/each}
	</div>

	<!-- Legend below (Tufte: integrate supporting information) -->
	{#if showLabels}
		<div class="legend flex flex-wrap gap-x-6 gap-y-2">
			{#each segmentsWithPercentages as segment, i}
				<div class="legend-item flex items-center gap-2">
					<div
						class="legend-indicator w-4 h-4"
						style="background-color: {segment.color ||
							defaultColors[i % defaultColors.length]};"
					/>
					<span class="legend-label">{segment.label}</span>
					<span class="legend-value">
						{formatNumber(segment.count)}
						{#if showPercentages}
							<span class="legend-percentage">({segment.percentage}%)</span>
						{/if}
					</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.bar {
		border-radius: var(--radius-md);
		background: var(--color-bg-surface);
	}

	.segment {
		font-size: var(--text-caption);
		font-weight: 500;
		transition: opacity var(--duration-standard) var(--ease-standard);
	}

	.segment:hover {
		opacity: 0.8;
	}

	.segment-label {
		color: var(--color-fg-primary);
	}

	.legend {
		font-size: var(--text-body-sm);
	}

	.legend-indicator {
		border-radius: var(--radius-sm);
	}

	.legend-label {
		color: var(--color-fg-primary);
		font-weight: 500;
	}

	.legend-value {
		color: var(--color-fg-tertiary);
		font-family: ui-monospace, monospace;
	}

	.legend-percentage {
		color: var(--color-fg-muted);
	}
</style>
