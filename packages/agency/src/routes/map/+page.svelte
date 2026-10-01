<script lang="ts">
  import { ArrowUpRight, PencilLine, Workflow, ShieldCheck } from 'lucide-svelte';
  import { Button, PerformanceConversionHandoff, PerformancePageSection, SEO } from '@create-something/canon';
  import AgencyMapHero from '$lib/components/AgencyMapHero.svelte';
  import WorkflowSignalBand from '$lib/components/WorkflowSignalBand.svelte';
  import { page } from '$app/stores';
  import { PUBLIC_PRICING } from '$lib/data/publicPricing';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const initialIntegrationName = $derived($page.url.searchParams.get('source') === 'integration-catalog' ? $page.url.searchParams.get('integration_name') : null);
  const drawHref = 'https://draw.createsomething.agency/';
  const mappingSteps = [
    { icon: PencilLine, label: '01 / Sketch', title: 'Start with the work.', detail: 'Name the task, the people involved, and the result you need.' },
    { icon: Workflow, label: '02 / Connect', title: 'Make the handoffs visible.', detail: 'Connect the steps and tools. Mark where information moves or work gets stuck.' },
    { icon: ShieldCheck, label: '03 / Review', title: 'Decide who does what.', detail: 'Mark what AI may do, where a person approves, and how you will check the result.' }
  ];
</script>

<SEO
  title="CREATE SOMETHING Map | Workflow Mapping with Draw"
  description="Map the work before you automate it. Use Draw, the canvas built by CREATE SOMETHING, to sketch steps, tools, people, and approvals."
  keywords="workflow mapping, CREATE SOMETHING Draw, mapping session, workflow design"
  propertyName="agency"
/>

<main class="map-page">
  <AgencyMapHero />
  <WorkflowSignalBand proofHref="/#built-work" />

  <PerformancePageSection
    id="canvas"
    variant="white"
    eyebrow="Draw / Working canvas"
    title="The canvas we use for mapping."
    description="Draw is a freeform canvas developed by CREATE SOMETHING. Use notes, shapes, and connectors to make a workflow visible. You can work by hand or connect an agent through Draw."
  >
    {#snippet after()}
      {#if initialIntegrationName}
        <p class="mapping-boundary">Mapping context: {initialIntegrationName}. Add its role and handoffs to your drawing. Account access is agreed separately.</p>
      {/if}
      <p class="mapping-boundary">{PUBLIC_PRICING.map.publicStarterLabel} · Use Draw below to explore the workflow.</p>
      <ol class="mapping-steps" aria-label="How we map a workflow">
        {#each mappingSteps as step}
          <li>
            <div class="step-label"><step.icon size={20} strokeWidth={1.5} aria-hidden="true" /><span>{step.label}</span></div>
            <h3>{step.title}</h3>
            <p>{step.detail}</p>
          </li>
        {/each}
      </ol>
      <div class="draw-workbench">
        <div class="draw-toolbar">
          <span class="draw-label"><PencilLine size={18} aria-hidden="true" /> CREATE SOMETHING / DRAW</span>
          <a href={drawHref} target="_blank" rel="noreferrer">Open full canvas <ArrowUpRight size={18} aria-hidden="true" /></a>
        </div>
        <iframe src="https://draw.createsomething.agency/?embed=agency" title="Draw — CREATE SOMETHING workflow mapping canvas" loading="lazy" allow="clipboard-write"></iframe>
        <p class="draw-note">Draw saves drafts in this browser. Export a copy to keep it; publishing a view-only link is a separate action in Draw. If the embedded canvas cannot load or save, use <a href={drawHref} target="_blank" rel="noreferrer">Draw in its own tab</a>.</p>
      </div>
      <p class="mapping-boundary">Start with workflow context. Keep credentials and private customer records out of a public mapping exercise.</p>
    {/snippet}
  </PerformancePageSection>

  <PerformanceConversionHandoff
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
</main>

<style>
  .map-page :global(.clear-page-section) { padding-block: clamp(2.5rem, 6vw, 6rem); }
  .map-page :global(.clear-page-section__inner) { width: 86%; max-width: none; }
  .map-page :global(.clear-page-section h2) { font: var(--font-performance-medium) clamp(1.8rem, 3vw, 3rem)/1.1 var(--font-performance-interface); max-width: 24ch; }
  .map-page :global(.performance-conversion-handoff) { padding: clamp(2.5rem, 6vw, 6rem) 7vw; gap: var(--space-performance-xl); grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); }
  .map-page :global(.performance-conversion-handoff .performance-conversion-handoff__copy),
  .map-page :global(.performance-conversion-handoff .performance-conversion-handoff__boundary) { padding: 0; min-height: auto; }
  .map-page :global(.performance-conversion-handoff h2) { font: var(--font-performance-medium) clamp(1.8rem, 3vw, 3rem)/1.1 var(--font-performance-interface); max-width: 24ch; }
  .map-page :global(.performance-conversion-handoff .performance-conversion-handoff__boundary) {
    align-self: start;
    align-content: start;
    padding: var(--space-performance-md);
    gap: 0;
    border: 1px solid var(--color-performance-shell-border-strong);
    border-radius: var(--radius-operator-panel);
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

  @media (max-width: 720px) { .map-page :global(.performance-conversion-handoff) { grid-template-columns: 1fr; gap: var(--space-performance-lg); } }

  .mapping-steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); list-style: none; padding: 0; margin: 0 0 var(--space-performance-lg); border-block: 1px solid var(--color-performance-line); }
  .mapping-steps li { padding: var(--space-performance-md); }
  .mapping-steps li + li { border-left: 1px solid var(--color-performance-line); }
  .step-label { display: flex; align-items: center; gap: var(--space-performance-sm); font: var(--text-performance-caption) var(--font-performance-mono); text-transform: uppercase; }
  .mapping-steps h3 { margin: var(--space-performance-md) 0 var(--space-performance-sm); font-size: var(--text-performance-body); }
  .mapping-steps p { margin: 0; line-height: 1.6; }
  .draw-workbench { border: 1px solid var(--color-performance-line); background: var(--color-performance-paper); }
  .draw-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-performance-sm); padding: var(--space-performance-sm) var(--space-performance-md); color: var(--color-performance-ink); border-bottom: 1px solid var(--color-performance-line); }
  .draw-label { display: inline-flex; align-items: center; gap: var(--space-performance-sm); font: var(--text-performance-caption) var(--font-performance-mono); }
  .draw-toolbar a { display: inline-flex; align-items: center; gap: var(--space-performance-sm); min-height: 44px; }
  .draw-workbench iframe { display: block; width: 100%; height: clamp(600px, 78vh, 900px); border: 0; background: var(--color-performance-ink); }
  .draw-note { margin: 0; padding: var(--space-performance-md); font-size: var(--text-performance-caption); line-height: 1.6; color: var(--color-performance-ink); border-top: 1px solid var(--color-performance-line); }
  .mapping-boundary { max-width: 70ch; margin: var(--space-performance-md) 0; font-size: var(--text-performance-caption); line-height: 1.6; }
  a { color: inherit; text-underline-offset: .25em; }
  a:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; }
  @media (max-width: 760px) {
    .mapping-steps { grid-template-columns: 1fr; }
    .mapping-steps li + li { border-left: 0; border-top: 1px solid var(--color-performance-line); }
    .draw-workbench iframe { height: 680px; }
  }
</style>
