<script lang="ts">
  import { tick } from 'svelte';
  import type { Paper } from '$lib/types/paper';
  import { InteractiveExperimentCTA } from '@create-something/canon/interactive';

  interface Props {
    paper: Paper;
    isCompleted?: boolean;
    onReset?: () => void;
  }

  let { paper, isCompleted = false, onReset }: Props = $props();

  const hasSubstantialHtmlContent = $derived(
    !!paper.html_content &&
      (!paper.content || paper.html_content.length >= paper.content.length * 0.5)
  );
  const contentToRender = $derived(hasSubstantialHtmlContent ? paper.html_content : paper.content);

  let renderedContent = $state('');
  let proseElement = $state<HTMLElement>();

  $effect(() => {
    const content = contentToRender;
    let cancelled = false;

    if (!content) {
      renderedContent = '';
      return;
    }

    void (async () => {
      if (hasSubstantialHtmlContent) {
        renderedContent = content;
      } else {
        const { marked } = await import('marked');

        marked.setOptions({
          gfm: true,
          breaks: true
        });
        renderedContent = await marked(content);
      }

      await tick();
      if (!cancelled && proseElement) {
        const { default: hljs } = await import('highlight.js');
        proseElement
          .querySelectorAll('pre code')
          .forEach((block) => hljs.highlightElement(block as HTMLElement));
      }
    })();

    return () => {
      cancelled = true;
    };
  });
</script>

<article class="property-article-content">
  <div class="shell-inner-pad">
    <div class="product-surface product-surface--soft property-article-body">
      {#if paper.interactive_demo_url}
        <InteractiveExperimentCTA
          spaceUrl={paper.interactive_demo_url}
          paperTitle={paper.title}
          {isCompleted}
          {onReset}
        />
      {/if}

      <div class="property-article-prose" bind:this={proseElement}>
        {@html renderedContent}
      </div>
    </div>
  </div>
</article>

<style>
  .property-article-content {
    padding-bottom: clamp(2.5rem, 6vw, 4.5rem);
  }

  .property-article-body {
    max-width: 58rem;
    margin-inline: auto;
    --product-surface-padding: clamp(1.35rem, 3vw, 2.4rem);
  }

  .property-article-prose {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-lg);
    line-height: 1.78;
  }

  .property-article-prose :global(*) {
    max-width: 100%;
  }

  .property-article-prose :global(h1),
  .property-article-prose :global(h2),
  .property-article-prose :global(h3),
  .property-article-prose :global(h4) {
    color: var(--color-fg-primary);
    line-height: 1.05;
    text-wrap: balance;
  }

  .property-article-prose :global(h1) {
    margin: 0 0 1.5rem;
    font-size: 3.5rem;
  }

  .property-article-prose :global(h2) {
    margin: 2.8rem 0 1rem;
    font-size: 2.65rem;
  }

  .property-article-prose :global(h3) {
    margin: 2.2rem 0 0.85rem;
    font-size: 1.85rem;
  }

  .property-article-prose :global(h4) {
    margin: 1.8rem 0 0.7rem;
    font-size: 1.2rem;
  }

  .property-article-prose :global(p),
  .property-article-prose :global(ul),
  .property-article-prose :global(ol),
  .property-article-prose :global(blockquote),
  .property-article-prose :global(pre),
  .property-article-prose :global(table) {
    margin-top: 0;
    margin-bottom: 1.35rem;
  }

  .property-article-prose :global(p) {
    color: var(--color-fg-secondary);
  }

  .property-article-prose :global(a) {
    color: var(--color-fg-primary);
    text-decoration: underline;
    text-underline-offset: 0.25rem;
  }

  .property-article-prose :global(ul),
  .property-article-prose :global(ol) {
    padding-left: 1.4rem;
  }

  .property-article-prose :global(li) {
    margin-bottom: 0.45rem;
  }

  .property-article-prose :global(pre) {
    overflow-x: auto;
    padding: 1.15rem;
    border: 1px solid var(--color-shell-border-subtle);
    border-radius: var(--radius-lg);
    background: rgba(0, 0, 0, 0.28);
  }

  .property-article-prose :global(code) {
    font-family: var(--font-mono);
    font-size: 0.9em;
  }

  .property-article-prose :global(:not(pre) > code) {
    padding: 0.13rem 0.42rem;
    border: 1px solid var(--color-shell-border-subtle);
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.04);
    color: var(--color-fg-primary);
  }

  .property-article-prose :global(blockquote) {
    padding: 1rem 1.1rem;
    border-left: 3px solid var(--color-brand-primary);
    border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
    background: rgba(255, 255, 255, 0.035);
    color: var(--color-fg-secondary);
  }

  .property-article-prose :global(img) {
    width: 100%;
    margin: 2rem 0;
    border-radius: var(--radius-lg);
  }

  .property-article-prose :global(table) {
    display: block;
    overflow-x: auto;
    border-collapse: collapse;
    border: 1px solid var(--color-shell-border-subtle);
    border-radius: var(--radius-lg);
  }

  .property-article-prose :global(th),
  .property-article-prose :global(td) {
    padding: 0.75rem 0.9rem;
    border-bottom: 1px solid var(--color-shell-border-subtle);
    text-align: left;
  }

  .property-article-prose :global(th) {
    color: var(--color-fg-primary);
    background: rgba(255, 255, 255, 0.035);
  }

  .property-article-prose :global(strong) {
    color: var(--color-fg-primary);
  }

  @media (max-width: 720px) {
    .property-article-prose :global(h1) {
      font-size: 2.3rem;
    }

    .property-article-prose :global(h2) {
      font-size: 2rem;
    }

    .property-article-prose :global(h3) {
      font-size: 1.45rem;
    }
  }
</style>
