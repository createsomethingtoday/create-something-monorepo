<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceConversionHandoff,
    PerformanceNarrativeStage,
    SEO,
    type PerformanceNarrativeScene
  } from '@create-something/canon';
  import { getAnalytics } from '@create-something/canon/analytics';
  import PlaybookField from '$lib/components/PlaybookField.svelte';
  import type { HighIntentSearchLanding } from '$lib/data/highIntentSearch';

  interface Props {
    landing: HighIntentSearchLanding;
  }

  let { landing }: Props = $props();

  function trackHighIntentSearchDraftStart() {
    getAnalytics()?.conversion(landing.primaryConversionEvent, {
      campaignSurface: 'agency-high-intent-search',
      campaignIntent: landing.intent,
      campaignPath: landing.path,
      destination: landing.primaryCtaHref
    });
  }
</script>

<SEO
  title={landing.seoTitle}
  description={landing.seoDescription}
  keywords={landing.keywords}
  propertyName="agency"
  noindex={landing.noindex}
/>

<main class="high-intent-search property-performance" data-search-intent={landing.intent}>
  <PerformanceCampaignOpening
    eyebrow={landing.eyebrow}
    propertyRole="Forward-deployed AI operations"
    expression="editorial"
    title={landing.headline}
    lede={landing.lede}
    proof={landing.proof}
    density="compact"
    artifactOwnsMedia
    artifactMobilePlacement="flow"
  >
    {#snippet actions()}
      <Button href={landing.primaryCtaHref} size="lg" onclick={trackHighIntentSearchDraftStart}>
        {landing.primaryCtaLabel}
      </Button>
      <Button href={landing.secondaryCtaHref} variant="secondary">
        {landing.secondaryCtaLabel}
      </Button>
    {/snippet}
    {#snippet artifact()}
      <PlaybookField variant={landing.playbookVariant} embedded />
    {/snippet}
  </PerformanceCampaignOpening>

  <PerformanceNarrativeStage
    id={`${landing.intent}-boundary`}
    eyebrow={landing.stage.eyebrow}
    title={landing.stage.title}
    description={landing.stage.description}
    scenes={landing.stage.scenes}
    ariaLabel={`${landing.eyebrow} operating boundary`}
    expression="editorial"
  >
    {#snippet artifact(scene: PerformanceNarrativeScene)}
      <div class="intent-receipt" data-tone={scene.tone}>
        <span>Operating readback</span>
        <strong>{scene.summary}</strong>
        {#if scene.evidence?.length}
          <ul aria-label={`${scene.label} evidence`}>
            {#each scene.evidence as item}<li>{item}</li>{/each}
          </ul>
        {:else if scene.receipts?.length}
          <ul aria-label={`${scene.label} receipts`}>
            {#each scene.receipts as item}<li>{item}</li>{/each}
          </ul>
        {/if}
      </div>
    {/snippet}
  </PerformanceNarrativeStage>

  <PerformanceConversionHandoff
    eyebrow={landing.handoff.eyebrow}
    title={landing.handoff.title}
    description={landing.handoff.description}
    handoff={{
      owner: landing.handoff.owner,
      authority: landing.handoff.authority,
      proof: landing.handoff.proof,
      state: landing.handoff.state
    }}
    steps={landing.handoff.steps}
    expression="editorial"
    density="concise"
  >
    {#snippet actions()}
      <Button href={landing.primaryCtaHref} size="lg" onclick={trackHighIntentSearchDraftStart}>
        {landing.primaryCtaLabel}
      </Button>
    {/snippet}
  </PerformanceConversionHandoff>
</main>

<style>
  .high-intent-search {
    background: var(--color-performance-panel, #fff);
  }

  .intent-receipt {
    display: grid;
    gap: 0.8rem;
    min-height: 13rem;
    align-content: end;
    padding: clamp(1.25rem, 3vw, 2.25rem);
    border: 1px solid var(--color-performance-line-strong, #9c9c96);
    background:
      linear-gradient(90deg, rgba(10, 14, 25, 0.045) 1px, transparent 1px) 0 0 / 3rem 3rem,
      var(--color-performance-panel, #fff);
  }

  .intent-receipt > span {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
  }

  .intent-receipt > strong {
    max-width: 18ch;
    font-size: clamp(1.8rem, 3vw, 3rem);
    font-weight: var(--font-performance-medium, 500);
    letter-spacing: -0.025em;
    line-height: 1;
  }

  .intent-receipt ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .intent-receipt li {
    padding: 0.45rem 0.6rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
  }

  .intent-receipt[data-tone='block'] {
    border-top: 4px solid var(--color-performance-risk, #c62026);
  }

  .intent-receipt[data-tone='allow'] {
    border-top: 4px solid var(--color-performance-growth, #007a4d);
  }

  .intent-receipt[data-tone='review'] {
    border-top: 4px solid var(--color-performance-pressure, #e54800);
  }
</style>
