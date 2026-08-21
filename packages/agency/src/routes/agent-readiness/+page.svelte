<script lang="ts">
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

  <PerformanceConversionHandoff
    expression="editorial"
    eyebrow="The boundary"
    title={studyVariant.handoff.title}
    description={studyVariant.handoff.description}
    handoff={agentReadinessStudyHandoff}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.agentReadinessAuditBookingHref}>Book the audit</Button>
    {/snippet}
  </PerformanceConversionHandoff>
</main>

<style>
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
