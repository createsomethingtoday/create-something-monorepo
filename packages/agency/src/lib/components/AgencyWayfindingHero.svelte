<script lang="ts">
  import AgencyIsometricGlyph, { type AgencySignKind } from './AgencyIsometricGlyph.svelte';

  type HeroRoute = 'practice' | 'fieldReports' | 'stack' | 'services';
  type Step = { kind: AgencySignKind; label: string; detail: string };
  type Story = { eyebrow: string; steps: Step[]; note: string };

  let { route }: { route: HeroRoute } = $props();

  const stories: Record<HeroRoute, Story> = {
    practice: {
      eyebrow: 'Practice route',
      steps: [
        { kind: 'map', label: 'Sample task', detail: 'One workflow to rehearse' },
        { kind: 'approval', label: 'Human review', detail: 'Approval and stop rules' },
        { kind: 'proof', label: 'Draft record', detail: 'Result and limits' }
      ],
      note: 'Practice only · no live access'
    },
    fieldReports: {
      eyebrow: 'Evidence route',
      steps: [
        { kind: 'map', label: 'Source record', detail: 'Named workflow' },
        { kind: 'approval', label: 'Review limits', detail: 'What remains blocked' },
        { kind: 'proof', label: 'Read report', detail: 'Result and unknowns' }
      ],
      note: 'Measured · blocked · unknown'
    },
    stack: {
      eyebrow: 'Ownership route',
      steps: [
        { kind: 'map', label: 'Your accounts', detail: 'Systems and access' },
        { kind: 'approval', label: 'Your decisions', detail: 'Approval authority' },
        { kind: 'proof', label: 'Your records', detail: 'Work history and proof' }
      ],
      note: 'Your team keeps the durable assets'
    },
    services: {
      eyebrow: 'Service route',
      steps: [
        { kind: 'map', label: 'Agreed work', detail: 'One named workstream' },
        { kind: 'approval', label: 'Your approval', detail: 'Consequential decisions wait' },
        { kind: 'proof', label: 'Your handoff', detail: 'Delivered code and records' }
      ],
      note: 'Larger Build and managed Control are scoped separately'
    }
  };

  let story = $derived(stories[route]);
</script>

<div class="wayfinding-hero">
  <div class="wayfinding-hero__head">
    <span>{story.eyebrow}</span>
  </div>
  <div class="wayfinding-hero__route">
    {#each story.steps as step}
      <div class="wayfinding-hero__step">
        <span class="wayfinding-hero__glyph"><AgencyIsometricGlyph kind={step.kind} /></span>
        <strong>{step.label}</strong>
        <span class="wayfinding-hero__detail">{step.detail}</span>
      </div>
    {/each}
  </div>
  <p class="wayfinding-hero__note">{story.note}</p>
</div>

<style>
  .wayfinding-hero {
    box-sizing: border-box;
    display: grid;
    align-content: center;
    gap: var(--space-performance-lg);
    width: 100%;
    height: 100%;
    min-height: 20rem;
    padding: 0;
    color: var(--color-performance-editorial-light, #f3ebe4);
    background: transparent;
  }

  .wayfinding-hero__head,
  .wayfinding-hero__note {
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-label, 0.72rem);
    line-height: 1.4;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .wayfinding-hero__head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: var(--space-performance-sm);
    border-bottom: 1px solid color-mix(in srgb, currentColor 40%, transparent);
  }

  .wayfinding-hero__route {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-performance-sm);
  }

  .wayfinding-hero__step {
    display: grid;
    align-content: start;
    justify-items: start;
    gap: var(--space-performance-xs);
    min-width: 0;
    padding: var(--space-performance-md);
    border: 1px solid color-mix(in srgb, currentColor 55%, transparent);
    background: var(--color-performance-editorial-dark, #181312);
  }

  .wayfinding-hero__glyph {
    display: block;
    width: clamp(3.25rem, 5vw, 5rem);
    margin-block: var(--space-performance-sm);
  }
  .wayfinding-hero__step strong {
    font-size: var(--text-performance-body, 1rem);
  }
  .wayfinding-hero__detail {
    font-size: var(--text-performance-caption, 0.875rem);
    line-height: 1.35;
  }
  .wayfinding-hero__note {
    margin: 0;
    padding-top: var(--space-performance-sm);
    border-top: 1px solid color-mix(in srgb, currentColor 40%, transparent);
  }

  @media (max-width: 63.99rem) {
    .wayfinding-hero {
      min-height: 24rem;
      padding: clamp(1rem, 5vw, 2.5rem);
    }
  }

  @media (max-width: 40rem) {
    .wayfinding-hero {
      gap: var(--space-performance-sm);
      min-height: 0;
      padding-block: var(--space-performance-md);
    }
    .wayfinding-hero__route {
      gap: var(--space-performance-xs);
    }
    .wayfinding-hero__step {
      align-content: center;
      justify-items: center;
      gap: var(--space-performance-xs);
      min-height: 6rem;
      padding: var(--space-performance-xs);
      text-align: center;
    }
    .wayfinding-hero__glyph {
      width: 2.25rem;
      margin: 0;
    }
    .wayfinding-hero__step strong {
      font-size: var(--text-performance-caption, 0.875rem);
      line-height: 1.2;
    }
    .wayfinding-hero__detail {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  }
</style>
