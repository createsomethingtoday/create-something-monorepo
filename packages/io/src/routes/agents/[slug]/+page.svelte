<script lang="ts">
  import CatalogTrustDetail from '$lib/components/catalog/CatalogTrustDetail.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let { card } = $derived(data);

  const url = $derived(`https://createsomething.io/agents/${card.slug}`);
</script>

<svelte:head>
  <title>{card.name} | Agent Trust Card | CREATE SOMETHING</title>
  <meta name="description" content={card.description} />
  <link rel="canonical" href={url} />

  <meta property="og:type" content="article" />
  <meta property="og:url" content={url} />
  <meta property="og:title" content="{card.name} | Agent Trust Card" />
  <meta property="og:description" content={card.description} />
  <meta property="og:image" content="https://createsomething.io/og-image.png" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{card.name} | Agent Trust Card" />
  <meta name="twitter:description" content={card.description} />
  <meta name="twitter:image" content="https://createsomething.io/og-image.png" />

  {@html `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: card.name,
    description: card.description,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    url,
    provider: {
      '@type': 'Organization',
      name: 'CREATE SOMETHING',
      url: 'https://createsomething.io'
    }
  })}<\/script>`}
</svelte:head>

<CatalogTrustDetail kind="agent" {card} />
