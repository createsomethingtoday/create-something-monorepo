<script lang="ts">
  import { Footer, SEO, PaperCard } from '@create-something/canon';
  import type { PageData } from './$types';

  export let data: PageData;
  const { papers, category } = data;

  const quickLinks = [
    { label: 'Home', href: '/' },
    { label: 'Experiments', href: '/experiments' },
    { label: 'Methodology', href: '/methodology' }
  ];

  const categoryDescriptions: Record<string, string> = {
    automation: 'Learn about automation systems, workflow integrations, and productivity tools. Discover how to build efficient automated solutions.',
    development: 'Modern web development tutorials covering React, Next.js, TanStack, and full-stack development practices.',
    infrastructure: 'Cloud infrastructure, serverless architecture, and edge computing guides. Learn Cloudflare Workers, D1, and modern deployment strategies.',
    webflow: 'Webflow development guides, custom implementations, and no-code solutions for building powerful websites.',
  };

  const description = categoryDescriptions[category.slug] || `Explore our collection of ${papers.length} community experiments on ${category.name}.`;
</script>

<SEO
  title="{category.name} Experiments"
  description={description}
  keywords="{category.slug}, experiments, community, fork, learn, {category.name}"
  propertyName="space"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.space' },
    { name: 'Categories', url: 'https://createsomething.space/categories' },
    { name: category.name, url: `https://createsomething.space/category/${category.slug}` }
  ]}
/>

<!-- Hero Section -->
  <section class="relative pt-32 pb-16 px-6">
    <div class="max-w-7xl mx-auto">
      <div class="text-center space-y-4 animate-reveal">
        <h1 class="hero-title">
          {category.name}
        </h1>
        <p class="subtitle">
          {papers.length} {papers.length === 1 ? 'experiment' : 'experiments'}
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
            <div class="animate-reveal" style="--delay: {index + 1}">
              <PaperCard {paper} rotation={0} {index} />
            </div>
          {/each}
        </div>
      {:else}
        <div class="text-center py-16">
          <p class="empty-text">No experiments found in this category yet.</p>
        </div>
      {/if}
    </div>
  </section>

  <Footer
    mode="space"
    showNewsletter={false}
    aboutText="Community playground for AI-native development experiments. Fork experiments, break things, learn in public."
    quickLinks={quickLinks}
    showSocial={true}
  />
<style>
  .hero-title {
    font-size: var(--text-h1);
    font-weight: 700;
    color: var(--color-fg-primary);
  }

  .subtitle {
    font-size: var(--text-body);
    color: var(--color-fg-secondary);
  }

  .empty-text {
    font-size: var(--text-body);
    color: var(--color-fg-secondary);
  }

  .animate-reveal {
    opacity: 0;
    transform: translateY(20px);
    animation: reveal 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    animation-delay: calc(var(--delay, 0) * 100ms);
  }

  @keyframes reveal {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-reveal {
      animation: none;
      opacity: 1;
      transform: none;
    }
  }
</style>
