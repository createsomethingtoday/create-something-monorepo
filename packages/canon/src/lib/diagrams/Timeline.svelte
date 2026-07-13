<script lang="ts">
  import type { DiagramConfig, TimelineData } from './types.js';

  interface Props {
    data: TimelineData;
    config?: DiagramConfig;
  }

  let { data, config = {} }: Props = $props();
  const width = $derived(config.width ?? 900);
  const height = $derived(config.height ?? 300);
  const title = $derived(config.title);
  const subtitle = $derived(config.subtitle);
  const property = $derived(config.property ?? 'io');
  const branded = $derived(config.branded ?? false);

  const events = $derived(data.events);
  const orientation = $derived(data.orientation ?? 'horizontal');

  const PADDING = 42;

  // Layout calculations
  const isHorizontal = $derived(orientation === 'horizontal');
  const lineY = $derived(height / 2);
  const lineStartX = $derived(PADDING + 60);
  const lineEndX = $derived(width - PADDING - 60);
  const eventSpacing = $derived((lineEndX - lineStartX) / (events.length - 1 || 1));

  const layoutedEvents = $derived(
    events.map((event, i) => {
      const x = lineStartX + i * eventSpacing;
      const alternateY = i % 2 === 0;
      // Give labels/descriptions more breathing room from the center line so
      // marker-adjacent text doesn't feel cramped.
      const labelY = alternateY ? lineY - 70 : lineY + 70;

      return {
        ...event,
        x,
        labelY,
        alternateY,
      };
    })
  );
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

  .timeline-line {
    stroke: var(--color-performance-border-emphasis, rgba(255, 255, 255, 0.2));
    stroke-width: 2;
  }

  .marker {
    fill: var(--color-performance-bg-subtle, #1a1a1a);
    stroke: var(--color-performance-fg-secondary, rgba(255, 255, 255, 0.8));
    stroke-width: 2;
    transition: r 0.2s ease;
  }

  .marker.highlight {
    fill: var(--color-performance-fg-primary, #ffffff);
  }

  .marker:hover {
    r: 10;
  }

  .connector {
    stroke: var(--color-performance-border-default, rgba(255, 255, 255, 0.1));
    stroke-width: 1;
  }

  .event-date {
    fill: var(--color-performance-fg-muted, rgba(255, 255, 255, 0.46));
    font-size: var(--text-performance-caption, 0.75rem);
  }

  .event-label {
    fill: var(--color-performance-fg-primary, #ffffff);
    font-size: var(--text-performance-body-sm, 0.875rem);
    font-weight: 500;
  }

  .event-description {
    fill: var(--color-performance-fg-tertiary, rgba(255, 255, 255, 0.6));
    font-size: var(--text-performance-caption, 0.75rem);
  }

  .branding {
    fill: var(--color-performance-fg-subtle, rgba(255, 255, 255, 0.2));
    font-size: var(--text-performance-caption, 0.75rem);
  }
</style>
