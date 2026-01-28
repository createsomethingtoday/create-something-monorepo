<script lang="ts">
	/**
	 * CorrelationChart Component
	 *
	 * Scatter plot showing correlation between team assists and total points.
	 * Uses inline SVG following the pattern established in DuoChart.
	 *
	 * Data insight: High-assist games score 15.8 more points on average.
	 */

	export interface TeamGameData {
		team: string; // Team abbreviation (e.g., "BOS")
		assists: number;
		totalPoints: number;
	}

	interface Props {
		data: TeamGameData[];
		title: string;
	}

	let { data, title }: Props = $props();

	// Chart dimensions
	const width = 600;
	const height = 400;
	const padding = { top: 40, right: 40, bottom: 60, left: 60 };
	const chartWidth = width - padding.left - padding.right;
	const chartHeight = height - padding.top - padding.bottom;

	// Calculate data ranges
	const assistsExtent = $derived(() => {
		const values = data.map((d) => d.assists);
		return { min: Math.floor(Math.min(...values) / 5) * 5, max: Math.ceil(Math.max(...values) / 5) * 5 };
	});

	const pointsExtent = $derived(() => {
		const values = data.map((d) => d.totalPoints);
		return { min: Math.floor(Math.min(...values) / 10) * 10, max: Math.ceil(Math.max(...values) / 10) * 10 };
	});

	// Scale functions
	function scaleX(assists: number): number {
		const ext = assistsExtent();
		return ((assists - ext.min) / (ext.max - ext.min)) * chartWidth;
	}

	function scaleY(points: number): number {
		const ext = pointsExtent();
		// Invert Y axis (SVG coordinates)
		return chartHeight - ((points - ext.min) / (ext.max - ext.min)) * chartHeight;
	}

	// Calculate linear regression for trend line
	const regression = $derived(() => {
		const n = data.length;
		const sumX = data.reduce((sum, d) => sum + d.assists, 0);
		const sumY = data.reduce((sum, d) => sum + d.totalPoints, 0);
		const sumXY = data.reduce((sum, d) => sum + d.assists * d.totalPoints, 0);
		const sumXX = data.reduce((sum, d) => sum + d.assists * d.assists, 0);

		const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
		const intercept = (sumY - slope * sumX) / n;

		return { slope, intercept };
	});

	// Trend line coordinates
	const trendLine = $derived(() => {
		const ext = assistsExtent();
		const reg = regression();

		const x1 = ext.min;
		const y1 = reg.slope * x1 + reg.intercept;
		const x2 = ext.max;
		const y2 = reg.slope * x2 + reg.intercept;

		return {
			x1: scaleX(x1),
			y1: scaleY(y1),
			x2: scaleX(x2),
			y2: scaleY(y2)
		};
	});

	// Calculate correlation coefficient (R)
	const correlation = $derived(() => {
		const n = data.length;
		const sumX = data.reduce((sum, d) => sum + d.assists, 0);
		const sumY = data.reduce((sum, d) => sum + d.totalPoints, 0);
		const sumXY = data.reduce((sum, d) => sum + d.assists * d.totalPoints, 0);
		const sumXX = data.reduce((sum, d) => sum + d.assists * d.assists, 0);
		const sumYY = data.reduce((sum, d) => sum + d.totalPoints * d.totalPoints, 0);

		const numerator = n * sumXY - sumX * sumY;
		const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

		return numerator / denominator;
	});

	// Generate axis ticks
	function getXTicks(): number[] {
		const ext = assistsExtent();
		const step = 5;
		const ticks: number[] = [];
		for (let i = ext.min; i <= ext.max; i += step) {
			ticks.push(i);
		}
		return ticks;
	}

	function getYTicks(): number[] {
		const ext = pointsExtent();
		const step = 20;
		const ticks: number[] = [];
		for (let i = ext.min; i <= ext.max; i += step) {
			ticks.push(i);
		}
		return ticks;
	}
</script>

<div class="correlation-chart">
	<h3 class="chart-title">{title}</h3>

	{#if data.length === 0}
		<p class="empty-message">No data available</p>
	{:else}
		<svg
			viewBox="0 0 {width} {height}"
			class="chart-svg"
			role="img"
			aria-label="Correlation between assists and points"
		>
			<!-- Axis lines -->
			<line
				x1={padding.left}
				y1={padding.top}
				x2={padding.left}
				y2={height - padding.bottom}
				stroke="var(--color-border-emphasis)"
				stroke-width="1"
			/>
			<line
				x1={padding.left}
				y1={height - padding.bottom}
				x2={width - padding.right}
				y2={height - padding.bottom}
				stroke="var(--color-border-emphasis)"
				stroke-width="1"
			/>

			<!-- X-axis ticks and labels -->
			{#each getXTicks() as tick}
				<line
					x1={padding.left + scaleX(tick)}
					y1={height - padding.bottom}
					x2={padding.left + scaleX(tick)}
					y2={height - padding.bottom + 5}
					stroke="var(--color-fg-muted)"
					stroke-width="1"
				/>
				<text
					x={padding.left + scaleX(tick)}
					y={height - padding.bottom + 20}
					text-anchor="middle"
					class="axis-label"
				>
					{tick}
				</text>
			{/each}

			<!-- Y-axis ticks and labels -->
			{#each getYTicks() as tick}
				<line
					x1={padding.left - 5}
					y1={padding.top + scaleY(tick)}
					x2={padding.left}
					y2={padding.top + scaleY(tick)}
					stroke="var(--color-fg-muted)"
					stroke-width="1"
				/>
				<text
					x={padding.left - 10}
					y={padding.top + scaleY(tick) + 4}
					text-anchor="end"
					class="axis-label"
				>
					{tick}
				</text>
			{/each}

			<!-- Axis titles -->
			<text
				x={padding.left + chartWidth / 2}
				y={height - 10}
				text-anchor="middle"
				class="axis-title"
			>
				Team Assists
			</text>
			<text
				x={15}
				y={padding.top + chartHeight / 2}
				text-anchor="middle"
				transform="rotate(-90 15 {padding.top + chartHeight / 2})"
				class="axis-title"
			>
				Total Points
			</text>

			<!-- Trend line -->
			<line
				x1={padding.left + trendLine().x1}
				y1={padding.top + trendLine().y1}
				x2={padding.left + trendLine().x2}
				y2={padding.top + trendLine().y2}
				stroke="var(--color-data-1)"
				stroke-width="2"
				stroke-dasharray="5,5"
				opacity="0.6"
			/>

			<!-- Data points -->
			{#each data as point}
				<g class="data-point">
					<!-- Point circle -->
					<circle
						cx={padding.left + scaleX(point.assists)}
						cy={padding.top + scaleY(point.totalPoints)}
						r="6"
						fill="var(--color-data-2)"
						stroke="var(--color-bg-pure)"
						stroke-width="2"
						opacity="0.8"
					/>

					<!-- Team label -->
					<text
						x={padding.left + scaleX(point.assists)}
						y={padding.top + scaleY(point.totalPoints) - 12}
						text-anchor="middle"
						class="point-label"
					>
						{point.team}
					</text>
				</g>
			{/each}

			<!-- Correlation coefficient label -->
			<text
				x={width - padding.right}
				y={padding.top - 10}
				text-anchor="end"
				class="correlation-label"
			>
				R = {correlation().toFixed(3)}
			</text>
		</svg>

		<!-- Insight -->
		<div class="chart-insight">
			<p>
				<strong>Finding:</strong> Teams with more assists tend to score more points.
				The correlation coefficient (R = {correlation().toFixed(3)}) shows a
				{Math.abs(correlation()) > 0.7 ? 'strong' : Math.abs(correlation()) > 0.4 ? 'moderate' : 'weak'}
				positive relationship between ball movement and scoring efficiency.
			</p>
		</div>
	{/if}
</div>

<style>
	.correlation-chart {
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
	}

	.axis-label {
		font-size: 11px;
		fill: var(--color-fg-muted);
		font-family: inherit;
	}

	.axis-title {
		font-size: 12px;
		fill: var(--color-fg-secondary);
		font-weight: 500;
		font-family: inherit;
	}

	.point-label {
		font-size: 10px;
		fill: var(--color-fg-primary);
		font-weight: 600;
		font-family: inherit;
		pointer-events: none;
	}

	.correlation-label {
		font-size: 13px;
		fill: var(--color-data-1);
		font-weight: 600;
		font-family: inherit;
	}

	.chart-insight {
		margin-top: var(--space-md);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	.chart-insight p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.5;
	}

	.chart-insight strong {
		color: var(--color-fg-primary);
	}

	.data-point {
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.data-point:hover {
		opacity: 1;
	}

	.data-point:hover circle {
		r: 8;
	}
</style>
