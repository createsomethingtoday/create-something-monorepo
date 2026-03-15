<script lang="ts">
  import { Timeline } from '@create-something/canon/diagrams';
  import { BlurFade } from '@create-something/canon/magicui';
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
  <BlurFade delay={0.1}>
    <div class="milestones" aria-label="Milestones timeline">
      <div class="milestones-inner">
        <Timeline data={workHistoryMilestones} {config} />
      </div>
    </div>
  </BlurFade>

  <ol class="timeline-list">
    {#each workHistory as item}
      <BlurFade delay={0.15}>
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
      </BlurFade>
    {/each}
  </ol>
</div>

<style>
  .work-history {
    margin-top: var(--space-5, 1.5rem);
  }

  /* SVG milestone timeline: make it responsive */
  .milestones {
    border-radius: var(--radius-lg, 14px);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent);
    overflow: hidden;
    margin-bottom: var(--space-6, 2rem);
  }

  .milestones-inner {
    padding: var(--space-3, 0.75rem);
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
    gap: var(--space-6, 2rem);
  }

  /* Global continuous timeline rail */
  .timeline-list::before {
    content: '';
    position: absolute;
    top: 6px; /* align roughly with center of first dot */
    bottom: 0px;
    left: 8px; /* horizontally centered under 18px column */
    width: 2px;
    background: var(--color-border-default);
    opacity: 0.9;
    z-index: 0;
  }

  /* Animated data stream rail */
  .timeline-list::after {
    content: '';
    position: absolute;
    top: 6px;
    bottom: 0px;
    left: 8px;
    width: 2px;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      transparent 60%,
      var(--color-fg-primary) 90%,
      transparent 100%
    );
    background-size: 100% 600px;
    animation: flow-beam 4s infinite linear;
    z-index: 1;
    border-radius: 999px;
  }

  @keyframes flow-beam {
    0% {
      background-position: 0 0px;
    }
    100% {
      background-position: 0 600px;
    }
  }

  .timeline-item {
    position: relative;
    z-index: 2; /* Ensures item body/dots step over the global rail */
    display: grid;
    grid-template-columns: minmax(18px, 18px) minmax(0, 1fr);
    gap: var(--space-4, 1rem);
    align-items: start;
  }

  .timeline-rail {
    position: relative;
    width: 18px;
    display: flex;
    justify-content: center;
  }

  .timeline-dot {
    position: relative;
    z-index: 3;
    width: 10px;
    height: 10px;
    border-radius: 999px;
    margin-top: 6px;
    background: var(--color-bg-subtle);
    border: 2px solid var(--color-fg-muted);
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .timeline-list::after {
      display: none;
    }
  }

  .timeline-body {
    min-width: 0;
    padding: var(--space-4, 1rem);
    border-radius: var(--radius-lg, 14px);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.035), transparent);
  }

  .timeline-date {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    margin-bottom: var(--space-2, 0.5rem);
  }

  .timeline-title {
    font-size: var(--text-h4, 1.125rem);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin: 0 0 var(--space-2, 0.5rem) 0;
    line-height: 1.2;
  }

  .timeline-org {
    color: var(--color-fg-secondary);
    font-weight: var(--font-regular, 400);
  }

  .timeline-subtitle {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-4, 1rem);
    line-height: var(--leading-relaxed);
    overflow-wrap: anywhere;
  }

  .timeline-bullets {
    margin: 0;
    padding-left: 1.2rem;
  }

  .timeline-bullets li {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    line-height: var(--leading-relaxed);
    margin-bottom: var(--space-2, 0.5rem);
    overflow-wrap: anywhere;
  }

  .timeline-bullets li:last-child {
    margin-bottom: 0;
  }

  .timeline-bullets strong {
    color: var(--color-fg-primary);
    font-weight: var(--font-semibold);
  }
</style>
