<script lang="ts">
  import { Footer } from "@create-something/components";
  import { fly } from 'svelte/transition';
  import { PaperCard } from '@create-something/components';
  import type { PageData } from './$types';

  export let data: PageData;
  const { papers, category } = data;

  const categoryDescriptions: Record<string, string> = {
    automation: 'Learn about automation systems, workflow integrations, and productivity tools. Discover how to build efficient automated solutions.',
    development: 'Modern web development tutorials covering React, Next.js, TanStack, and full-stack development practices.',
    infrastructure: 'Cloud infrastructure, serverless architecture, and edge computing guides. Learn Cloudflare Workers, D1, and modern deployment strategies.',
    webflow: 'Webflow development guides, custom implementations, and no-code solutions for building powerful websites.',
  };

  const description = categoryDescriptions[category.slug] || `Explore our collection of ${papers.length} technical papers on ${category.name}.`;
  const url = `https://createsomething.io/category/${category.slug}`;
</script>

<svelte:head>
  <title>{category.name} Articles | CREATE SOMETHING</title>
  <meta name="description" content={description} />
  <meta name="keywords" content="{category.slug}, technical papers, tutorials, {category.name}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content={url} />
  <meta property="og:title" content="{category.name} Articles | CREATE SOMETHING" />
  <meta property="og:description" content={description} />
  <meta property="og:image" content="https://createsomething.io/og-image.png" />
  <meta property="og:site_name" content="CREATE SOMETHING" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content={url} />
  <meta name="twitter:title" content="{category.name} Articles" />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content="https://createsomething.io/og-image.png" />

  <link rel="canonical" href={url} />

  {@html `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} Articles`,
    description: description,
    url: url,
    publisher: {
      '@type': 'Organization',
      name: 'CREATE SOMETHING',
      url: 'https://createsomething.io',
    },
    numberOfItems: papers.length,
  })}<\/script>`}
</svelte:head>


  <!-- Hero Section -->
  <section class="relative pt-32 pb-16 px-6">
    <div class="max-w-7xl mx-auto">
      <div in:fly={{ y: 20, duration: 600 }} class="text-center space-y-4">
        <h1 class="text-4xl md:text-6xl font-bold text-white">
          {category.name}
        </h1>
        <p class="text-lg text-white/60">
          {papers.length} {papers.length === 1 ? 'article' : 'articles'}
        </p>
      </div>
    </div>
  </section>

  <!-- Papers Grid -->
  <section class="py-16 px-6">
    <div class="max-w-7xl mx-auto">
      {#if papers.length > 0}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each papers as paper, index}
            <div in:fly={{ y: 20, duration: 600, delay: 0.1 * index }}>
              <PaperCard {paper} rotation={0} {index} />
            </div>
          {/each}
        </div>
      {:else}
        <div class="text-center py-16">
          <p class="text-white/60 text-lg">No articles found in this category yet.</p>
        </div>
      {/if}
    </div>
  </section>

  <Footer />
