<script lang="ts">
  import AgencyWayfindingSign from '$lib/components/AgencyWayfindingSign.svelte';
  import { page } from '$app/stores';
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceConversionHandoff,
    PerformancePageSection,
    PerformanceThesisConditions,
    SEO,
    type PerformanceCondition
  } from '@create-something/canon';
  import PublicAtlasCanvas from '$lib/components/PublicAtlasCanvas.svelte';
  import SystemContextRail from '$lib/components/SystemContextRail.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { playbookHeroMedia, playbookMapSectionMedia } from '$lib/data/playbookHeroMedia';
  import { PUBLIC_PRICING } from '$lib/data/publicPricing';

  const mapProtocol: PerformanceCondition[] = [
    {
      label: 'Input',
      title: 'Prospect map only',
      detail: 'The public canvas receives workflow context, never credentials or private records.',
      tone: 'signal'
    },
    {
      label: 'Boundary',
      title: 'No production tools',
      detail: 'The agent can edit the prospect map and nothing beyond it.',
      tone: 'pressure'
    },
    {
      label: 'Handoff',
      title: 'Summary + context',
      detail: 'A named map and readiness state travel into the booking path.',
      tone: 'growth'
    }
  ];
</script>

<SEO
  title="CREATE SOMETHING Map | Workflow Mapping"
  description="Plan one task before you automate it. Map the steps, tools, people, and approvals, then use the plan to guide a build."
  keywords="workflow mapping product, human agent workflow, workflow definition, AI workflow map"
  propertyName="agency"
/>

<main class="map-page">
  <PerformanceCampaignOpening
    eyebrow="CREATE SOMETHING Map"
    expression="editorial"
    title="Plan the task before you automate it."
    lede={`Map shows how work moves between people and tools. Use it to decide where AI can help and where a person needs to approve. Start with the ${PUBLIC_PRICING.map.publicStarterLabel} without touching production. A short summary can travel to a mapping session.`}
    density="compact"
    media={playbookHeroMedia.map}
    mediaMobilePlacement="background"
    proof={[
      { label: 'Input', value: 'Prospect map' },
      { label: 'Boundary', value: 'No production tools' },
      { label: 'Handoff', value: 'Build or Control' }
    ]}
  >
    {#snippet actions()}
      <Button href="#canvas">Open private draft</Button>
      <Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
        {agencyCoreMessaging.bookMappingSessionLabel}
      </Button>
    {/snippet}
  </PerformanceCampaignOpening>

  <PerformanceThesisConditions
    eyebrow="Mapping protocol"
    title="Decide who does what."
    description="Record the person responsible, what AI may do, when it should stop, and how you will check the result."
    conditions={mapProtocol}
    ariaLabel="Public workflow mapping protocol"
  />

  <PerformancePageSection
    id="canvas"
    variant="white"
    eyebrow="Private workflow draft"
    title="Map one real workflow before you connect AI to it."
    description="Start with a blank canvas or an industry example. Add the steps, tools, and people involved. The draft stays in this browser and never connects to live systems. You can choose to bring a summary to a mapping session."
  >
    {#snippet after()}
      <figure class="map-overhead-study">
        <picture>
          {#if playbookMapSectionMedia.mobileSrc}
            <source media="(max-width: 47.99rem)" srcset={playbookMapSectionMedia.mobileSrc} />
          {/if}
          <img
            src={playbookMapSectionMedia.src}
            alt={playbookMapSectionMedia.alt}
            width={playbookMapSectionMedia.width}
            height={playbookMapSectionMedia.height}
            loading="lazy"
            decoding="async"
            data-campaign-media="map-overhead-study"
          />
        </picture>
      </figure>
      <SystemContextRail />
      <PublicAtlasCanvas
        bookingHref="/book"
        initialIntegration={$page.url.searchParams.get('source') === 'integration-catalog'
          ? ($page.url.searchParams.get('integration') ?? '')
          : ''}
        initialIntegrationName={$page.url.searchParams.get('source') === 'integration-catalog'
          ? ($page.url.searchParams.get('integration_name') ?? '')
          : ''}
      />
    {/snippet}
  </PerformancePageSection>

  <aside class="route-handoff" aria-label="Map next steps">
    <div class="route-handoff__inner">
      <p class="route-handoff__current">Current path · Map · public draft</p>
      <p class="route-handoff__context">When the plan is ready, agree on the work to build. Build and Control are separate options; Control includes Map.</p>
      <a class="route-handoff__return" href="/products#choose-product"><span aria-hidden="true">←</span> Compare paths</a>
      <div class="route-handoff__links">
        <AgencyWayfindingSign kind="build" label="Explore Agent Foundation" href="/agent-foundation" detail="Implementation is scoped separately." />
        <AgencyWayfindingSign kind="control" label="Explore Control" href="/control" detail="Optional operations after launch." />
      </div>
    </div>
  </aside>

  <PerformanceConversionHandoff
    expression="editorial"
    eyebrow="Continue the definition"
    title="Save the plan or talk it through."
    description={`The browser draft is a starting point. It is separate from a saved Map workspace. The separate workspace is ${PUBLIC_PRICING.map.workspaceLabel}. The workspace adds version history, review, sharing, export, and a handover for Build. You can also bring your draft summary to a mapping session first.`}
    density="compact"
    handoff={{
      owner: 'Workflow owner',
      authority: 'Human approval',
      proof: 'Map + versions + review record',
      state: 'review'
    }}
  >
    {#snippet actions()}
      <Button href="/map/workspace">Open CREATE SOMETHING Map</Button>
      <Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
        {agencyCoreMessaging.bookMappingSessionLabel}
      </Button>
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
  .route-handoff__return { display: inline-flex; align-items: center; gap: var(--space-performance-sm); min-height: 44px; margin-bottom: var(--space-performance-sm); color: inherit; text-underline-offset: .25em; }
  .route-handoff__return:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; }
  .route-handoff__links { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-performance-sm); }
  @media (max-width: 760px) { .route-handoff__links { grid-template-columns: 1fr; } }

  .map-overhead-study {
    margin: 0;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--color-performance-paper, #f4efe7) 18%, transparent);
    background: #121310;
  }

  .map-overhead-study picture,
  .map-overhead-study img {
    display: block;
    width: 100%;
  }

  .map-overhead-study img {
    aspect-ratio: 3 / 2;
    object-fit: cover;
  }

  @media (max-width: 47.99rem) {
    .map-overhead-study img {
      aspect-ratio: 2 / 3;
    }
  }
</style>
