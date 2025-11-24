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

	// Default colors for up to 6 series (can be overridden)
	const defaultColors = [
		'rgb(59, 130, 246)', // blue
		'rgb(16, 185, 129)', // green
		'rgb(168, 85, 247)', // purple
		'rgb(251, 146, 60)', // orange
		'rgb(236, 72, 153)', // pink
		'rgb(234, 179, 8)' // yellow
	];
</script>

<!--
	Tufte Principles Applied:
	1. Show data variation (multiple trends compared directly)
	2. Maximize data-ink ratio (no decoration, just lines)
	3. Integrate text and data (inline legend)
	4. Small multiples concept (multiple series, same scale)
-->
<div class="space-y-2">
	{#if showLegend}
		<!-- Legend (Tufte: integrate with visualization) -->
		<div class="flex flex-wrap gap-3 text-xs">
			{#each paths as series, i}
				<div class="flex items-center gap-1.5">
					<div
						class="w-3 h-0.5 rounded"
						style="background-color: {series.color === 'white'
							? defaultColors[i % defaultColors.length]
							: series.color}; opacity: {series.opacity}"
					/>
					<span class="text-white/60">{series.label}</span>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Comparative visualization -->
	<svg
		viewBox="0 0 {width} {height}"
		class="w-full h-full"
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
					stroke-opacity={s.opacity}
					stroke-width="1.5"
					vector-effect="non-scaling-stroke"
				/>
			{/if}
		{/each}
	</svg>
</div>
