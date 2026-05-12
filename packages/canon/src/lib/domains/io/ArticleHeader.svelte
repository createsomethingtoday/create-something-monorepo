<script lang="ts">
  import { TrackedExperimentBadge } from '@create-something/canon/interactive';
  import type { Paper } from '$lib/types/paper';

  interface Props {
    paper: Paper;
  }

  let { paper }: Props = $props();

  const categoryDisplayNames: Record<string, string> = {
    automation: 'Automation',
    webflow: 'Webflow',
    development: 'Development'
  };

  const categoryDisplayName = $derived(categoryDisplayNames[paper.category] || paper.category);
  const formattedDate = $derived(formatDate(paper.published_at || paper.date || paper.created_at));
  const technicalTags = $derived(
    paper.technical_focus
      ? paper.technical_focus
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 4)
      : []
  );

  function formatDate(dateString?: string | null): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
</script>

<header class="property-article-hero">
  <div class="shell-inner-pad">
    <div class="property-article-hero__layout">
      <div class="property-article-hero__copy">
        <span class="product-kicker">{categoryDisplayName}</span>

        <h1>{paper.title}</h1>

        {#if paper.excerpt_long || paper.description}
          <p>{paper.excerpt_long || paper.description}</p>
        {/if}

        <div class="property-article-hero__meta" aria-label="Article metadata">
          {#if formattedDate}
            <span>{formattedDate}</span>
          {/if}
          {#if paper.reading_time}
            <span>{paper.reading_time} min read</span>
          {/if}
          {#if paper.difficulty_level}
            <span>{paper.difficulty_level}</span>
          {/if}
        </div>

        {#if technicalTags.length > 0}
          <div class="property-article-hero__tags" aria-label="Technical focus">
            {#each technicalTags as tag}
              <span>{tag}</span>
            {/each}
          </div>
        {/if}
      </div>

      <aside class="product-surface product-surface--soft property-article-hero__artifact">
        <span class="property-content-meta">Research artifact</span>
        {#if paper.ascii_art}
          <pre>{paper.ascii_art}</pre>
        {:else}
          <div class="property-article-hero__artifact-copy">
            <h2>Evidence before opinion.</h2>
            <p>
              This page records the claim, the method, and the artifact trail so the next decision
              can be inspected.
            </p>
          </div>
        {/if}
      </aside>
    </div>

    <div class="property-article-hero__badge">
      <TrackedExperimentBadge {paper} showFullStats={true} />
    </div>
  </div>
</header>

<style>
  .property-article-hero {
    padding-top: clamp(3rem, 7vw, 5rem);
    padding-bottom: clamp(2rem, 5vw, 3.5rem);
  }

  .property-article-hero__layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.56fr);
    gap: clamp(1.5rem, 5vw, 4rem);
    align-items: end;
  }

  .property-article-hero__copy {
    display: grid;
    gap: 1rem;
    max-width: 58rem;
  }

  .property-article-hero h1 {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: 4.35rem;
    line-height: 0.98;
    letter-spacing: 0;
    text-wrap: balance;
  }

  .property-article-hero__copy > p {
    margin: 0;
    max-width: 44rem;
    color: var(--color-fg-secondary);
    font-size: 1.16rem;
    line-height: 1.72;
    text-wrap: pretty;
  }

  .property-article-hero__meta,
  .property-article-hero__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.48rem;
    align-items: center;
  }

  .property-article-hero__meta span,
  .property-article-hero__tags span {
    display: inline-flex;
    align-items: center;
    min-height: 1.9rem;
    padding: 0.36rem 0.62rem;
    border: 1px solid var(--color-shell-border-subtle);
    border-radius: var(--radius-full);
    color: var(--color-fg-secondary);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.04em;
  }

  .property-article-hero__tags span {
    color: var(--color-fg-muted);
    background: rgba(255, 255, 255, 0.025);
  }

  .property-article-hero__artifact {
    display: grid;
    gap: 1rem;
    min-height: 18rem;
    align-content: start;
  }

  .property-article-hero__artifact pre {
    margin: 0;
    overflow-x: auto;
    scrollbar-width: none;
    color: var(--color-fg-secondary);
    font-family: var(--font-mono);
    font-size: 0.56rem;
    line-height: 1.18;
    white-space: pre;
    opacity: 0.9;
  }

  .property-article-hero__artifact pre::-webkit-scrollbar {
    display: none;
  }

  .property-article-hero__artifact-copy {
    display: grid;
    gap: 0.75rem;
  }

  .property-article-hero__artifact-copy h2,
  .property-article-hero__artifact-copy p {
    margin: 0;
  }

  .property-article-hero__artifact-copy h2 {
    color: var(--color-fg-primary);
    font-size: 1.85rem;
    line-height: 1.05;
  }

  .property-article-hero__artifact-copy p {
    color: var(--color-fg-secondary);
    line-height: 1.65;
  }

  .property-article-hero__badge {
    margin-top: 1.2rem;
    max-width: 58rem;
  }

  @media (max-width: 980px) {
    .property-article-hero__layout {
      grid-template-columns: 1fr;
    }

    .property-article-hero h1 {
      font-size: 3.6rem;
    }
  }

  @media (max-width: 720px) {
    .property-article-hero h1 {
      font-size: 3rem;
      line-height: 1;
    }

    .property-article-hero__copy > p {
      font-size: 1.02rem;
    }

    .property-article-hero__artifact pre {
      font-size: 0.5rem;
    }
  }
</style>
