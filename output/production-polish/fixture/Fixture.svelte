<script>
  import Layout from '../../../packages/private-pcn/src/routes/+layout.svelte';
  import Home from '../../../packages/private-pcn/src/routes/+page.svelte';
  import Library from '../../../packages/private-pcn/src/routes/library/+page.svelte';
  import LearningPaths from '../../../packages/private-pcn/src/lib/components/LearningPaths.svelte';
  import ErrorPage from '../../../packages/private-pcn/src/routes/+error.svelte';
  import { page } from './state.svelte';
  const view = page.url.searchParams.get('view') || 'home';
  // Presentation-only input: no provider, identity or production flag is changed.
  const data = { identity: null, impersonation: null, reviewer: false, supportEnabled: false,
    network: null, foundation: null, selfServiceEnabled: true,
    path: null, paths: [], videos: [], canEdit: false };
</script>
{#if view === 'baseline-library'}
  {#await Promise.all([import('./baseline-layout.svelte'), import('./baseline-library.svelte')]) then components}
    {@const BaselineLayout = components[0].default}
    {@const BaselineLibrary = components[1].default}
    <BaselineLayout {data}><BaselineLibrary {data} /></BaselineLayout>
  {/await}
{:else}
<Layout {data}>
  {#if view === 'home'}<Home {data} />
  {:else if view === 'library'}<Library {data} />
  {:else if view === 'error'}<ErrorPage />
  {:else}<LearningPaths {data} />{/if}
</Layout>
{/if}
