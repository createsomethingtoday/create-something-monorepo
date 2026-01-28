<script lang="ts">
  import type { DiagramConfig, TimelineData } from './types.js';

  interface Props {
    data: TimelineData;
    config?: DiagramConfig;
  }

  let { data, config = {} }: Props = $props();

  const {
    width = 900,
    height = 300,
    title,
    subtitle,
    property = 'io',
    branded = false,
  } = config;

  const { events, orientation = 'horizontal' } = data;

  const PADDING = 42;
  const titleHeight = (title ? 32 : 0) + (subtitle ? 24 : 0);

  // Layout calculations
  const isHorizontal = orientation === 'horizontal';
  const lineY = height / 2;
  const lineStartX = PADDING + 60;
  const lineEndX = width - PADDING - 60;
  const eventSpacing = (lineEndX - lineStartX) / (events.length - 1 || 1);

  const layoutedEvents = events.map((event, i) => {
    const x = lineStartX + i * eventSpacing;
    const alternateY = i % 2 === 0;
    const labelY = alternateY ? lineY - 50 : lineY + 50;

    return {
      ...event,
      x,
      labelY,
      alternateY,
    };
  });
</script>

<svg
  {width}
  {height}
  viewBox="0 0 {width} {height}"
  class="diagram timeline"
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

  {#if isHorizontal}
    <!-- Main line -->
    <line x1={lineStartX} y1={lineY} x2={lineEndX} y2={lineY} class="timeline-line" />

    <!-- Events -->
    {#each layoutedEvents as event}
      <!-- Marker -->
      <circle
        cx={event.x}
        cy={lineY}
        r={event.highlight ? 8 : 6}
        class="marker"
        class:highlight={event.highlight}
      />

      <!-- Connector -->
      <line
        x1={event.x}
        y1={lineY + (event.alternateY ? -10 : 10)}
        x2={event.x}
        y2={event.labelY + (event.alternateY ? 30 : -30)}
        class="connector"
      />

      <!-- Date -->
      <text
        x={event.x}
        y={event.labelY}
        class="event-date"
        text-anchor="middle"
        dominant-baseline={event.alternateY ? 'auto' : 'hanging'}
      >
        {event.date}
      </text>

      <!-- Label -->
      <text
        x={event.x}
        y={event.labelY + (event.alternateY ? 16 : -16)}
        class="event-label"
        text-anchor="middle"
        dominant-baseline={event.alternateY ? 'hanging' : 'auto'}
      >
        {event.label}
      </text>

      <!-- Description -->
      {#if event.description}
        <text
          x={event.x}
          y={event.labelY + (event.alternateY ? 34 : -34)}
          class="event-description"
          text-anchor="middle"
          dominant-baseline={event.alternateY ? 'hanging' : 'auto'}
        >
          {event.description}
        </text>
      {/if}
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

  .subtitle {
    fill: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
    font-size: var(--text-body-sm, 0.875rem);
  }

  .timeline-line {
    stroke: var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
    stroke-width: 2;
  }

  .marker {
    fill: var(--color-bg-subtle, #1a1a1a);
    stroke: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
    stroke-width: 2;
    transition: r 0.2s ease;
  }

  .marker.highlight {
    fill: var(--color-fg-primary, #ffffff);
  }

  .marker:hover {
    r: 10;
  }

  .connector {
    stroke: var(--color-border-default, rgba(255, 255, 255, 0.1));
    stroke-width: 1;
  }

  .event-date {
    fill: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
    font-size: var(--text-caption, 0.75rem);
  }

  .event-label {
    fill: var(--color-fg-primary, #ffffff);
    font-size: var(--text-body-sm, 0.875rem);
    font-weight: 500;
  }

  .event-description {
    fill: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
    font-size: var(--text-caption, 0.75rem);
  }

  .branding {
    fill: var(--color-fg-subtle, rgba(255, 255, 255, 0.2));
    font-size: var(--text-caption, 0.75rem);
  }
</style>
