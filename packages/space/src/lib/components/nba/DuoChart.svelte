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
	const chartWidth = 400;
	const chartHeight = duos.length * 60 + 40; // 60px per bar + padding
	const barHeight = 40;
	const labelWidth = 120;
	const maxPPP = 1.8; // Max scale for PPP
	const leagueAvgPPP = 1.12;

	// Scale PPP to pixels
	function scalePPP(ppp: number): number {
		return ((ppp / maxPPP) * (chartWidth - labelWidth - 60));
	}

	// Get bar color based on performance vs league average
	function getBarColor(ppp: number): string {
		if (ppp >= leagueAvgPPP + 0.2) return 'var(--color-success)';
		if (ppp >= leagueAvgPPP) return 'var(--color-data-1)';
		if (ppp >= leagueAvgPPP - 0.1) return 'var(--color-warning)';
		return 'var(--color-error)';
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
				stroke="var(--color-fg-muted)"
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
				{@const barWidth = scalePPP(duo.pointsPerPossession)}

				<!-- Duo name label -->
				<text
					x="5"
					y={y + barHeight / 2 + 4}
					class="chart-label"
				>
					{getDuoName(duo)}
				</text>

				<!-- Bar background -->
				<rect
					x={labelWidth}
					y={y}
					width={chartWidth - labelWidth - 60}
					height={barHeight}
					fill="var(--color-bg-surface)"
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
					x={chartWidth - 10}
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
				<span class="legend-dot" style="background: var(--color-success)"></span>
				Elite (+0.2)
			</span>
			<span class="legend-item">
				<span class="legend-dot" style="background: var(--color-data-1)"></span>
				Above Avg
			</span>
			<span class="legend-item">
				<span class="legend-dot" style="background: var(--color-warning)"></span>
				Near Avg
			</span>
			<span class="legend-item">
				<span class="legend-dot" style="background: var(--color-error)"></span>
				Below Avg
			</span>
		</div>
	{/if}
</div>

<style>
	.duo-chart {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.chart-title {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.empty-message {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		text-align: center;
		padding: var(--space-lg);
	}

	.chart-svg {
		width: 100%;
		height: auto;
		max-height: 400px;
	}

	.chart-label {
		font-size: 12px;
		fill: var(--color-fg-secondary);
		font-family: inherit;
	}

	.chart-label-small {
		font-size: 10px;
		fill: var(--color-fg-muted);
		font-family: inherit;
	}

	.chart-value {
		font-size: 12px;
		fill: var(--color-fg-primary);
		font-weight: 600;
		font-family: inherit;
	}

	.chart-delta {
		font-size: 11px;
		font-family: inherit;
	}

	.chart-delta.positive {
		fill: var(--color-success);
	}

	.chart-delta.negative {
		fill: var(--color-error);
	}

	.chart-legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-md);
		margin-top: var(--space-md);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.legend-dot {
		width: 8px;
		height: 8px;
		border-radius: var(--radius-full);
	}
</style>
