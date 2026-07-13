<script lang="ts">
  import type { DiagramConfig, BarChartData } from './types.js';
  import { getDataColor, getAccentColor } from './theme.js';

  interface Props {
    data: BarChartData;
    config?: DiagramConfig;
  }

  let { data, config = {} }: Props = $props();
  const width = $derived(config.width ?? 600);
  const height = $derived(config.height ?? 400);
  const title = $derived(config.title);
  const property = $derived(config.property ?? 'io');
  const branded = $derived(config.branded ?? false);

  const chartData = $derived(data.data);
  const showValues = $derived(data.showValues ?? true);
  const showGrid = $derived(data.showGrid ?? true);

  const PADDING = 42;
  const CHART_LEFT = PADDING + 50;
  const CHART_RIGHT = $derived(width - PADDING);
  const CHART_TOP = $derived(PADDING + (title ? 40 : 0));
  const CHART_BOTTOM = $derived(height - PADDING - 30);

  const chartWidth = $derived(CHART_RIGHT - CHART_LEFT);
  const chartHeight = $derived(CHART_BOTTOM - CHART_TOP);

  const maxValue = $derived(Math.max(...chartData.map((d) => d.value), 0));
  const barCount = $derived(chartData.length);

  const BAR_SPACING = 0.2;
  const totalBarWidth = $derived(barCount > 0 ? chartWidth / barCount : 0);
  const barWidth = $derived(totalBarWidth * (1 - BAR_SPACING));
  const barGap = $derived(totalBarWidth * BAR_SPACING);

  // Grid lines
  const gridLines = 5;
  const gridPositions = $derived(
    Array.from({ length: gridLines + 1 }, (_, i) => ({
      y: CHART_TOP + (chartHeight * i) / gridLines,
      value: Math.round(maxValue * (1 - i / gridLines)),
    }))
  );

  // Bar positions
  const bars = $derived(
    chartData.map((d, i) => {
      const denominator = maxValue || 1;
      const barHeight = (d.value / denominator) * chartHeight;
      return {
        ...d,
        x: CHART_LEFT + i * totalBarWidth + barGap / 2,
        y: CHART_BOTTOM - barHeight,
        width: barWidth,
        height: barHeight,
        color: d.color ?? getDataColor(i, property),
      };
    })
  );
</script>

<svg
  {width}
  {height}
  viewBox="0 0 {width} {height}"
  class="diagram bar-chart"
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

  <!-- Bars -->
  {#each bars as bar}
    <rect
      x={bar.x}
      y={bar.y}
      width={bar.width}
      height={bar.height}
      rx="6"
      fill={bar.color}
      class="bar"
    />

    <!-- Value label -->
    {#if showValues}
      <text x={bar.x + bar.width / 2} y={bar.y - 8} class="value-label" text-anchor="middle">
        {bar.value}
      </text>
    {/if}

    <!-- X-axis label -->
    <text x={bar.x + bar.width / 2} y={CHART_BOTTOM + 16} class="axis-label" text-anchor="middle">
      {bar.label}
    </text>
  {/each}

  <!-- Branding -->
  {#if branded}
    <text x={width - PADDING} y={height - 12} class="branding" text-anchor="end">
      createsomething.{property}
    </text>
  {/if}
</svg>

<style>
  .diagram {
    font-family: var(--font-performance-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  }

  .bg {
    fill: var(--color-performance-bg-pure, #000000);
  }

  .title {
    fill: var(--color-performance-fg-primary, #ffffff);
    font-size: var(--text-performance-h2, 1.5rem);
    font-weight: 600;
  }

  .grid-line {
    stroke: var(--color-performance-border-default, rgba(255, 255, 255, 0.1));
    stroke-width: 1;
  }

  .axis-label {
    fill: var(--color-performance-fg-muted, rgba(255, 255, 255, 0.46));
    font-size: var(--text-performance-caption, 0.75rem);
  }

  .bar {
    transition: opacity 0.2s ease;
  }

  .bar:hover {
    opacity: 0.8;
  }

  .value-label {
    fill: var(--color-performance-fg-secondary, rgba(255, 255, 255, 0.8));
    font-size: var(--text-performance-caption, 0.75rem);
  }

  .branding {
    fill: var(--color-performance-fg-subtle, rgba(255, 255, 255, 0.2));
    font-size: var(--text-performance-caption, 0.75rem);
  }
</style>
