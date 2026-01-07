<script lang="ts">
	/**
	 * Sparkline - Tufte-inspired word-sized trend visualization
	 *
	 * Renders a minimal line chart that can sit inline with text.
	 * No axes, no labels - just the pure data shape.
	 */

	interface Props {
		/** Data points to visualize */
		data: number[];
		/** Width in pixels */
		width?: number;
		/** Height in pixels */
		height?: number;
		/** Line color */
		color?: string;
		/** Show min/max dots */
		showExtremes?: boolean;
		/** Show trend direction indicator */
		showTrend?: boolean;
		/** Fill area under line */
		filled?: boolean;
	}

	let {
		data,
		width = 60,
		height = 16,
		color = 'var(--color-fg-secondary)',
		showExtremes = false,
		showTrend = false,
		filled = false
	}: Props = $props();

	// Calculate path and metrics
	const sparkData = $derived(() => {
		if (!data || data.length < 2) {
			return { path: '', fillPath: '', min: 0, max: 0, minIndex: 0, maxIndex: 0, trend: 0 };
		}

		const min = Math.min(...data);
		const max = Math.max(...data);
		const range = max - min || 1;

		// Padding for extremes dots
		const padding = showExtremes ? 3 : 1;
		const effectiveWidth = width - padding * 2;
		const effectiveHeight = height - padding * 2;

		// Calculate points
		const points = data.map((value, index) => {
			const x = padding + (index / (data.length - 1)) * effectiveWidth;
			const y = padding + effectiveHeight - ((value - min) / range) * effectiveHeight;
			return { x, y, value };
		});

		// Build SVG path
		const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

		// Build fill path (closed polygon for area chart)
		const fillPath = filled
			? `${path} L ${points[points.length - 1].x.toFixed(1)} ${height - padding} L ${padding} ${height - padding} Z`
			: '';

		// Find min/max indices
		let minIndex = 0;
		let maxIndex = 0;
		data.forEach((value, index) => {
			if (value === min) minIndex = index;
			if (value === max) maxIndex = index;
		});

		// Calculate trend (comparing first and last thirds)
		const thirdLength = Math.floor(data.length / 3);
		const firstThird = data.slice(0, thirdLength);
		const lastThird = data.slice(-thirdLength);
		const firstAvg = firstThird.reduce((a, b) => a + b, 0) / firstThird.length;
		const lastAvg = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;
		const trend = lastAvg - firstAvg;

		return {
			path,
			fillPath,
			min,
			max,
			minIndex,
			maxIndex,
			minPoint: points[minIndex],
			maxPoint: points[maxIndex],
			trend,
			points
		};
	});

	// Trend indicator
	const trendIndicator = $derived(() => {
		const { trend, min, max } = sparkData();
		const range = max - min || 1;
		const pct = (trend / range) * 100;

		if (pct > 10) return { symbol: '↑', class: 'trend-up' };
		if (pct < -10) return { symbol: '↓', class: 'trend-down' };
		return { symbol: '→', class: 'trend-flat' };
	});
</script>

<span class="sparkline-container">
	<svg {width} {height} class="sparkline" aria-hidden="true">
		{#if filled && sparkData().fillPath}
			<path d={sparkData().fillPath} fill={color} fill-opacity="0.1" />
		{/if}

		<path d={sparkData().path} fill="none" stroke={color} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />

		{#if showExtremes && sparkData().minPoint && sparkData().maxPoint}
			<!-- Min point (subtle) -->
			<circle cx={sparkData().minPoint.x} cy={sparkData().minPoint.y} r="2" fill="var(--color-error)" />
			<!-- Max point -->
			<circle cx={sparkData().maxPoint.x} cy={sparkData().maxPoint.y} r="2" fill="var(--color-success)" />
		{/if}
	</svg>

	{#if showTrend}
		<span class="trend-indicator {trendIndicator().class}">{trendIndicator().symbol}</span>
	{/if}
</span>

<style>
	.sparkline-container {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		vertical-align: middle;
	}

	.sparkline {
		display: inline-block;
		vertical-align: middle;
	}

	.trend-indicator {
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		line-height: 1;
	}

	.trend-up {
		color: var(--color-success);
	}

	.trend-down {
		color: var(--color-error);
	}

	.trend-flat {
		color: var(--color-fg-muted);
	}
</style>
