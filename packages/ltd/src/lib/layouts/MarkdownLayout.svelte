<script lang="ts">
  /**
   * Markdown Layout - .ltd
   *
   * Universal layout for all markdown content (patterns, canon pages).
   * Provides structure and PageActions integration.
   */
  import { page } from '$app/stores';
  import { CanonReadingCompass } from '$lib/components';
  import { PageActions, MarkdownPreviewModal } from '@create-something/canon';

  interface Props {
    title?: string;
    subtitle?: string;
    category?: string;
    section?: string;
    pronunciation?: string;
    translation?: string;
    lead?: string;
    publishedAt?: string;
    children?: any;
  }

  let {
    title,
    subtitle,
    category,
    section,
    pronunciation,
    translation,
    lead,
    publishedAt,
    children
  }: Props = $props();

  // State for markdown preview modal
  let showMarkdownPreview = $state(false);
  let markdownContent = $state('');

  // Full URL for this page
  const fullUrl = $derived(`https://createsomething.ltd${$page.url.pathname}`);

  // Extract full content for PageActions
  const pageContent = $derived(
    `
## ${title || 'Untitled'}

${pronunciation ? `*${pronunciation}*\n` : ''}
${translation ? `> ${translation}\n\n` : ''}
${subtitle ? `*${subtitle}*\n\n` : ''}
${lead ? `${lead}\n\n` : ''}

${category ? `**Category**: ${category}\n` : ''}
${section ? `**Section**: ${section}\n` : ''}

[Content rendered from markdown - full content preserved]
`.trim()
  );

  function handlePreview(markdown: string) {
    markdownContent = markdown;
    showMarkdownPreview = true;
  }
</script>

<!-- Header -->
<section class="pt-24 pb-16 px-6 border-b border-canon">
  <div class="max-w-3xl mx-auto">
    <a
      href={category === 'Pattern' ? '/patterns' : '/canon'}
      class="typ-body-sm fg-muted hover:fg-tertiary transition-opacity mb-8 inline-block"
    >
      ← All {category === 'Pattern'
        ? 'Patterns'
        : category === 'Canon' && section
          ? section
          : 'Canon'}
    </a>
    {#if category || section}
      <p class="typ-body-sm tracking-widest uppercase fg-tertiary mb-4">{category || section}</p>
    {/if}
    {#if title}
      <h1 class="mb-6">{title}</h1>
    {/if}
    {#if pronunciation}
      <p class="typ-body-sm fg-tertiary font-mono mb-2">{pronunciation}</p>
    {/if}
    {#if translation}
      <p class="typ-body fg-secondary mb-4">{translation}</p>
    {/if}
    {#if subtitle}
      <p class="typ-h3 fg-secondary leading-relaxed">{subtitle}</p>
    {/if}
    {#if lead}
      <p class="typ-body-lg fg-secondary leading-relaxed mt-4">{lead}</p>
    {/if}
    {#if publishedAt}
      <p class="typ-caption fg-muted mt-4">
        Published {new Date(publishedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </p>
    {/if}

    <!-- Page Actions -->
    <div class="mt-6">
      <PageActions
        title={title || 'Canon'}
        content={pageContent}
        metadata={{
          category,
          section,
          sourceUrl: fullUrl
        }}
        claudePrompt="Help me understand this pattern/canon and how to apply it."
        onpreview={handlePreview}
      />
    </div>

    <CanonReadingCompass />
  </div>
</section>

<!-- Content -->
<article class="py-12 px-6" data-canon-reading>
  <div class="max-w-3xl mx-auto prose prose-ltd">
    {@render children?.()}

    <footer class="reading-handoff">
      <span>Continue through the source family</span>
      <a href={category === 'Pattern' ? '/patterns' : '/canon'}>
        All {category === 'Pattern' ? 'Patterns' : 'Canon'} →
      </a>
    </footer>
  </div>
</article>

<!-- Markdown Preview Modal -->
<MarkdownPreviewModal
  bind:open={showMarkdownPreview}
  content={markdownContent}
  title={title || 'Canon'}
/>

<style>
  /* Canon typography and spacing */
  :global(.prose-ltd h2) {
    margin-top: var(--space-performance-xl);
    margin-bottom: var(--space-performance-md);
    font-size: var(--text-performance-h2);
    font-weight: 600;
    color: var(--color-performance-fg-primary);
  }

  :global(.prose-ltd h3) {
    margin-top: var(--space-performance-lg);
    margin-bottom: var(--space-performance-sm);
    font-size: var(--text-performance-h3);
    font-weight: 600;
    color: var(--color-performance-fg-secondary);
  }

  :global(.prose-ltd p) {
    margin-bottom: var(--space-performance-md);
    font-size: var(--text-performance-body);
    color: var(--color-performance-fg-secondary);
    line-height: 1.8;
  }

  :global(.prose-ltd ul),
  :global(.prose-ltd ol) {
    margin-bottom: var(--space-performance-md);
    padding-left: var(--space-performance-lg);
  }

  :global(.prose-ltd li) {
    margin-bottom: var(--space-performance-sm);
    color: var(--color-performance-fg-secondary);
  }

  :global(.prose-ltd blockquote) {
    border-left: 2px solid var(--color-performance-border-emphasis);
    padding-left: var(--space-performance-md);
    margin: var(--space-performance-lg) 0;
    font-style: italic;
    color: var(--color-performance-fg-tertiary);
  }

  :global(.prose-ltd table) {
    width: 100%;
    table-layout: fixed;
    margin: var(--space-performance-lg) 0;
    border-collapse: collapse;
  }

  :global(.prose-ltd th),
  :global(.prose-ltd td) {
    overflow-wrap: anywhere;
  }

  :global(.prose-ltd th) {
    background: var(--color-performance-bg-subtle);
    padding: var(--space-performance-sm);
    text-align: left;
    font-weight: 600;
    border-bottom: 1px solid var(--color-performance-border-emphasis);
    color: var(--color-performance-fg-primary);
  }

  :global(.prose-ltd td) {
    padding: var(--space-performance-sm);
    color: var(--color-performance-fg-secondary);
  }

  :global(.prose-ltd code) {
    background: var(--color-performance-bg-subtle);
    padding: 0.2em 0.4em;
    border-radius: var(--radius-performance-scale-sm);
    font-family: 'Stack Sans Mono', monospace;
    font-size: 0.9em;
    color: var(--color-performance-fg-primary);
    overflow-wrap: anywhere;
  }

  :global(.prose-ltd pre) {
    background: var(--color-performance-bg-subtle);
    padding: var(--space-performance-md);
    border-radius: var(--radius-performance-scale-md);
    overflow-x: auto;
    margin: var(--space-performance-lg) 0;
  }

  :global(.prose-ltd pre code) {
    background: none;
    padding: 0;
    overflow-wrap: normal;
  }

  .reading-handoff {
    display: flex;
    gap: var(--space-performance-sm);
    align-items: center;
    justify-content: space-between;
    margin-top: var(--space-performance-xl);
    padding-top: var(--space-performance-md);
    border-top: 1px solid var(--color-performance-border-default);
    font-size: var(--text-performance-body-sm);
  }

  .reading-handoff span {
    color: var(--color-performance-fg-muted);
  }

  .reading-handoff a {
    color: var(--color-performance-fg-primary);
    font-weight: 600;
    text-decoration: none;
  }

  @media (max-width: 640px) {
    .reading-handoff {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
