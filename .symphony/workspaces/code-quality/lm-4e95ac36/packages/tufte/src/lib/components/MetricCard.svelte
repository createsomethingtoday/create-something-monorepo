<script lang="ts">
	/**
	 * MetricCard Component
	 *
	 * Agentic component that implements Tufte's principle #5:
	 * "Integrate text, graphics, and data"
	 *
	 * Ink Framework Integration:
	 * - Uses Ink padding tokens (φ⁻¹ scaling for mobile)
	 * - Fluid typography using clamp() for value display
	 * - Container query support for component-level responsiveness
	 * - Responsive sparkline sizes via Ink tokens
	 *
	 * This component is agentic because it:
	 * - Automatically combines label, value, trend, and context
	 * - Enforces proper typography (tabular numbers)
	 * - Applies CREATE SOMETHING design tokens
	 * - Handles optional elements gracefully
	 */

	import Sparkline from './Sparkline.svelte';
	import { formatNumber } from '$lib/utils/formatters.js';
	import type { DataPoint } from '$lib/utils/sparkline.js';

	// Props
	export let label: string;
	export let value: number;
	export let trend: DataPoint[] | undefined = undefined;
	export let context: string | undefined = undefined;
	export let percentage: number | undefined = undefined;

	// Agentic: component decides when to show trend based on data availability
	$: showTrend = trend && trend.length > 0;
	$: showPercentage = percentage !== undefined;
	$: showContext = context !== undefined;
</script>

<!--
	Tufte Principles Applied:
	1. Integrate text, graphics, and data (label + value + sparkline together)
	2. Maximize data-ink ratio (minimal decoration, subtle borders)
	3. Show data variation (inline sparkline shows trend)
	
	Ink Framework:
	- Responsive padding via CSS custom properties
	- Fluid typography for value (clamp)
	- Container query support
-->
<div class="metric-card">
	<!-- Header with label + optional inline sparkline or percentage -->
	<div class="header">
		<div class="label">{label}</div>

		{#if showTrend && trend}
			<!-- Inline sparkline (Tufte: word-sized graphics, Ink: responsive size) -->
			<div class="sparkline-container">
				<Sparkline data={trend} width={40} height={12} showFill={false} />
			</div>
		{/if}

		{#if showPercentage && !showTrend}
			<!-- Alternative: show percentage if no trend -->
			<div class="percentage">{percentage}%</div>
		{/if}
	</div>

	<!-- Primary metric (Tufte: tabular numbers, Ink: fluid typography) -->
	<div class="value tabular-nums">{formatNumber(value)}</div>

	<!-- Context (Tufte: integrate supporting information) -->
	{#if showContext}
		<div class="context">{context}</div>
	{/if}
</div>

<style>
	.metric-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		/* Ink: responsive padding (φ⁻¹ scaling for mobile) */
		padding: var(--ink-pad-component, var(--space-sm));
		/* Ink: container query support */
		container-type: inline-size;
	}

	.header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.sparkline-container {
		/* Ink: responsive sparkline size */
		width: var(--ink-sparkline-width, 40px);
		height: var(--ink-sparkline-height, 12px);
	}

	.percentage {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-family: ui-monospace, monospace;
	}

	.value {
		/* Ink: fluid typography (Tufte for mobile, generous for desktop) */
		font-size: clamp(1.25rem, 4vw, 1.875rem);
		font-weight: 700;
	}

	.context {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-family: ui-monospace, monospace;
		margin-top: 0.25rem;
	}

	/* Ink: Compact density - tighter on mobile */
	@media (max-width: 639px) {
		.metric-card {
			padding: var(--space-xs);
		}

		.header {
			margin-bottom: 0.25rem;
		}

		.context {
			margin-top: 0.125rem;
		}
	}

	/* Ink: Container query - compact in narrow containers */
	@container (max-width: 200px) {
		.metric-card {
			padding: var(--space-xs);
		}

		.value {
			font-size: 1.25rem;
		}

		.sparkline-container {
			display: none; /* Hide sparkline in very narrow containers */
		}
	}
</style>
