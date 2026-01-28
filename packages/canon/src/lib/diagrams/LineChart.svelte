<script lang="ts">
  import type { DiagramConfig, LineChartData } from './types.js';
  import { getDataColor } from './theme.js';

  interface Props {
    data: LineChartData;
    config?: DiagramConfig;
  }

  let { data, config = {} }: Props = $props();

  const {
    width = 700,
    height = 400,
    title,
    property = 'io',
    branded = false,
  } = config;

  const { series, showPoints = true, showGrid = true } = data;

  const PADDING = 42;
  const CHART_LEFT = PADDING + 50;
  const CHART_RIGHT = width - PADDING;
  const CHART_TOP = PADDING + (title ? 40 : 0);
  const CHART_BOTTOM = height - PADDING - 30;

  const chartWidth = CHART_RIGHT - CHART_LEFT;
  const chartHeight = CHART_BOTTOM - CHART_TOP;

  // Calculate bounds
  const allYValues = series.flatMap((s) => s.data.map((d) => d.y));
  const maxY = Math.max(...allYValues);
  const minY = Math.min(0, Math.min(...allYValues));
  const yRange = maxY - minY || 1;

  const allXValues = series.flatMap((s) => s.data.map((d) => (typeof d.x === 'number' ? d.x : 0)));
  const maxX = Math.max(...allXValues);
  const minX = Math.min(...allXValues);
  const xRange = maxX - minX || 1;

  // Grid
  const gridLines = 5;
  const gridPositions = Array.from({ length: gridLines + 1 }, (_, i) => ({
    y: CHART_TOP + (chartHeight * i) / gridLines,
    value: Math.round(maxY - (yRange * i) / gridLines),
  }));

  // Series data
  const seriesData = series.map((s, si) => {
    const color = s.color ?? getDataColor(si, property);
    const points = s.data.map((d) => {
      const xVal = typeof d.x === 'number' ? d.x : 0;
      return {
        x: CHART_LEFT + ((xVal - minX) / xRange) * chartWidth,
        y: CHART_BOTTOM - ((d.y - minY) / yRange) * chartHeight,
      };
    });
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    return { ...s, color, points, pathD };
  });
</script>

<svg
  {width}
  {height}
  viewBox="0 0 {width} {height}"
  class="diagram line-chart"
  xmlns="http://www.w3.org/2000/svg"
>
  <!-- Background -->
  <rect {width} {height} class="bg" />

  <!-- Title -->
  {#if title}
    <text x={width / 2} y={PADDING} class="title" text-anchor="middle">{title}</text>
  {/if}

  <!-- Grid -->
  {#if showGrid}
    {#each gridPositions as line}
      <line x1={CHART_LEFT} y1={line.y} x2={CHART_RIGHT} y2={line.y} class="grid-line" />
      <text x={CHART_LEFT - 10} y={line.y} class="axis-label" text-anchor="end" dominant-baseline="middle">
        {line.value}
      </text>
    {/each}
  {/if}

  <!-- Series -->
  {#each seriesData as s}
    <path d={s.pathD} fill="none" stroke={s.color} stroke-width="2" stroke-linejoin="round" class="line" />

    {#if showPoints}
      {#each s.points as point}
        <circle cx={point.x} cy={point.y} r="4" fill={s.color} stroke="var(--color-bg-pure, #000)" stroke-width="2" class="point" />
      {/each}
    {/if}
  {/each}

  <!-- Legend -->
  {#if series.length > 1}
    {@const legendY = CHART_TOP - 10}
    {#each seriesData as s, i}
      {@const legendX = CHART_LEFT + i * 100}
      <rect x={legendX} y={legendY - 6} width="16" height="3" rx="1.5" fill={s.color} />
      <text x={legendX + 22} y={legendY} class="legend-label">{s.name}</text>
    {/each}
  {/if}

  <!-- Branding -->
  {#if branded}
    <text x={width - PADDING} y={height - 12} class="branding" text-anchor="end">
      createsomething.{property}
    </text>
  {/if}
</svg>

<style>
  .diagram {
    font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  }

  .bg {
    fill: var(--color-bg-pure, #000000);
  }

  .title {
    fill: var(--color-fg-primary, #ffffff);
    font-size: var(--text-h2, 1.5rem);
    font-weight: 600;
  }

  .grid-line {
    stroke: var(--color-border-default, rgba(255, 255, 255, 0.1));
    stroke-width: 1;
  }

  .axis-label {
    fill: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
    font-size: var(--text-caption, 0.75rem);
  }

  .line {
    transition: opacity 0.2s ease;
  }

  .line:hover {
    opacity: 0.8;
  }

  .point {
    transition: r 0.2s ease;
  }

  .point:hover {
    r: 6;
  }

  .legend-label {
    fill: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
    font-size: var(--text-caption, 0.75rem);
  }

  .branding {
    fill: var(--color-fg-subtle, rgba(255, 255, 255, 0.2));
    font-size: var(--text-caption, 0.75rem);
  }
</style>
