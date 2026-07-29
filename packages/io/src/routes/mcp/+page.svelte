<script lang="ts">
  import type { PageData } from './$types';
  import TrustCatalog from '$lib/components/catalog/TrustCatalog.svelte';

  let { data }: { data: PageData } = $props();
  let { cards, statuses } = $derived(data);
</script>

<svelte:head>
  <title>Public MCP Trust Catalog | CREATE SOMETHING</title>
  <meta
    name="description"
    content="Owned public trust cards for CREATE SOMETHING MCP servers, with access model, evidence, observability labels, and install snippets."
  />
  <link rel="canonical" href="https://createsomething.io/mcp" />

  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://createsomething.io/mcp" />
  <meta property="og:title" content="Public MCP Trust Catalog | CREATE SOMETHING" />
  <meta property="og:description" content="Canonical CREATE SOMETHING MCP trust cards." />
  <meta property="og:image" content="https://createsomething.io/og-image.png" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Public MCP Trust Catalog" />
  <meta name="twitter:description" content="Canonical CREATE SOMETHING MCP trust cards." />
  <meta name="twitter:image" content="https://createsomething.io/og-image.png" />

  {@html `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'CREATE SOMETHING Public MCP Trust Catalog',
    description: 'Owned public trust cards for CREATE SOMETHING MCP servers',
    url: 'https://createsomething.io/mcp',
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
        url: `https://createsomething.io/mcp/${card.slug}`
      }
    }))
  })}<\/script>`}
</svelte:head>

<TrustCatalog
  kind="mcp"
  {cards}
  {statuses}
  description="Choose an owned public MCP server by its access model, evaluation state, and sanitized operating evidence."
  summary={[
    { label: 'Access', value: 'Read-only first' },
    { label: 'Evidence', value: 'Sanitized rollups' },
    { label: 'Canonical', value: 'createsomething.io' }
  ]}
/>
