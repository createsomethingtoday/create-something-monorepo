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
	$: paths = series.map((s) => ({
		...s,
		path: generateSparklinePathWithScale(s.data, width, height, min, range),
		color: s.color || 'white',
		opacity: s.opacity || 0.6
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

	// Default colors - brighter/more saturated for better visibility
	const defaultColors = [
		'rgb(96, 165, 250)', // bright blue
		'rgb(34, 197, 94)', // bright green
		'rgb(192, 132, 252)', // bright purple
		'rgb(251, 191, 36)', // bright yellow/orange
		'rgb(244, 114, 182)', // bright pink
		'rgb(250, 204, 21)' // bright yellow
	];
</script>

<!--
	Tufte Principles Applied:
	1. Show data variation (multiple trends compared directly)
	2. Maximize data-ink ratio (no decoration, just lines)
	3. Integrate text and data (inline legend)
	4. Small multiples concept (multiple series, same scale)
-->
<div class="space-y-4">
	{#if showLegend}
		<!-- Legend (Tufte: integrate with visualization) -->
		<div class="flex flex-wrap gap-4 text-sm">
			{#each paths as series, i}
				<div class="flex items-center gap-2">
					<div
						class="w-4 h-1 rounded"
						style="background-color: {series.color === 'white'
							? defaultColors[i % defaultColors.length]
							: series.color};"
					/>
					<span class="text-white/80 font-medium">{series.label}</span>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Comparative visualization -->
	<svg
		viewBox="0 0 {width} {height}"
		class="w-full h-32"
		preserveAspectRatio="none"
		aria-label="Comparative trend visualization with {series.length} data series"
	>
		<!-- Reference line at midpoint -->
		<line
			x1="0"
			y1={height / 2}
			x2={width}
			y2={height / 2}
			stroke="white"
			stroke-opacity="0.05"
			stroke-width="0.5"
		/>

		<!-- All data series (layered for comparison) -->
		{#each paths as s, i}
			{#if s.path}
				<path
					d={s.path}
					fill="none"
					stroke={s.color === 'white' ? defaultColors[i % defaultColors.length] : s.color}
					stroke-opacity={s.opacity || 0.9}
					stroke-width="2.5"
					vector-effect="non-scaling-stroke"
				/>
			{/if}
		{/each}
	</svg>
</div>
