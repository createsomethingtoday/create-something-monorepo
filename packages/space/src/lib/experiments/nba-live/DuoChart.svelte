<script lang="ts">
	/**
	 * DuoChart Component
	 *
	 * Horizontal bar chart showing duo PPP compared to league average.
	 * Uses inline SVG for simplicity (LayerCake would be overkill here).
	 */

	import type { DuoStats } from '$lib/nba/types';
	import { formatPPP, formatDelta } from '$lib/nba/calculations';

	interface Props {
		duos: DuoStats[];
		title: string;
		teamAbbr?: string;
	}

	let { duos, title, teamAbbr }: Props = $props();

	// Chart dimensions
	const chartWidth = 450; // Increased from 400 to prevent value overlap
	let chartHeight = $derived(duos.length * 60 + 40); // 60px per bar + padding
	const barHeight = 40;
	const labelWidth = 140; // Increased from 120 to accommodate longer names
	const maxPPP = 2.2; // Max scale for PPP (handles high-performing duos at 2.0+)
	const leagueAvgPPP = 1.12;
	const rightMargin = 70; // Space for PPP value and delta

	// Scale PPP to pixels
	function scalePPP(ppp: number): number {
		return ((ppp / maxPPP) * (chartWidth - labelWidth - rightMargin));
	}

	// Get bar color based on performance vs league average
	function getBarColor(ppp: number): string {
		if (ppp >= leagueAvgPPP + 0.2) return 'var(--color-performance-success)';
		if (ppp >= leagueAvgPPP) return 'var(--color-performance-data-1)';
		if (ppp >= leagueAvgPPP - 0.1) return 'var(--color-performance-warning)';
		return 'var(--color-performance-error)';
	}

	// Get duo display name
	function getDuoName(duo: DuoStats): string {
		const p1 = duo.duo.player1Name.split(' ').pop() || '';
		const p2 = duo.duo.player2Name.split(' ').pop() || '';
		return `${p1}/${p2}`;
	}
</script>

<div class="duo-chart">
	<h3 class="chart-title">{title}</h3>

	{#if duos.length === 0}
		<p class="empty-message">No duo data available</p>
	{:else}
		<svg
			viewBox="0 0 {chartWidth} {chartHeight}"
			class="chart-svg"
			role="img"
			aria-label="Duo efficiency chart for {teamAbbr || title}"
		>
			<!-- League average reference line -->
			<line
				x1={labelWidth + scalePPP(leagueAvgPPP)}
				y1="20"
				x2={labelWidth + scalePPP(leagueAvgPPP)}
				y2={chartHeight - 10}
				stroke="var(--color-performance-fg-muted)"
				stroke-width="1"
				stroke-dasharray="4,4"
			/>
			<text
				x={labelWidth + scalePPP(leagueAvgPPP)}
				y="14"
				text-anchor="middle"
				class="chart-label-small"
			>
				League Avg ({formatPPP(leagueAvgPPP)})
			</text>

			{#each duos as duo, i}
				{@const y = 30 + i * 60}
				{@const maxBarWidth = chartWidth - labelWidth - rightMargin}
				{@const barWidth = Math.min(scalePPP(duo.pointsPerPossession), maxBarWidth)}
				{@const duoName = getDuoName(duo)}

				<!-- Duo name label -->
				<text
					x="5"
					y={y + barHeight / 2 + 4}
					class="chart-label"
					textLength={duoName.length > 16 ? labelWidth - 10 : undefined}
					lengthAdjust={duoName.length > 16 ? 'spacingAndGlyphs' : undefined}
				>
					<title>{duo.duo.player1Name} / {duo.duo.player2Name}</title>
					{duoName}
				</text>

				<!-- Bar background -->
				<rect
					x={labelWidth}
					y={y}
					width={chartWidth - labelWidth - rightMargin}
					height={barHeight}
					fill="var(--color-performance-bg-surface)"
					rx="4"
				/>

				<!-- Bar value -->
				<rect
					x={labelWidth}
					y={y}
					width={Math.max(0, barWidth)}
					height={barHeight}
					fill={getBarColor(duo.pointsPerPossession)}
					rx="4"
					opacity="0.8"
				/>

				<!-- PPP value -->
				<text
					x={labelWidth + Math.max(0, barWidth) + 8}
					y={y + barHeight / 2 + 4}
					class="chart-value"
				>
					{formatPPP(duo.pointsPerPossession)}
				</text>

				<!-- Delta indicator -->
				<text
					x={chartWidth - 5}
					y={y + barHeight / 2 + 4}
					text-anchor="end"
					class="chart-delta"
					class:positive={duo.deltaVsLeague >= 0}
					class:negative={duo.deltaVsLeague < 0}
				>
					{formatDelta(duo.deltaVsLeague)}
				</text>
			{/each}
		</svg>

		<!-- Legend -->
		<div class="chart-legend">
			<span class="legend-item">
				<span class="legend-dot" style="background: var(--color-performance-success)"></span>
				Elite (+0.2)
			</span>
			<span class="legend-item">
				<span class="legend-dot" style="background: var(--color-performance-data-1)"></span>
				Above Avg
			</span>
			<span class="legend-item">
				<span class="legend-dot" style="background: var(--color-performance-warning)"></span>
				Near Avg
			</span>
			<span class="legend-item">
				<span class="legend-dot" style="background: var(--color-performance-error)"></span>
				Below Avg
			</span>
		</div>
	{/if}
</div>

<style>
	.duo-chart {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		padding: var(--space-performance-md);
	}

	.chart-title {
		font-size: var(--text-performance-body-lg);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-md);
	}

	.empty-message {
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-body-sm);
		text-align: center;
		padding: var(--space-performance-lg);
	}

	.chart-svg {
		width: 100%;
		height: auto;
		max-height: 400px;
	}

	.chart-label {
		font-size: 12px;
		fill: var(--color-performance-fg-secondary);
		font-family: inherit;
	}

	.chart-label-small {
		font-size: 10px;
		fill: var(--color-performance-fg-muted);
		font-family: inherit;
	}

	.chart-value {
		font-size: 12px;
		fill: var(--color-performance-fg-primary);
		font-weight: 600;
		font-family: inherit;
	}

	.chart-delta {
		font-size: 11px;
		font-family: inherit;
	}

	.chart-delta.positive {
		fill: var(--color-performance-success);
	}

	.chart-delta.negative {
		fill: var(--color-performance-error);
	}

	.chart-legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-performance-md);
		margin-top: var(--space-performance-md);
		padding-top: var(--space-performance-sm);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: var(--space-performance-xs);
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	.legend-dot {
		width: 8px;
		height: 8px;
		border-radius: var(--radius-performance-scale-full);
	}
</style>
