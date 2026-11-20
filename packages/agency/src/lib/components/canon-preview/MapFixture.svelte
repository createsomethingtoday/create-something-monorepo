<script lang="ts">
  import { Button, PerformanceConversionHandoff } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { PUBLIC_PRICING } from '$lib/data/publicPricing';
  let { proposed = false }: { proposed?: boolean } = $props();
  const scene = { src: '/images/canon-study/04-welcome-clean-plate.png', mobileSrc: '/images/canon-study/welcome-cta-portrait.png', aspectRatio: 1671 / 941, mobileAspectRatio: 941 / 1672 };
</script>
<div class="map-page">
  <PerformanceConversionHandoff
    background={proposed ? scene : undefined}
    expression="editorial"
    eyebrow="From map to build"
    title="Bring the workflow. Decide the next step."
    description={`Bring an export or a view-only Draw link to a mapping session. Together, we review the handoffs, approvals, and scope before agreeing on what to build. The separate saved Map workspace offers version history and review: ${PUBLIC_PRICING.map.workspaceLabel}.`}
    density="compact"
    handoff={{ owner: 'Workflow owner', authority: 'Human approval', proof: 'Workflow map', state: 'review' }}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.workflowMappingSessionHref}>{agencyCoreMessaging.bookMappingSessionLabel}</Button>
      <Button href="/map/workspace" variant="secondary">Open saved Map workspace</Button>
    {/snippet}
  </PerformanceConversionHandoff>
</div>
<style>
  .map-page :global(.performance-conversion-handoff:not([data-background='scene'])) { padding: clamp(2.5rem, 6vw, 6rem) 7vw; gap: var(--space-performance-xl); grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); }
  .map-page :global(.performance-conversion-handoff .performance-conversion-handoff__copy),
  .map-page :global(.performance-conversion-handoff .performance-conversion-handoff__boundary) { padding: 0; min-height: auto; }
  .map-page :global(.performance-conversion-handoff h2) { font: var(--font-performance-medium) clamp(1.8rem, 3vw, 3rem)/1.1 var(--font-performance-interface); max-width: 24ch; }
  .map-page :global(.performance-conversion-handoff .performance-conversion-handoff__boundary) {
    align-self: start;
    align-content: start;
    padding: var(--space-performance-md);
    gap: 0;
    border: 1px solid var(--color-performance-shell-border-strong);
    border-radius: var(--radius-performance-scale-lg);
    background: var(--color-performance-shell-surface);
    color: var(--color-performance-fg-primary);
  }
  .map-page :global(.performance-conversion-handoff__boundary dl) { border-top: 0; }
  .map-page :global(.performance-conversion-handoff__boundary dl > div) {
    padding-block: var(--space-performance-md);
    border-color: var(--color-performance-shell-border-default);
  }
  .map-page :global(.performance-conversion-handoff__boundary dl > div:first-child) { padding-top: 0; }
  .map-page :global(.performance-conversion-handoff__boundary dl > div:last-child) { padding-bottom: 0; border-bottom: 0; }
  .map-page :global(.performance-conversion-handoff__boundary dt) { color: var(--color-performance-fg-secondary); }
  .map-page :global(.performance-conversion-handoff__boundary dd) { color: var(--color-performance-fg-primary); }

  @media (max-width: 720px) { .map-page :global(.performance-conversion-handoff:not([data-background='scene'])) { grid-template-columns: 1fr; gap: var(--space-performance-lg); } }

</style>
