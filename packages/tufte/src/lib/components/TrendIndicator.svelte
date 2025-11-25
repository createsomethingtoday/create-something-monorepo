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
	 * - (AI-enhanced) Understands metric semantics automatically
	 */

	import { formatNumber, formatCompact } from '$lib/utils/formatters.js';
	import { onMount } from 'svelte';

	// Props
	export let current: number;
	export let previous: number;
	export let format: 'number' | 'percentage' | 'compact' = 'percentage';
	export let showDirection: boolean = true;
	export let flatThreshold: number = 0.5; // Changes below this % are considered "flat"
	export let inverse: boolean | undefined = undefined; // For metrics where lower is better (e.g., response time, errors)

	// AI Enhancement props
	export let aiEnhanced: boolean = false; // Enable AI-powered semantic understanding
	export let metric: string | undefined = undefined; // Metric name for AI analysis
	export let label: string | undefined = undefined; // Metric label for AI analysis
	export let context: string | undefined = undefined; // Additional context for AI
	export let aiEndpoint: string = '/api/ai/analyze-metric'; // AI analysis endpoint

	let shouldInverse = false;
	let aiAnalysisComplete = false;

	// AI-powered semantic analysis
	async function analyzeMetricSemantics() {
		if (!aiEnhanced || (!metric && !label)) {
			aiAnalysisComplete = true;
			return;
		}

		// Check cache first
		const cacheKey = `metric:${metric || label}`;
		const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;

		if (cached) {
			try {
				const { lowerIsBetter } = JSON.parse(cached);
				shouldInverse = lowerIsBetter;
				aiAnalysisComplete = true;
				return;
			} catch (e) {
				// Invalid cache, continue to API call
			}
		}

		// Call AI API
		try {
			const response = await fetch(aiEndpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ metric, label, context })
			});

			if (!response.ok) throw new Error('AI analysis failed');

			const result = await response.json();

			if (result.confidence > 0.7) {
				shouldInverse = result.lowerIsBetter;

				// Cache high-confidence results
				if (typeof window !== 'undefined') {
					localStorage.setItem(cacheKey, JSON.stringify(result));
				}
			}
		} catch (error) {
			console.warn('AI metric analysis failed, using default behavior:', error);
		} finally {
			aiAnalysisComplete = true;
		}
	}

	onMount(() => {
		// Explicit inverse takes precedence
		if (inverse !== undefined) {
			shouldInverse = inverse;
			aiAnalysisComplete = true;
		} else if (aiEnhanced) {
			analyzeMetricSemantics();
		} else {
			aiAnalysisComplete = true;
		}
	});

	// Determine final inverse value
	$: finalInverse = inverse !== undefined ? inverse : shouldInverse;

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

	// Visual indicators (reactive to handle inverse mode)
	$: indicators = {
		up: {
			icon: '↑',
			color: finalInverse ? 'text-red-400' : 'text-green-400',
			label: 'increase'
		},
		down: {
			icon: '↓',
			color: finalInverse ? 'text-green-400' : 'text-red-400',
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
