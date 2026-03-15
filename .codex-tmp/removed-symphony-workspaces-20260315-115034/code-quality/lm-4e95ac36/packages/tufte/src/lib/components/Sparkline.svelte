<script lang="ts">
	/**
	 * Sparkline Component
	 *
	 * Agentic visualization component that embodies Tufte's principles:
	 * - Maximizes data-ink ratio (minimal decoration)
	 * - Shows variation compactly (word-sized graphics)
	 * - Integrates with text (appears inline with numbers)
	 *
	 * The component is "agentic" because it:
	 * - Automatically handles scaling
	 * - Enforces Tufte principles by default
	 * - Makes correct visualization decisions autonomously
	 */

	import { generateSparklinePath, generateFillPath } from '$lib/utils/sparkline.js';
	import type { DataPoint } from '$lib/utils/sparkline.js';

	// Props (minimal - component handles the rest agentically)
	export let data: DataPoint[];
	export let width: number = 100;
	export let height: number = 30;
	export let showFill: boolean = true;
	export let showReferenceLine: boolean = false;

	// Agentic behavior: component generates paths automatically
	$: linePath = generateSparklinePath(data, width, height);
	$: fillPath = showFill ? generateFillPath(linePath, width, height) : '';

	// Design tokens (CREATE SOMETHING Canon palette)
	// Using --color-data-1 (blue) as the default data visualization color
	const stroke = {
		color: 'var(--color-data-1)',
		opacity: 0.8,
		width: 1.5
	};

	const fill = {
		color: 'var(--color-data-1)',
		opacity: 0.15
	};

	const referenceLine = {
		color: 'var(--color-fg-subtle)',
		opacity: 1,
		width: 0.5
	};
</script>

<!--
	Tufte Principle: Maximize data-ink ratio
	- No axes, no grid, no labels - just the data
	- Minimal decoration (subtle fill for context only)
	- Vector-effect prevents stroke scaling
-->
<svg
	viewBox="0 0 {width} {height}"
	class="w-full h-full"
	preserveAspectRatio="none"
	aria-label="Trend visualization showing {data.length} data points"
>
	{#if showReferenceLine}
		<!-- Subtle reference line (Tufte: minimal chartjunk) -->
		<line
			x1="0"
			y1={height / 2}
			x2={width}
			y2={height / 2}
			stroke={referenceLine.color}
			stroke-opacity={referenceLine.opacity}
			stroke-width={referenceLine.width}
		/>
	{/if}

	{#if showFill && fillPath}
		<!-- Subtle fill (Tufte: context without distraction) -->
		<path d={fillPath} fill={fill.color} fill-opacity={fill.opacity} />
	{/if}

	{#if linePath}
		<!-- Data line (Tufte: high data-ink ratio) -->
		<path
			d={linePath}
			fill="none"
			stroke={stroke.color}
			stroke-opacity={stroke.opacity}
			stroke-width={stroke.width}
			vector-effect="non-scaling-stroke"
		/>
	{/if}
</svg>
