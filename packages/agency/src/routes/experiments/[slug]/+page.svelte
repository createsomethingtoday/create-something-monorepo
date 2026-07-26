<script lang="ts">
  import type { PageData } from './$types';
  import ArticleHeader from '$lib/components/ArticleHeader.svelte';
  import { ArticleContent } from '@create-something/canon/domains/agency';
  import { ShareButtons, RelatedArticles, SEO } from '@create-something/canon';

  export let data: PageData;

  // Use reactive declarations to ensure reactivity on client-side navigation
  $: paper = data.paper;
  $: relatedPapers = data.relatedPapers;

  // Generate full URL for sharing (must also be reactive)
  $: fullUrl = `https://createsomething.agency/experiments/${paper.slug}`;
</script>

<SEO
  title={paper.title}
  description={paper.description ||
    paper.excerpt_long ||
    paper.excerpt_short ||
    'Community experiment from the playground'}
  keywords={paper.focus_keywords || `${paper.category}, experiments, community, fork, learn`}
  propertyName="agency"
  noindex={true}
  breadcrumbs={[
    { name: 'Home', url: '/' },
    { name: 'Experiments', url: '/experiments' },
    { name: paper.title, url: `/experiments/${paper.slug}` }
  ]}
/>

<main class="min-h-screen page-wrapper">
  <section class="experiment-reading" aria-label={paper.title}>
    <ArticleHeader {paper} />

    <div class="shell-inner-pad">
      <div class="grid grid-cols-1 lg:grid-cols-[80px_1fr] gap-12">
        <aside class="hidden lg:block" aria-label="Share this experiment">
          <ShareButtons title={paper.title} url={fullUrl} />
        </aside>

        <div class="min-w-0">
          <ArticleContent {paper} />
        </div>
      </div>
    </div>
  </section>

  <section class="experiment-handoff" aria-label="Continue exploring experiments">
    <nav class="shell-inner-pad experiment-handoff__nav" aria-label="Experiment collection">
      <a href="/experiments" class="inline-flex items-center gap-2 back-link">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to all experiments
      </a>
    </nav>
    <RelatedArticles papers={relatedPapers} currentPaperId={paper.id} />
  </section>
</main>

<style>
  .page-wrapper {
    background: var(--color-performance-bg-pure);
  }

  .experiment-reading {
    min-width: 0;
  }

  .experiment-handoff {
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .experiment-handoff__nav {
    padding-block: 2rem 0;
  }

  .back-link {
    color: var(--color-performance-success);
    transition: color var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .back-link:hover {
    color: var(--color-performance-fg-primary);
  }
</style>
