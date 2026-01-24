<script lang="ts">
	/**
	 * ComparativeSparklines Component
	 *
	 * Agentic component that overlays multiple data series for comparison.
	 * Implements Tufte's principle: "Show data variation, not design variation"
	 *
	 * This component is agentic because it:
	 * - Automatically scales all series to the same range for comparison
	 * - Chooses appropriate colors/opacities for visual hierarchy
	 * - Handles legend positioning intelligently
	 * - Reveals relative performance at a glance
	 */

	import { generateSparklinePath } from '$lib/utils/sparkline.js';
	import type { DataPoint } from '$lib/utils/sparkline.js';

	interface Series {
		label: string;
		data: DataPoint[];
		color?: string;
		opacity?: number;
	}

	// Props
	export let series: Series[];
	export let width: number = 100;
	export let height: number = 30;
	export let showLegend: boolean = true;

	// Agentic: automatically scale all series to same range for comparison
	$: allValues = series.flatMap((s) => s.data.map((d) => d.count));
	$: max = Math.max(...allValues, 1);
	$: min = Math.min(...allValues, 0);
	$: range = max - min || 1;

	// Agentic: generate paths for all series with shared scale
	$: paths = series.map((s, i) => ({
		...s,
		path: generateSparklinePathWithScale(s.data, width, height, min, range),
		color: s.color || defaultColors[i % defaultColors.length],
		opacity: s.opacity || 0.9
	}));

	function generateSparklinePathWithScale(
		data: DataPoint[],
		w: number,
		h: number,
		minVal: number,
		rangeVal: number
	): string {
		if (data.length === 0) return '';

		const values = data.map((d) => d.count);
		const points = values.map((value, i) => {
			const x = (i / (values.length - 1 || 1)) * w;
			const y = h - ((value - minVal) / rangeVal) * h;
			return `${x},${y}`;
		});

		return `M ${points.join(' L ')}`;
	}

	// Canon data visualization palette
	const defaultColors = [
		'var(--color-data-1)', // Blue
		'var(--color-data-2)', // Green
		'var(--color-data-3)', // Purple
		'var(--color-data-4)', // Amber
		'var(--color-data-5)', // Pink
		'var(--color-data-6)' // Yellow
	];
</script>

<!--
	Tufte Principles Applied:
	1. Show data variation (multiple trends compared directly)
	2. Maximize data-ink ratio (no decoration, just lines)
	3. Integrate text and data (inline legend)
	4. Small multiples concept (multiple series, same scale)
-->
<div class="comparative-sparklines space-y-4">
	{#if showLegend}
		<!-- Legend (Tufte: integrate with visualization) -->
		<div class="legend flex flex-wrap gap-4">
			{#each paths as series, i}
				<div class="legend-item flex items-center gap-2">
					<div
						class="legend-indicator w-4 h-1"
						style="background-color: {series.color};"
					/>
					<span class="legend-label">{series.label}</span>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Comparative visualization -->
	<svg
		viewBox="0 0 {width} {height}"
		class="chart w-full h-32"
		preserveAspectRatio="none"
		aria-label="Comparative trend visualization with {series.length} data series"
	>
		<!-- Reference line at midpoint -->
		<line
			x1="0"
			y1={height / 2}
			x2={width}
			y2={height / 2}
			stroke="var(--color-fg-subtle)"
			stroke-opacity="1"
			stroke-width="0.5"
		/>

		<!-- All data series (layered for comparison) -->
		{#each paths as s, i}
			{#if s.path}
				<path
					d={s.path}
					fill="none"
					stroke={s.color}
					stroke-opacity={s.opacity}
					stroke-width="2.5"
					vector-effect="non-scaling-stroke"
				/>
			{/if}
		{/each}
	</svg>
</div>

<style>
	.comparative-sparklines {
		/* Ink: container query support */
		container-type: inline-size;
	}

	.legend {
		font-size: var(--text-body-sm);
	}

	.legend-indicator {
		border-radius: var(--radius-sm);
	}

	.legend-label {
		color: var(--color-fg-secondary);
		font-weight: 500;
	}

	.chart {
		/* Ink: responsive chart height */
		height: var(--ink-sparkline-height, 8rem);
	}

	/* Ink: Compact density - stack legend below on mobile */
	@media (max-width: 639px) {
		.legend {
			flex-direction: column;
			gap: var(--space-xs);
		}

		.chart {
			height: 6rem; /* Shorter on mobile */
		}
	}

	/* Ink: Container query - adapt legend in narrow containers */
	@container (max-width: 300px) {
		.legend {
			flex-direction: column;
			gap: var(--space-xs);
		}

		.legend-item {
			font-size: var(--text-caption);
		}
	}
</style>
