<script lang="ts">
	/**
	 * TrendIndicator Component
	 *
	 * Agentic component that shows direction and magnitude of change.
	 * Implements Tufte's principle: "Show data variation, not design variation"
	 *
	 * This component is agentic because it:
	 * - Automatically calculates change (absolute and percentage)
	 * - Determines direction (up/down/flat)
	 * - Chooses appropriate visual indicator
	 * - Formats numbers contextually
	 */

	import { formatNumber, formatCompact } from '$lib/utils/formatters.js';

	// Props
	export let current: number;
	export let previous: number;
	export let format: 'number' | 'percentage' | 'compact' = 'percentage';
	export let showDirection: boolean = true;
	export let flatThreshold: number = 0.5; // Changes below this % are considered "flat"

	// Agentic: calculate change automatically
	$: absoluteChange = current - previous;
	$: percentageChange =
		previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;
	$: direction =
		Math.abs(percentageChange) < flatThreshold
			? 'flat'
			: percentageChange > 0
				? 'up'
				: 'down';

	// Agentic: format based on context
	$: displayValue =
		format === 'number'
			? formatNumber(Math.abs(absoluteChange))
			: format === 'compact'
				? formatCompact(Math.abs(absoluteChange))
				: `${Math.abs(percentageChange)}%`;

	// Visual indicators
	const indicators = {
		up: {
			icon: '↑',
			color: 'text-green-400',
			label: 'increase'
		},
		down: {
			icon: '↓',
			color: 'text-red-400',
			label: 'decrease'
		},
		flat: {
			icon: '→',
			color: 'text-white/40',
			label: 'no change'
		}
	};

	$: indicator = indicators[direction];
</script>

<!--
	Tufte Principles Applied:
	1. Show data variation (change is the focus)
	2. Maximize data-ink ratio (minimal decoration)
	3. Integrate text and data (direction + magnitude together)
-->
<div
	class="inline-flex items-center gap-1 text-sm font-medium"
	title="{indicator.label}: {displayValue} from {formatNumber(previous)} to {formatNumber(current)}"
>
	{#if showDirection}
		<span class="{indicator.color} text-base" aria-label={indicator.label}>
			{indicator.icon}
		</span>
	{/if}
	<span class={indicator.color}>
		{displayValue}
	</span>
</div>
