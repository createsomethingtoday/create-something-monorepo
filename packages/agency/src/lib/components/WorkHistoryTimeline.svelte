<script lang="ts">
  import { Timeline } from '@create-something/canon/diagrams';
  import { workHistory, workHistoryMilestones } from '$lib/data/workHistory';

  type TimelineConfig = {
    title?: string;
    subtitle?: string;
    property?: 'agency' | 'io' | 'space' | 'ltd';
    branded?: boolean;
    width?: number;
    height?: number;
  };

  const config: TimelineConfig = {
    title: 'Timeline',
    subtitle: 'Tools to abstract complexity (and understanding the complexity)',
    property: 'agency',
    branded: true,
    width: 980,
    height: 340
  };
</script>

<div class="work-history">
  <div class="milestones" aria-label="Milestones timeline">
    <div class="milestones-inner">
      <Timeline data={workHistoryMilestones} {config} />
    </div>
  </div>

  <ol class="timeline-list">
    {#each workHistory as item}
      <li class="timeline-item">
        <div class="timeline-rail" aria-hidden="true">
          <div class="timeline-dot"></div>
        </div>
        <div class="timeline-body">
          <p class="timeline-date">{item.date}</p>
          <h3 class="timeline-title">
            {item.role}
            <span class="timeline-org">· {item.org}</span>
          </h3>
          {#if item.subtitle}
            <p class="timeline-subtitle">{item.subtitle}</p>
          {/if}
          <ul class="timeline-bullets">
            {#each item.bullets as b}
              <li>
                <strong>{b.label}:</strong>
                {b.text}
              </li>
            {/each}
          </ul>
        </div>
      </li>
    {/each}
  </ol>
</div>

<style>
  .work-history {
    display: grid;
    gap: 1rem;
    margin-top: 0;
  }

  .milestones {
    overflow: hidden;
    margin-bottom: 0.5rem;
    border: 1px solid var(--color-performance-line-strong, #9c9c96);
    border-radius: var(--radius-performance-md, 4px);
    background:
      linear-gradient(90deg, rgba(10, 14, 25, 0.035) 1px, transparent 1px) 0 0 / 3rem 3rem,
      var(--color-performance-panel, #ffffff);
    --color-bg-pure: transparent;
    --color-bg-subtle: var(--color-performance-panel, #ffffff);
    --color-fg-primary: var(--color-performance-ink, #090909);
    --color-fg-secondary: var(--color-performance-muted, #5e6268);
    --color-fg-muted: var(--color-performance-muted, #5e6268);
    --color-fg-tertiary: var(--color-performance-muted, #5e6268);
    --color-fg-subtle: var(--color-performance-line-strong, #9c9c96);
    --color-border-default: var(--color-performance-line, #d7d7d2);
    --color-border-emphasis: var(--color-performance-line-strong, #9c9c96);
  }

  .milestones-inner {
    padding: 0.85rem;
    overflow-x: auto;
    overflow-y: hidden;
    max-width: 100%;
    overscroll-behavior-x: contain;
  }

  .milestones-inner :global(svg.diagram.timeline) {
    width: max(100%, 760px);
    height: auto;
    display: block;
  }

  .timeline-list {
    position: relative;
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .timeline-list::before {
    content: '';
    position: absolute;
    top: 0.75rem;
    bottom: 0.75rem;
    left: 0.68rem;
    width: 1px;
    background: var(--color-performance-line-strong, #9c9c96);
    z-index: 0;
  }

  .timeline-list::after {
    content: '';
    position: absolute;
    top: 0.75rem;
    bottom: 0.75rem;
    left: 0.68rem;
    width: 1px;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      var(--color-performance-signal-soft, #dce8f5) 45%,
      var(--color-performance-growth-soft, #dcece5) 70%,
      transparent 100%
    );
    z-index: 1;
  }

  .timeline-item {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: 1.4rem minmax(0, 1fr);
    gap: 0.85rem;
    align-items: start;
  }

  .timeline-dot {
    position: relative;
    z-index: 3;
    width: 0.78rem;
    height: 0.78rem;
    margin: 0.85rem auto 0;
    border: 2px solid var(--color-performance-ink, #090909);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-signal-soft, #dce8f5);
  }

  .timeline-body {
    min-width: 0;
    padding: 1rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-ink, #090909);
  }

  .timeline-date {
    margin: 0 0 0.55rem;
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-mono);
    font-size: 0.76rem;
    line-height: 1.15;
  }

  .timeline-title {
    margin: 0 0 0.5rem;
    color: var(--color-performance-ink, #090909);
    font-size: 1.12rem;
    font-weight: var(--font-medium);
    line-height: 1.2;
    letter-spacing: 0;
  }

  .timeline-org {
    color: var(--color-performance-muted, #5e6268);
    font-weight: var(--font-regular, 400);
  }

  .timeline-subtitle {
    margin: 0 0 0.85rem;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.92rem;
    line-height: 1.52;
    overflow-wrap: anywhere;
  }

  .timeline-bullets {
    display: grid;
    gap: 0.46rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .timeline-bullets li {
    padding-top: 0.46rem;
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.9rem;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .timeline-bullets strong {
    color: var(--color-performance-ink, #090909);
    font-weight: var(--font-medium);
  }

  @media (max-width: 640px) {
    .milestones-inner {
      padding: 0.75rem;
    }
  }
</style>
