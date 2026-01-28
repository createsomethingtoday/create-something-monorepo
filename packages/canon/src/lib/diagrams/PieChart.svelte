<script lang="ts">
  import type { DiagramConfig, PieChartData } from './types.js';
  import { getDataColor } from './theme.js';

  interface Props {
    data: PieChartData;
    config?: DiagramConfig;
  }

  let { data, config = {} }: Props = $props();

  const {
    width = 500,
    height = 400,
    title,
    property = 'io',
    branded = false,
  } = config;

  const { data: chartData, donut = false, showLabels = true, showPercentages = true } = data;

  const PADDING = 42;
  const centerX = width / 2;
  const centerY = height / 2 + (title ? 20 : 0);
  const radius = Math.min(width, height) / 2 - PADDING - 40;
  const innerRadius = donut ? radius * 0.6 : 0;

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  // Calculate slices
  let currentAngle = -90;
  const slices = chartData.map((d, i) => {
    const sliceAngle = (d.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    const largeArc = sliceAngle > 180 ? 1 : 0;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    let pathD: string;
    if (donut) {
      const ix1 = centerX + innerRadius * Math.cos(startRad);
      const iy1 = centerY + innerRadius * Math.sin(startRad);
      const ix2 = centerX + innerRadius * Math.cos(endRad);
      const iy2 = centerY + innerRadius * Math.sin(endRad);
      pathD = `M${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} L${ix2},${iy2} A${innerRadius},${innerRadius} 0 ${largeArc},0 ${ix1},${iy1} Z`;
    } else {
      pathD = `M${centerX},${centerY} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`;
    }

    const midAngle = (startAngle + endAngle) / 2;
    const midRad = (midAngle * Math.PI) / 180;
    const labelRadius = radius + 20;
    const labelX = centerX + labelRadius * Math.cos(midRad);
    const labelY = centerY + labelRadius * Math.sin(midRad);

    const percentage = Math.round((d.value / total) * 100);
    const color = d.color ?? getDataColor(i, property);

    currentAngle = endAngle;

    return {
      ...d,
      pathD,
      color,
      labelX,
      labelY,
      percentage,
      textAnchor: midAngle > 90 && midAngle < 270 ? 'end' : 'start',
    };
  });
</script>

<svg
  {width}
  {height}
  viewBox="0 0 {width} {height}"
  class="diagram pie-chart"
  xmlns="http://www.w3.org/2000/svg"
>
  <!-- Background -->
  <rect {width} {height} class="bg" />

  <!-- Title -->
  {#if title}
    <text x={width / 2} y={PADDING} class="title" text-anchor="middle">{title}</text>
  {/if}

  <!-- Slices -->
  {#each slices as slice}
    <path d={slice.pathD} fill={slice.color} stroke="var(--color-bg-pure, #000)" stroke-width="2" class="slice" />

    {#if showLabels || showPercentages}
      <text x={slice.labelX} y={slice.labelY} class="slice-label" text-anchor={slice.textAnchor} dominant-baseline="middle">
        {#if showLabels && showPercentages}
          {slice.label} ({slice.percentage}%)
        {:else if showLabels}
          {slice.label}
        {:else}
          {slice.percentage}%
        {/if}
      </text>
    {/if}
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

  .slice {
    transition: opacity 0.2s ease, transform 0.2s ease;
    transform-origin: center;
  }

  .slice:hover {
    opacity: 0.85;
  }

  .slice-label {
    fill: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
    font-size: var(--text-caption, 0.75rem);
  }

  .branding {
    fill: var(--color-fg-subtle, rgba(255, 255, 255, 0.2));
    font-size: var(--text-caption, 0.75rem);
  }
</style>
