<script lang="ts">
	/**
	 * DailyGrid Component
	 *
	 * Agentic component that implements Tufte's "small multiples" principle:
	 * - Show multiple dimensions side-by-side for comparison
	 * - Consistent layout aids pattern recognition
	 * - Compact display maximizes data density
	 *
	 * Ink Framework Integration:
	 * - Uses Ink grid tokens (2→4→7 columns responsive)
	 * - Responsive cell padding via Ink tokens
	 * - Container query support for component-level responsiveness
	 *
	 * This component is agentic because it:
	 * - Automatically slices to last N days
	 * - Formats dates intelligently
	 * - Handles missing data gracefully
	 */

	import { formatNumber, formatDate } from '$lib/utils/formatters.js';
	import type { DataPoint } from '$lib/utils/sparkline.js';

	// Props
	export let data: DataPoint[];
	export let days: number = 7;

	// Agentic: automatically take last N days
	$: displayData = data.slice(-days);
</script>

<!--
	Tufte Principles Applied:
	1. Small multiples (consistent grid for comparison)
	2. High data density (7 days in compact grid)
	3. Minimal decoration (subtle backgrounds only)
	
	Ink Framework:
	- Responsive grid columns (2→4→7)
	- φ⁻¹ padding scaling for mobile
-->
<div class="daily-grid" style="--days: {days};">
	{#each displayData as day}
		<div class="day-cell">
			<!-- Day label (Tufte: minimal text) -->
			<div class="day-label">
				{formatDate(day.date, 'weekday')}
			</div>

			<!-- Count (Tufte: tabular numbers for alignment) -->
			<div class="day-count tabular-nums">
				{formatNumber(day.count)}
			</div>
		</div>
	{/each}
</div>

<style>
	.daily-grid {
		font-size: var(--text-caption);
		font-family: ui-monospace, monospace;
		/* Ink: responsive grid using CSS custom property */
		display: grid;
		gap: var(--ink-pad-cell, 0.25rem);
		/* Mobile: 2 columns (Tufte: maintain visibility of 4 items) */
		grid-template-columns: repeat(2, 1fr);
		/* Ink: container query support */
		container-type: inline-size;
	}

	/* Ink: Standard density - 4 columns */
	@media (min-width: 640px) {
		.daily-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	/* Ink: Expanded density - use full days count */
	@media (min-width: 768px) {
		.daily-grid {
			grid-template-columns: repeat(var(--days, 7), 1fr);
		}
	}

	/* Ink: Container query - adapt to container width */
	@container (min-width: 400px) {
		.daily-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	@container (min-width: 600px) {
		.daily-grid {
			grid-template-columns: repeat(var(--days, 7), 1fr);
		}
	}

	.day-cell {
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
		/* Ink: responsive cell padding */
		padding: var(--ink-pad-cell, 0.5rem);
		text-align: center;
	}

	.day-label {
		color: var(--color-fg-muted);
		font-size: 10px;
		margin-bottom: 0.25rem;
	}

	.day-count {
		color: var(--color-fg-secondary);
		font-weight: 600;
	}

	/* Ink: Compact density - tighter on mobile */
	@media (max-width: 639px) {
		.day-cell {
			padding: var(--space-xs, 0.25rem);
		}

		.day-label {
			margin-bottom: 0.125rem;
		}
	}
</style>
