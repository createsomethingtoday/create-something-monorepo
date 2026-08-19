<script lang="ts">
  import type { PageData } from './$types';
  import { ArcDeck, visibleComposition } from '@create-something/arc';
  let { data }: { data: PageData } = $props();
  const routeId = 'app-review-governance-arc';
  const composition = visibleComposition(data.document, routeId);
</script>

<svelte:head><title>{data.document.title} · r{data.document.revision}</title><meta name="robots" content="noindex, nofollow" /></svelte:head>
<main><header><a href="/admin/arcs/app-review-governance">Current Arc</a><span>Immutable version · r{data.document.revision} · {data.document.status}</span></header><ArcDeck {composition} {routeId} enablePresentation assetBaseUrl="https://createsomething.agency" /></main>
<style>main{min-height:100dvh;background:#f3f3f0}header{display:flex;justify-content:space-between;gap:1rem;padding:1rem;border-bottom:1px solid #d7d7d2;background:#fff;font:650 .7rem/1.2 ui-monospace,monospace;text-transform:uppercase}a{color:#090909}</style>
