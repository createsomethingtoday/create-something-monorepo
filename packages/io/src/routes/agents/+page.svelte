<script lang="ts">
  import type { PageData } from './$types';
  import TrustCatalog from '$lib/components/catalog/TrustCatalog.svelte';

  let { data }: { data: PageData } = $props();
  let { cards, statuses } = $derived(data);
</script>

<svelte:head>
  <title>Public Agent Trust Catalog | CREATE SOMETHING</title>
  <meta
    name="description"
    content="Owned public trust cards for CREATE SOMETHING agents, with access model, evidence, observability labels, and publication state."
  />
  <link rel="canonical" href="https://createsomething.io/agents" />

  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://createsomething.io/agents" />
  <meta property="og:title" content="Public Agent Trust Catalog | CREATE SOMETHING" />
  <meta property="og:description" content="Canonical CREATE SOMETHING public agent trust cards." />
  <meta property="og:image" content="https://createsomething.io/og-image.png" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Public Agent Trust Catalog" />
  <meta name="twitter:description" content="Canonical CREATE SOMETHING public agent trust cards." />
  <meta name="twitter:image" content="https://createsomething.io/og-image.png" />

  {@html `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'CREATE SOMETHING Public Agent Trust Catalog',
    description: 'Owned public trust cards for CREATE SOMETHING agents',
    url: 'https://createsomething.io/agents',
    numberOfItems: cards.length,
    itemListElement: cards.map((card, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'SoftwareApplication',
        name: card.name,
        description: card.description,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Any',
        url: `https://createsomething.io/agents/${card.slug}`
      }
    }))
  })}<\/script>`}
</svelte:head>

<TrustCatalog
  kind="agents"
  {cards}
  {statuses}
  description="Choose an owned public agent by its access boundary, evaluation state, and sanitized operating evidence."
  summary={[
    { label: 'Audience', value: 'Public only' },
    { label: 'Write policy', value: 'None for V1' },
    { label: 'Client agents', value: 'Excluded' }
  ]}
/>
