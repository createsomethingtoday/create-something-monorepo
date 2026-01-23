<script lang="ts">
  import type { PageData } from './$types';
  import { SEO } from '@create-something/components';
  // Footer is provided by layout

  export let data: PageData;
  const { categories } = data;
</script>

<SEO
	title="Browse by Category"
	description="Explore community experiments organized by topic"
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Categories', url: '/categories' }
	]}
/>

<!-- Hero Section -->
<section class="relative pt-32 pb-16 px-6">
  <div class="max-w-7xl mx-auto">
    <div class="text-center space-y-4 animate-reveal">
      <h1 class="hero-title font-bold">
        Browse by Category
      </h1>
      <p class="body-lg body-tertiary">
        Explore community experiments organized by topic
      </p>
    </div>
  </div>
</section>

<!-- Categories Grid -->
<section class="py-16 px-6">
  <div class="max-w-5xl mx-auto">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each categories as category, index}
        <div class="animate-reveal" style="--delay: {index + 1}">
          <a
            href="/category/{category.slug}"
            class="group block relative p-8 overflow-hidden category-card"
          >
            <div class="relative z-10 space-y-4">
              <h2 class="heading-2 font-semibold group-hover:body-xl transition-colors">
                {category.name}
              </h2>

              <div class="flex items-center justify-between">
                <div class="body font-medium body-tertiary group-hover:body-secondary transition-colors">
                  {category.count} {category.count === 1 ? 'experiment' : 'experiments'}
                </div>

                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 16 16"
                  fill="none"
                  class="body-tertiary group-hover:body-xl transition-all group-hover:translate-x-1"
                >
                  <path
                    d="M10.6696 6.276L4.93156 12.014L3.98889 11.0713L9.72622 5.33333H4.66956V4H12.0029V11.3333H10.6696V6.276Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
            </div>

            <div class="card-gradient-overlay"></div>
          </a>
        </div>
      {/each}
    </div>

    {#if categories.length === 0}
      <div class="text-center py-16">
        <p class="body-tertiary body-lg">No categories available yet.</p>
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

	.category-card {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		min-height: 160px;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.category-card:hover {
		border-color: var(--color-border-strong);
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
