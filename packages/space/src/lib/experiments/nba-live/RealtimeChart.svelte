<script lang="ts">
	/**
	 * RealtimeChart - Canvas-based real-time data visualization
	 *
	 * High-performance canvas renderer for live updating charts.
	 * Supports streaming data, smooth animations, and multiple chart types.
	 */
	import { onMount } from 'svelte';

	type ChartType = 'line' | 'area' | 'bar' | 'scatter';

	interface DataPoint {
		x: number;
		y: number;
		label?: string;
		meta?: Record<string, unknown>;
	}

	interface Series {
		id: string;
		name: string;
		data: DataPoint[];
		color?: string;
		type?: ChartType;
	}

	interface Props {
		series: Series[];
		width?: number;
		height?: number;
		xLabel?: string;
		yLabel?: string;
		showGrid?: boolean;
		showLegend?: boolean;
		animate?: boolean;
		yMin?: number;
		yMax?: number;
		xMin?: number;
		xMax?: number;
		onHover?: (point: DataPoint | null, series: Series | null) => void;
		onClick?: (point: DataPoint, series: Series) => void;
	}

	let {
		series,
		width = 600,
		height = 400,
		xLabel,
		yLabel,
		showGrid = true,
		showLegend = true,
		animate = true,
		yMin,
		yMax,
		xMin,
		xMax,
		onHover,
		onClick
	}: Props = $props();

	// Canvas and state
	let canvas: HTMLCanvasElement | null = $state(null);
	let hoveredPoint: { point: DataPoint; series: Series } | null = $state(null);
	let animationProgress = $state(animate ? 0 : 1);
	let previousData = $state<Series[]>([]);

	// Layout
	const padding = { top: 20, right: 20, bottom: 40, left: 60 };
	const chartWidth = width - padding.left - padding.right;
	const chartHeight = height - padding.top - padding.bottom;

	// Resolved colors (canvas can't use CSS vars directly)
	let colors = $state({
		bgPure: '#0a0a0a',
		bgElevated: '#1a1a1a',
		fgPrimary: '#ffffff',
		fgMuted: '#888888',
		borderDefault: '#333333',
		borderStrong: '#666666',
		data: ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']
	});

	// Resolve CSS custom properties on mount
	function resolveColors() {
		if (typeof window === 'undefined') return;
		const styles = getComputedStyle(document.documentElement);
		const get = (prop: string, fallback: string) =>
			styles.getPropertyValue(prop).trim() || fallback;

		colors = {
			bgPure: get('--color-bg-pure', '#0a0a0a'),
			bgElevated: get('--color-bg-elevated', '#1a1a1a'),
			fgPrimary: get('--color-fg-primary', '#ffffff'),
			fgMuted: get('--color-fg-muted', '#888888'),
			borderDefault: get('--color-border-default', '#333333'),
			borderStrong: get('--color-border-strong', '#666666'),
			data: [
				get('--color-data-1', '#6366f1'),
				get('--color-data-2', '#22c55e'),
				get('--color-data-3', '#f59e0b'),
				get('--color-data-4', '#ef4444'),
				get('--color-data-5', '#8b5cf6')
			]
		};
	}

	// Series colors (using resolved values)
	const getSeriesColor = (index: number, customColor?: string): string => {
		if (customColor && !customColor.startsWith('var(')) return customColor;
		return colors.data[index % colors.data.length];
	};

	// Calculate bounds
	const bounds = $derived(() => {
		let minX = xMin ?? Infinity;
		let maxX = xMax ?? -Infinity;
		let minY = yMin ?? Infinity;
		let maxY = yMax ?? -Infinity;

		for (const s of series) {
			for (const point of s.data) {
				if (xMin === undefined) minX = Math.min(minX, point.x);
				if (xMax === undefined) maxX = Math.max(maxX, point.x);
				if (yMin === undefined) minY = Math.min(minY, point.y);
				if (yMax === undefined) maxY = Math.max(maxY, point.y);
			}
		}

		// Add padding to Y axis
		const yRange = maxY - minY || 1;
		if (yMin === undefined) minY -= yRange * 0.05;
		if (yMax === undefined) maxY += yRange * 0.05;

		return { minX, maxX, minY, maxY };
	});

	// Coordinate transforms
	function toCanvasX(x: number): number {
		const { minX, maxX } = bounds();
		return padding.left + ((x - minX) / (maxX - minX || 1)) * chartWidth;
	}

	function toCanvasY(y: number): number {
		const { minY, maxY } = bounds();
		return padding.top + chartHeight - ((y - minY) / (maxY - minY || 1)) * chartHeight;
	}

	function fromCanvasX(cx: number): number {
		const { minX, maxX } = bounds();
		return minX + ((cx - padding.left) / chartWidth) * (maxX - minX);
	}

	function fromCanvasY(cy: number): number {
		const { minY, maxY } = bounds();
		return maxY - ((cy - padding.top) / chartHeight) * (maxY - minY);
	}

	// Easing function
	function easeOutCubic(t: number): number {
		return 1 - Math.pow(1 - t, 3);
	}

	// Animation
	$effect(() => {
		if (!animate) {
			animationProgress = 1;
			return;
		}

		// Reset animation when data changes significantly
		const dataHash = JSON.stringify(series.map((s) => s.data.length));
		const prevHash = JSON.stringify(previousData.map((s) => s.data.length));

		if (dataHash !== prevHash) {
			animationProgress = 0;
			previousData = series.map((s) => ({ ...s, data: [...s.data] }));
		}

		let startTime: number;
		const duration = 500;

		function tick(time: number) {
			if (!startTime) startTime = time;
			const elapsed = time - startTime;
			animationProgress = Math.min(1, easeOutCubic(elapsed / duration));

			if (animationProgress < 1) {
				requestAnimationFrame(tick);
			}
		}

		if (animationProgress < 1) {
			requestAnimationFrame(tick);
		}
	});

	// Resolve colors on mount (use onMount to avoid effect loops)
	onMount(() => {
		resolveColors();
	});

	// Render
	$effect(() => {
		const canvasEl = canvas;
		if (!canvasEl) return;

		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		const dpr = window.devicePixelRatio || 1;
		canvasEl.width = width * dpr;
		canvasEl.height = height * dpr;
		ctx.scale(dpr, dpr);

		// Clear
		ctx.fillStyle = colors.bgPure;
		ctx.fillRect(0, 0, width, height);

		// Draw grid
		if (showGrid) {
			ctx.strokeStyle = colors.borderDefault;
			ctx.lineWidth = 0.5;

			// Vertical grid lines
			const xTicks = 5;
			const { minX, maxX, minY, maxY } = bounds();
			const xStep = (maxX - minX) / xTicks;

			for (let i = 0; i <= xTicks; i++) {
				const x = toCanvasX(minX + i * xStep);
				ctx.beginPath();
				ctx.moveTo(x, padding.top);
				ctx.lineTo(x, height - padding.bottom);
				ctx.stroke();
			}

			// Horizontal grid lines
			const yTicks = 5;
			const yStep = (maxY - minY) / yTicks;

			for (let i = 0; i <= yTicks; i++) {
				const y = toCanvasY(minY + i * yStep);
				ctx.beginPath();
				ctx.moveTo(padding.left, y);
				ctx.lineTo(width - padding.right, y);
				ctx.stroke();
			}
		}

		// Draw axes
		ctx.strokeStyle = colors.borderStrong;
		ctx.lineWidth = 1;

		// X axis
		ctx.beginPath();
		ctx.moveTo(padding.left, height - padding.bottom);
		ctx.lineTo(width - padding.right, height - padding.bottom);
		ctx.stroke();

		// Y axis
		ctx.beginPath();
		ctx.moveTo(padding.left, padding.top);
		ctx.lineTo(padding.left, height - padding.bottom);
		ctx.stroke();

		// Draw axis labels
		ctx.fillStyle = colors.fgMuted;
		ctx.font = '11px system-ui, sans-serif';
		ctx.textAlign = 'center';

		// X axis ticks and labels
		const { minX, maxX, minY, maxY } = bounds();
		const xTicks = 5;
		const xStep = (maxX - minX) / xTicks;

		for (let i = 0; i <= xTicks; i++) {
			const value = minX + i * xStep;
			const x = toCanvasX(value);
			ctx.fillText(value.toFixed(1), x, height - padding.bottom + 16);
		}

		// Y axis ticks and labels
		ctx.textAlign = 'right';
		const yTicks = 5;
		const yStep = (maxY - minY) / yTicks;

		for (let i = 0; i <= yTicks; i++) {
			const value = minY + i * yStep;
			const y = toCanvasY(value);
			ctx.fillText(value.toFixed(1), padding.left - 8, y + 4);
		}

		// Axis labels
		if (xLabel) {
			ctx.textAlign = 'center';
			ctx.fillText(xLabel, width / 2, height - 4);
		}

		if (yLabel) {
			ctx.save();
			ctx.translate(12, height / 2);
			ctx.rotate(-Math.PI / 2);
			ctx.textAlign = 'center';
			ctx.fillText(yLabel, 0, 0);
			ctx.restore();
		}

		// Draw series
		series.forEach((s, seriesIndex) => {
			const color = getSeriesColor(seriesIndex, s.color);
			const type = s.type ?? 'line';

			if (s.data.length === 0) return;

			const animatedData = s.data.map((point, i) => {
				const progress = Math.max(0, Math.min(1, animationProgress * s.data.length - i));
				return {
					...point,
					y: point.y * progress
				};
			});

			if (type === 'line' || type === 'area') {
				// Area fill
				if (type === 'area') {
					ctx.beginPath();
					ctx.moveTo(toCanvasX(animatedData[0].x), height - padding.bottom);
					for (const point of animatedData) {
						ctx.lineTo(toCanvasX(point.x), toCanvasY(point.y));
					}
					ctx.lineTo(toCanvasX(animatedData[animatedData.length - 1].x), height - padding.bottom);
					ctx.closePath();
					ctx.fillStyle = color.replace(')', ', 0.2)').replace('var(', 'rgba(');
					ctx.globalAlpha = 0.3;
					ctx.fill();
					ctx.globalAlpha = 1;
				}

				// Line
				ctx.beginPath();
				ctx.strokeStyle = color;
				ctx.lineWidth = 2;
				ctx.lineJoin = 'round';
				ctx.lineCap = 'round';

				animatedData.forEach((point, i) => {
					const x = toCanvasX(point.x);
					const y = toCanvasY(point.y);
					if (i === 0) ctx.moveTo(x, y);
					else ctx.lineTo(x, y);
				});
				ctx.stroke();

				// Points
				for (const point of animatedData) {
					const x = toCanvasX(point.x);
					const y = toCanvasY(point.y);
					const isHovered =
						hoveredPoint?.series.id === s.id &&
						hoveredPoint?.point.x === point.x &&
						hoveredPoint?.point.y === point.y;

					ctx.beginPath();
					ctx.arc(x, y, isHovered ? 6 : 3, 0, Math.PI * 2);
					ctx.fillStyle = isHovered ? colors.fgPrimary : color;
					ctx.fill();

					if (isHovered) {
						ctx.strokeStyle = color;
						ctx.lineWidth = 2;
						ctx.stroke();
					}
				}
			} else if (type === 'bar') {
				const barWidth = chartWidth / (animatedData.length * series.length + series.length) - 2;
				const groupWidth = barWidth * series.length + 4;

				animatedData.forEach((point, i) => {
					const groupX = toCanvasX(point.x) - groupWidth / 2;
					const x = groupX + seriesIndex * (barWidth + 2);
					const barHeight = (height - padding.bottom - toCanvasY(point.y)) * animationProgress;
					const y = height - padding.bottom - barHeight;

					const isHovered =
						hoveredPoint?.series.id === s.id && hoveredPoint?.point.x === point.x;

					ctx.fillStyle = color;
					if (isHovered) ctx.globalAlpha = 1;
					else ctx.globalAlpha = 0.8;

					ctx.fillRect(x, y, barWidth, barHeight);
					ctx.globalAlpha = 1;

					if (isHovered) {
						ctx.strokeStyle = colors.fgPrimary;
						ctx.lineWidth = 2;
						ctx.strokeRect(x, y, barWidth, barHeight);
					}
				});
			} else if (type === 'scatter') {
				for (const point of animatedData) {
					const x = toCanvasX(point.x);
					const y = toCanvasY(point.y);
					const isHovered =
						hoveredPoint?.series.id === s.id && hoveredPoint?.point.x === point.x;

					ctx.beginPath();
					ctx.arc(x, y, isHovered ? 8 : 5, 0, Math.PI * 2);
					ctx.fillStyle = color;
					ctx.globalAlpha = isHovered ? 1 : 0.7;
					ctx.fill();
					ctx.globalAlpha = 1;

					if (isHovered) {
						ctx.strokeStyle = colors.fgPrimary;
						ctx.lineWidth = 2;
						ctx.stroke();
					}
				}
			}
		});

		// Draw tooltip for hovered point
		if (hoveredPoint) {
			const { point, series: s } = hoveredPoint;
			const x = toCanvasX(point.x);
			const y = toCanvasY(point.y);

			const text = `${s.name}: (${point.x.toFixed(2)}, ${point.y.toFixed(2)})`;
			ctx.font = '12px system-ui, sans-serif';
			const textWidth = ctx.measureText(text).width;

			const tooltipX = Math.min(x + 10, width - textWidth - 20);
			const tooltipY = Math.max(y - 30, 10);

			ctx.fillStyle = colors.bgElevated;
			ctx.strokeStyle = colors.borderDefault;
			ctx.lineWidth = 1;

			ctx.beginPath();
			ctx.roundRect(tooltipX, tooltipY, textWidth + 16, 24, 4);
			ctx.fill();
			ctx.stroke();

			ctx.fillStyle = colors.fgPrimary;
			ctx.textAlign = 'left';
			ctx.fillText(text, tooltipX + 8, tooltipY + 16);
		}
	});

	// Legend
	$effect(() => {
		// Legend is rendered in HTML for better accessibility
	});

	// Hit testing
	function findNearestPoint(
		canvasX: number,
		canvasY: number
	): { point: DataPoint; series: Series } | null {
		const threshold = 20;
		let nearest: { point: DataPoint; series: Series; dist: number } | null = null;

		for (const s of series) {
			for (const point of s.data) {
				const px = toCanvasX(point.x);
				const py = toCanvasY(point.y);
				const dist = Math.sqrt((canvasX - px) ** 2 + (canvasY - py) ** 2);

				if (dist < threshold && (!nearest || dist < nearest.dist)) {
					nearest = { point, series: s, dist };
				}
			}
		}

		return nearest ? { point: nearest.point, series: nearest.series } : null;
	}

	function handleMouseMove(e: MouseEvent) {
		const rect = canvas!.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		const found = findNearestPoint(x, y);
		hoveredPoint = found;
		onHover?.(found?.point ?? null, found?.series ?? null);
	}

	function handleMouseLeave() {
		hoveredPoint = null;
		onHover?.(null, null);
	}

	function handleClick(e: MouseEvent) {
		if (hoveredPoint) {
			onClick?.(hoveredPoint.point, hoveredPoint.series);
		}
	}

	// Add data point (for real-time updates)
	export function addPoint(seriesId: string, point: DataPoint) {
		const s = series.find((s) => s.id === seriesId);
		if (s) {
			s.data = [...s.data, point];
		}
	}

	// Clear series data
	export function clearSeries(seriesId: string) {
		const s = series.find((s) => s.id === seriesId);
		if (s) {
			s.data = [];
		}
	}
</script>

<div class="realtime-chart">
	<canvas
		bind:this={canvas}
		style="width: {width}px; height: {height}px;"
		onmousemove={handleMouseMove}
		onmouseleave={handleMouseLeave}
		onclick={handleClick}
		aria-label="Real-time data chart"
	></canvas>

	{#if showLegend && series.length > 1}
		<div class="legend">
			{#each series as s, i}
				<div class="legend-item">
					<span
						class="legend-color"
						style="background: {getSeriesColor(i, s.color)}"
					></span>
					<span class="legend-label">{s.name}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.realtime-chart {
		position: relative;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	canvas {
		display: block;
		cursor: crosshair;
	}

	.legend {
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.legend-color {
		width: 12px;
		height: 12px;
		border-radius: var(--radius-sm);
	}

	.legend-label {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
	}
</style>
