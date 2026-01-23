<script lang="ts">
  import PaperCard from '$lib/components/PaperCard.svelte';
  import type { PageData } from './$types';
  import { SEO } from '@create-something/components';
  // Footer is provided by layout

  export let data: PageData;
  const { papers, category } = data;

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
	ogImage="/og-image.svg"
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Categories', url: '/categories' },
		{ name: category.name, url: `/category/${category.slug}` }
	]}
/>

<!-- Hero Section -->
<section class="relative pt-32 pb-16 px-6">
  <div class="max-w-7xl mx-auto">
    <div class="text-center space-y-4 animate-reveal">
      <h1 class="hero-title font-bold">
        {category.name}
      </h1>
      <p class="body-lg body-tertiary">
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
        <p class="body-tertiary body-lg">No experiments found in this category yet.</p>
      </div>
    {/if}
  </div>
</section>

<style>
	.hero-title {
		font-size: var(--text-h1);
		font-weight: bold;
		color: var(--color-fg-primary);
	}

	.heading-2 {
		font-size: var(--text-h2);
		font-weight: bold;
		color: var(--color-fg-primary);
	}

	.heading-3 {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.body-xl {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.body-lg {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.body {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.body-sm {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.body-xs {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.body-secondary {
		color: var(--color-fg-secondary);
	}

	.body-tertiary {
		color: var(--color-fg-tertiary);
	}

	.body-muted {
		color: var(--color-fg-muted);
	}

	.link {
		color: var(--color-fg-primary);
	}

	.link:hover {
		text-decoration: underline;
	}

	.card-surface {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.card-elevated {
		padding: var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.section-border {
		border-top: 1px solid var(--color-border-default);
	}

	.btn-primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-weight: 600;
		border-radius: var(--radius-full);
	}

	.btn-primary:hover {
		opacity: 0.9;
	}

	.input {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		color: var(--color-fg-primary);
	}

	.input:focus {
		border-color: var(--color-border-emphasis);
	}

	.animate-reveal {
		opacity: 0;
		transform: translateY(20px);
		animation: reveal 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
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
