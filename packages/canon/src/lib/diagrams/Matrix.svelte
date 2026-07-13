<script lang="ts">
  import type { DiagramConfig, MatrixData } from './types.js';

  interface Props {
    data: MatrixData;
    config?: DiagramConfig;
  }

  let { data, config = {} }: Props = $props();
  const width = $derived(config.width ?? 700);
  const height = $derived(config.height ?? 400);
  const title = $derived(config.title);
  const subtitle = $derived(config.subtitle);
  const property = $derived(config.property ?? 'io');
  const branded = $derived(config.branded ?? false);

  const rowHeaders = $derived(data.rowHeaders);
  const columnHeaders = $derived(data.columnHeaders);
  const cells = $derived(data.cells);
  const caption = $derived(data.caption);
  const showLabels = true;

  const PADDING = 42;
  const HEADER_HEIGHT = 40;
  const ROW_LABEL_WIDTH = 120;

  const titleHeight = $derived((title ? 32 : 0) + (subtitle ? 24 : 0));
  const tableTop = $derived(PADDING + titleHeight + 20);
  const tableLeft = PADDING + ROW_LABEL_WIDTH;
  const tableWidth = $derived(width - PADDING * 2 - ROW_LABEL_WIDTH);
  const tableHeight = $derived(height - tableTop - PADDING - 20);

  const colWidth = $derived(tableWidth / columnHeaders.length);
  const rowHeight = $derived((tableHeight - HEADER_HEIGHT) / rowHeaders.length);

  function getCellValue(row: number, col: number): string | number | boolean | undefined {
    return cells[row]?.[col]?.value;
  }

  function getCellHighlight(row: number, col: number): boolean {
    return cells[row]?.[col]?.highlight ?? false;
  }
</script>

<svg
  {width}
  {height}
  viewBox="0 0 {width} {height}"
  class="diagram matrix"
  xmlns="http://www.w3.org/2000/svg"
>
  <!-- Background -->
  <rect {width} {height} class="bg" />

  <!-- Title -->
  {#if title}
    <text x={width / 2} y={PADDING} class="title" text-anchor="middle">{title}</text>
  {/if}

  {#if subtitle}
    <text x={width / 2} y={PADDING + 28} class="subtitle" text-anchor="middle">{subtitle}</text>
  {/if}

  <!-- Column Headers -->
  {#each columnHeaders as col, i}
    <text
      x={tableLeft + i * colWidth + colWidth / 2}
      y={tableTop + HEADER_HEIGHT / 2}
      class="header-label"
      text-anchor="middle"
      dominant-baseline="middle"
    >
      {col}
    </text>
  {/each}

  <!-- Header separator -->
  <line
    x1={tableLeft}
    y1={tableTop + HEADER_HEIGHT}
    x2={tableLeft + tableWidth}
    y2={tableTop + HEADER_HEIGHT}
    class="separator"
  />

  <!-- Rows -->
  {#each rowHeaders as row, ri}
    {@const y = tableTop + HEADER_HEIGHT + ri * rowHeight}

    <!-- Row label -->
    <text
      x={PADDING + ROW_LABEL_WIDTH - 10}
      y={y + rowHeight / 2}
      class="row-label"
      text-anchor="end"
      dominant-baseline="middle"
    >
      {row}
    </text>

    <!-- Cells -->
    {#each columnHeaders as _, ci}
      {@const value = getCellValue(ri, ci)}
      {@const highlight = getCellHighlight(ri, ci)}

      <rect
        x={tableLeft + ci * colWidth + 2}
        y={y + 2}
        width={colWidth - 4}
        height={rowHeight - 4}
        rx="4"
        class="cell"
        class:highlight
      />

      {#if showLabels && value}
        <text
          x={tableLeft + ci * colWidth + colWidth / 2}
          y={y + rowHeight / 2}
          class="cell-value"
          class:highlight
          text-anchor="middle"
          dominant-baseline="middle"
        >
          {value}
        </text>
      {/if}
    {/each}

    <!-- Row separator -->
    {#if ri < rowHeaders.length - 1}
      <line
        x1={tableLeft}
        y1={y + rowHeight}
        x2={tableLeft + tableWidth}
        y2={y + rowHeight}
        class="row-separator"
      />
    {/if}
  {/each}

  <!-- Branding -->
  {#if branded}
    <text x={width - PADDING} y={height - 12} class="branding" text-anchor="end">
      createsomething.{property}
    </text>
  {/if}

  {#if caption}
    <text x={PADDING} y={height - 12} class="caption" text-anchor="start">
      {caption}
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

  .subtitle {
    fill: var(--color-performance-fg-muted, rgba(255, 255, 255, 0.46));
    font-size: var(--text-performance-body-sm, 0.875rem);
  }

  .header-label {
    fill: var(--color-performance-fg-secondary, rgba(255, 255, 255, 0.8));
    font-size: var(--text-performance-body-sm, 0.875rem);
    font-weight: 600;
  }

  .row-label {
    fill: var(--color-performance-fg-secondary, rgba(255, 255, 255, 0.8));
    font-size: var(--text-performance-body-sm, 0.875rem);
  }

  .separator {
    stroke: var(--color-performance-border-emphasis, rgba(255, 255, 255, 0.2));
    stroke-width: 1;
  }

  .row-separator {
    stroke: var(--color-performance-border-default, rgba(255, 255, 255, 0.1));
    stroke-width: 1;
  }

  .cell {
    fill: transparent;
    stroke: var(--color-performance-border-default, rgba(255, 255, 255, 0.1));
    stroke-width: 1;
    transition: fill 0.2s ease;
  }

  .cell.highlight {
    fill: var(--color-performance-bg-subtle, #1a1a1a);
  }

  .cell:hover {
    fill: var(--color-performance-bg-subtle, #1a1a1a);
  }

  .cell-value {
    fill: var(--color-performance-fg-tertiary, rgba(255, 255, 255, 0.6));
    font-size: var(--text-performance-caption, 0.75rem);
  }

  .cell-value.highlight {
    fill: var(--color-performance-fg-primary, #ffffff);
    font-weight: 500;
  }

  .branding {
    fill: var(--color-performance-fg-subtle, rgba(255, 255, 255, 0.2));
    font-size: var(--text-performance-caption, 0.75rem);
  }

  .caption {
    fill: var(--color-performance-fg-muted, rgba(255, 255, 255, 0.46));
    font-size: var(--text-performance-caption, 0.75rem);
  }
</style>
