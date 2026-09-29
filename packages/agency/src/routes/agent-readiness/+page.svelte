<script lang="ts">
  import AgencyWayfindingSign from '$lib/components/AgencyWayfindingSign.svelte';
  import { page } from '$app/stores';
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceConversionHandoff,
    PerformanceNarrativeStage,
    SEO,
    type PerformanceNarrativeScene
  } from '@create-something/canon';
  import PlaybookField from '$lib/components/PlaybookField.svelte';
  import {
    agentReadinessStudyHandoff,
    resolveAgentReadinessStudyVariant
  } from '$lib/data/agentReadinessStudyVariants';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { playbookHeroMedia } from '$lib/data/playbookHeroMedia';

  $: studyVariant = resolveAgentReadinessStudyVariant($page.url.searchParams.get('study'));
</script>

<SEO
  title="AI Buyer Readiness Audit | CREATE SOMETHING"
  description="See what AI buyers understand and get wrong about your business with 25 buyer questions, cited sources, competitive context, and a prioritized 30-day plan."
  keywords="AI buyer readiness audit, AI visibility audit, answer engine readiness, cited AI answers, AI buyer questions"
  propertyName="agency"
/>

<main class="agent-readiness-page">
  <PerformanceCampaignOpening
    eyebrow="AI Buyer Readiness Audit"
    expression="editorial"
    title={studyVariant.hero.title}
    lede={studyVariant.hero.lede}
    density="compact"
    media={playbookHeroMedia.agentReadiness}
    mediaMobilePlacement="background"
    proof={studyVariant.hero.proof}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.agentReadinessAuditBookingHref}>Book the audit</Button>
    {/snippet}
  </PerformanceCampaignOpening>

  <PerformanceNarrativeStage
    id="agent-readiness-audit-story"
    eyebrow="The diagnostic"
    title={studyVariant.diagnostic.title}
    description={studyVariant.diagnostic.description}
    scenes={studyVariant.diagnostic.scenes}
    ariaLabel="AI Buyer Readiness Audit process"
  >
    {#snippet artifact(scene: PerformanceNarrativeScene)}
      {#if scene.id === 'comparison'}
        <PlaybookField variant="agent-readiness" />
      {:else}
        <aside class="audit-record" aria-label={`${scene.label} audit record`}>
          <span>{scene.label}</span>
          <strong>{scene.summary}</strong>
          <p>{scene.detail}</p>
        </aside>
      {/if}
    {/snippet}
  </PerformanceNarrativeStage>

  <aside class="route-handoff" aria-label="AI Buyer Readiness Audit next steps">
    <div class="route-handoff__inner">
      <p class="route-handoff__current">Current path · AI Buyer Readiness Audit · diagnostic</p>
      <p class="route-handoff__context">Next, book the audit to inspect the evidence. If it supports changes, implementation needs a separate scope; ongoing Control is optional.</p>
      <div class="route-handoff__links">
        <AgencyWayfindingSign kind="build" label="Explore implementation services" href="/services" detail="Build is scoped after the findings." />
        <AgencyWayfindingSign kind="control" label="Explore post-launch Control" href="/control" detail="Optional operations; includes Map." />
      </div>
    </div>
  </aside>

  <PerformanceConversionHandoff
    expression="editorial"
    eyebrow="The boundary"
    title={studyVariant.handoff.title}
    description={studyVariant.handoff.description}
    handoff={agentReadinessStudyHandoff}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.agentReadinessAuditBookingHref}>Book the audit</Button>
      <Button href="/services" variant="secondary">Review all services</Button>
    {/snippet}
  </PerformanceConversionHandoff>
</main>

<style>
  .route-handoff {
    padding: var(--space-performance-lg) clamp(1.25rem, 5vw, 6rem);
    color: var(--color-performance-ink);
    background: var(--color-performance-paper);
    border-block: 1px solid var(--color-performance-line);
  }
  .route-handoff__inner { max-width: var(--content-width-performance); margin-inline: auto; }
  .route-handoff__current { margin: 0 0 var(--space-performance-sm); font-size: var(--text-performance-caption); font-family: var(--font-performance-mono); }
  .route-handoff__context { max-width: 70ch; margin: 0 0 var(--space-performance-md); line-height: 1.6; }
  .route-handoff__links { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-performance-sm); }
  @media (max-width: 760px) { .route-handoff__links { grid-template-columns: 1fr; } }

  .audit-record {
    display: grid;
    gap: 0.75rem;
    min-height: 16rem;
    padding: clamp(1.25rem, 3vw, 2rem);
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #fff);
  }

  .audit-record span {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .audit-record strong {
    max-width: 24ch;
    font-size: clamp(1.35rem, 3vw, 2.1rem);
    line-height: 1.05;
  }

  .audit-record p {
    max-width: 54ch;
    margin: auto 0 0;
    color: var(--color-performance-muted, #5e6268);
    line-height: 1.6;
  }
</style>
