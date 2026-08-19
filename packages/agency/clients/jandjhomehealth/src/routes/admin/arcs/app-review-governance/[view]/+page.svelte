<script lang="ts">
  import type { PageData } from './$types';
  import { ArcDeck, ArcStudio, visibleComposition } from '@create-something/arc';

  let { data }: { data: PageData } = $props();
  const routeId = data.view === 'playbook' ? 'app-review-governance-playbook' : data.view === 'runbook' ? 'app-review-governance-runbook' : 'app-review-governance-arc';
  const route = data.document.composition.routes.find((candidate) => candidate.id === routeId);
  const composition = visibleComposition(data.document, routeId);
</script>

<svelte:head><title>{data.view === 'studio' ? 'Arc Studio' : route?.title} | J AND J HOME HEALTH</title><meta name="robots" content="noindex, nofollow" /></svelte:head>

{#if data.view === 'studio'}
  <ArcStudio
    initialDocument={data.document}
    apiEndpoint={`/api/arcs/${data.document.id}`}
    routeId="app-review-governance-arc"
    viewerHref="/admin/arcs/app-review-governance"
    exportBaseUrl={`/api/arcs/${data.document.id}/export`}
    assetBaseUrl="https://createsomething.agency"
    receipts={data.receipts}
  />
{:else}
  <main class="route-view">
    <header><nav><a href="/admin/arcs/app-review-governance">Arc</a><a href="/admin/arcs/app-review-governance/playbook">Playbook</a><a href="/admin/arcs/app-review-governance/runbook">Runbook</a><a href="/admin/arcs/app-review-governance/studio">Studio</a></nav><span>Same map · composed for {data.view}</span></header>
    <ArcDeck
      {composition}
      {routeId}
      title={route?.title}
      description={route?.description}
      ariaLabel={`${route?.title ?? data.view} scenes`}
      assetBaseUrl="https://createsomething.agency"
      enablePresentation
    />
  </main>
{/if}

<style>
  .route-view { min-height: 100dvh; background: #f3f3f0; }
  .route-view > header { display: flex; justify-content: space-between; gap: 1rem; align-items: center; min-height: 3.5rem; padding: .65rem 1rem; border-bottom: 1px solid #d7d7d2; background: #fff; font: 650 .7rem/1.3 ui-monospace, monospace; text-transform: uppercase; }
  nav { display: flex; flex-wrap: wrap; gap: .9rem; }
  a { color: #090909; }
  header span { color: #5e6268; }
  @media (max-width: 42rem) { .route-view > header { align-items: flex-start; flex-direction: column; } }
</style>
