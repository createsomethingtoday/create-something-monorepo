<script lang="ts">
  import { Button, PerformanceCampaignOpening } from '@create-something/canon';
  import AgencyWayfindingOpening from '$lib/components/AgencyWayfindingOpening.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  let { proposed = false }: { proposed?: boolean } = $props();
  const scene = { src: '/images/canon-study/01-welcome-bench.png', mobileSrc: '/images/canon-study/welcome-bench-portrait.png', aspectRatio: 1672 / 941, mobileAspectRatio: 941 / 1672 };
</script>
<div class="services-performance property-performance">
  <div class="services-opening">
  <AgencyWayfindingOpening>
  <PerformanceCampaignOpening
    background={proposed ? scene : undefined}
    eyebrow="AI-native technical support"
    expression="editorial"
    title="Bring a workflow, software problem or existing product."
    lede="We diagnose problems in your software and AI workflows, agree on the change, build it, and help your team use the result."
    density="compact"
    artifactMobilePlacement="flow"
    proof={[
      { label: 'Owner', value: 'Named' },
      { label: 'Protected action', value: 'Held' },
      { label: 'Evidence', value: 'Attached' }
    ]}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.membershipInquiryHref}>
        {agencyCoreMessaging.membershipInquiryLabel}
      </Button>
      <Button href={agencyCoreMessaging.servicesMappingSessionHref} variant="secondary">
        {agencyCoreMessaging.bookMappingSessionLabel}
      </Button>
    {/snippet}

  </PerformanceCampaignOpening>
  </AgencyWayfindingOpening>
  </div>

</div>
<style>
  .services-opening :global(.performance-campaign-opening[data-density='compact']) { min-height: 0; }
  .services-opening :global(.performance-campaign-opening[data-expression='editorial'][data-density='compact'] .performance-campaign-opening__content) { padding-bottom: var(--space-performance-xl); }

  @media (min-width: 64rem) {
    .services-opening :global(.performance-campaign-opening[data-expression='editorial'][data-density='compact']:not([data-background='scene'])) {
      grid-template-columns: minmax(0, 49fr) minmax(0, 44fr);
      grid-template-rows: auto auto;
      column-gap: 7%;
      padding: 8.5rem 5% var(--space-performance-xl);
    }
    .services-opening :global(.performance-campaign-opening[data-expression='editorial'][data-density='compact'] .performance-campaign-opening__content) {
      display: contents;
    }
    .services-opening :global(.performance-campaign-opening[data-expression='editorial'][data-density='compact'] .performance-campaign-opening__content header) {
      grid-column: 1;
      grid-row: 1;
      width: 100%;
      align-self: center;
    }
    .services-opening :global(.performance-campaign-opening[data-expression='editorial'][data-density='compact'] .performance-campaign-opening__artifact) {
      position: relative;
      inset: auto;
      grid-column: 2;
      grid-row: 1;
      width: 100%;
      height: auto;
      min-height: 0;
      align-self: center;
    }
    .services-opening :global(.performance-campaign-opening[data-expression='editorial'][data-density='compact'] .performance-campaign-opening__proof) {
      grid-column: 1 / -1;
      grid-row: 2;
      margin-top: var(--space-performance-xl);
    }
  }

</style>
