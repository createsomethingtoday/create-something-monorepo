<script lang="ts">
  import { fly } from 'svelte/transition';
  import { Footer } from '@create-something/components';
  import type { PageData } from './$types';

  export let data: PageData;
  const { categories } = data;

  const quickLinks = [
    { label: 'Home', href: '/' },
    { label: 'All Experiments', href: '/experiments' },
    { label: 'Methodology', href: '/methodology' },
    { label: 'About', href: '/about' }
  ];
</script>

<svelte:head>
  <title>Browse by Category | CREATE SOMETHING</title>
  <meta name="description" content="Explore our technical papers organized by topic" />
  <link rel="canonical" href="https://createsomething.io/categories" />
</svelte:head>


  <!-- Hero Section -->
  <section class="relative pt-32 pb-16 px-6">
    <div class="max-w-7xl mx-auto">
      <div in:fly={{ y: 20, duration: 600 }} class="text-center space-y-4">
        <h1 class="text-4xl md:text-6xl font-bold text-white">
          Browse by Category
        </h1>
        <p class="text-lg text-white/60">
          Explore our technical papers organized by topic
        </p>
      </div>
    </div>
  </section>

  <!-- Categories Grid -->
  <section class="py-16 px-6">
    <div class="max-w-5xl mx-auto">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each categories as category, index}
          <div in:fly={{ y: 20, duration: 500, delay: index * 100 }}>
            <a
              href="/category/{category.slug}"
              class="group block relative p-8 bg-[#111111] border border-white/10 rounded-lg hover:border-white/30 transition-all overflow-hidden min-h-[160px]"
            >
              <div class="relative z-10 space-y-4">
                <h3 class="text-2xl font-semibold text-white group-hover:text-white/90 transition-colors">
                  {category.name}
                </h3>

                <div class="flex items-center justify-between">
                  <div class="text-base font-medium text-white/60 group-hover:text-white/80 transition-colors">
                    {category.count} {category.count === 1 ? 'article' : 'articles'}
                  </div>

                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 16 16"
                    fill="none"
                    class="text-white/60 group-hover:text-white/90 transition-all group-hover:translate-x-1"
                  >
                    <path
                      d="M10.6696 6.276L4.93156 12.014L3.98889 11.0713L9.72622 5.33333H4.66956V4H12.0029V11.3333H10.6696V6.276Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              </div>

              <div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </a>
          </div>
        {/each}
      </div>

      {#if categories.length === 0}
        <div class="text-center py-16">
          <p class="text-white/60 text-lg">No categories available yet.</p>
        </div>
      {/if}
    </div>
  </section>

  <Footer />
