<script lang="ts">
  import { NewsletterSignup, SEO } from '@create-something/canon';

  let { data } = $props();
  const edition = $derived(data.edition);
  const published = $derived(
    new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/Chicago'
    }).format(new Date(edition.deliveryTarget))
  );
</script>

<SEO
  title={edition.title}
  description={edition.description}
  keywords="agentic engineering, governed AI, MCP, operator field note"
  propertyName="io"
  ogImage={edition.hero ?? undefined}
  ogType="article"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.io' },
    { name: 'Newsletters', url: 'https://createsomething.io/newsletters' },
    { name: edition.title, url: `https://createsomething.io/newsletters/${edition.slug}` }
  ]}
/>

<article>
  <header class="edition-hero">
    <div class="edition-shell">
      <a class="back-link" href="/newsletters">← Newsletter archive</a>
      <div class="edition-heading">
        <p class="edition-meta">Field note · {published} · {edition.readingMinutes} min read</p>
        <h1>{edition.title}</h1>
        <p class="dek">{edition.description}</p>
      </div>
      {#if edition.hero}
        <figure>
          <img src={edition.hero} alt="" />
          <figcaption>Signal → Decision → Proof / CREATE SOMETHING field note</figcaption>
        </figure>
      {/if}
    </div>
  </header>

  <div class="article-shell">
    <div class="article-label" aria-hidden="true">FIELD NOTE / {published}</div>
    <div class="prose">{@html edition.html}</div>
  </div>

  <footer class="edition-footer">
    <div>
      <p>CREATE SOMETHING</p>
      <span>Pages, packages, policies, and proof.</span>
    </div>
    <a href="/newsletters">Read every field note →</a>
  </footer>
</article>

<NewsletterSignup
  eyebrow="Operator edition"
  headline="Get the next field note first."
  description="A concise operator note, the practical links, and one clear next move—delivered when the work is ready."
  actionLabel="Request the next edition"
  submitLabel="Subscribe"
  note="Double opt-in. Occasional field notes. Unsubscribe whenever it stops being useful."
  source={`io-newsletter-${edition.slug}`}
/>

<style>
  article {
    background: var(--color-performance-panel);
    color: var(--color-performance-ink);
    font-family: var(--font-performance-interface);
  }
  .edition-shell,
  .article-shell,
  .edition-footer {
    width: min(
      var(--content-width-performance-editorial, 90rem),
      calc(100% - (var(--space-performance-page-gutter) * 2))
    );
    margin-inline: auto;
  }
  .edition-hero {
    padding: var(--space-performance-2xl) 0;
    background: var(--color-performance-editorial-light);
    color: var(--color-performance-editorial-dark);
    border-bottom: 1px solid var(--color-performance-line);
  }
  .back-link {
    display: inline-block;
    margin-bottom: var(--space-performance-2xl);
    color: inherit;
    font-family: var(--font-performance-record);
    font-size: var(--text-performance-operator-label);
    font-weight: var(--font-performance-semibold);
    text-decoration: none;
    text-transform: uppercase;
  }
  .edition-heading {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(18rem, 0.5fr);
    gap: var(--space-performance-sm) var(--space-performance-2xl);
    align-items: end;
  }
  .edition-meta {
    grid-column: 1 / -1;
    margin: 0 0 var(--space-performance-xs);
    font-family: var(--font-performance-record);
    font-size: var(--text-performance-operator-label);
    font-weight: var(--font-performance-semibold);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  h1 {
    max-width: 13ch;
    margin: 0;
    font-family: var(--font-performance-editorial);
    font-size: var(--text-performance-display-xl);
    font-weight: var(--font-performance-editorial-weight);
    letter-spacing: -0.06em;
    line-height: var(--leading-performance-display);
  }
  .dek {
    margin: 0 0 var(--space-performance-xs);
    color: var(--color-performance-muted);
    font-size: var(--text-performance-body-lg);
    line-height: var(--leading-performance-relaxed);
  }
  figure {
    margin: var(--space-performance-2xl) 0 0;
  }
  figure img {
    display: block;
    width: 100%;
    max-height: 43rem;
    object-fit: cover;
    border: 1px solid var(--color-performance-line);
    border-radius: var(--radius-performance-editorial);
  }
  figcaption {
    padding-top: var(--space-performance-xs);
    color: var(--color-performance-muted);
    font-family: var(--font-performance-record);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }
  .article-shell {
    display: grid;
    grid-template-columns: minmax(8rem, 0.32fr) minmax(0, 0.68fr);
    gap: var(--space-performance-2xl);
    padding-block: var(--space-performance-2xl);
  }
  .article-label {
    writing-mode: vertical-rl;
    color: var(--color-performance-muted);
    font-family: var(--font-performance-record);
    font-size: var(--text-performance-operator-label);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .prose {
    min-width: 0;
    max-width: 47rem;
    color: var(--color-performance-ink-soft);
    font-family: var(--font-performance-interface);
    font-size: var(--text-performance-body-lg);
    line-height: var(--leading-performance-loose);
  }
  .prose :global(h2) {
    margin: var(--space-performance-xl) 0 var(--space-performance-sm);
    color: var(--color-performance-ink);
    font-family: var(--font-performance-editorial);
    font-size: var(--text-performance-display-sm);
    font-weight: var(--font-performance-editorial-weight);
    letter-spacing: -0.04em;
    line-height: var(--leading-performance-editorial);
  }
  .prose :global(h3) {
    margin: var(--space-performance-lg) 0 var(--space-performance-xs);
    color: var(--color-performance-ink);
    font-family: var(--font-performance-interface);
    font-size: var(--text-performance-h2);
    font-weight: var(--font-performance-semibold);
    line-height: var(--leading-performance-tight);
  }
  .prose :global(p),
  .prose :global(ul),
  .prose :global(ol) {
    margin: 0 0 var(--space-performance-md);
  }
  .prose :global(a) {
    color: inherit;
    text-decoration-thickness: 0.08em;
    text-underline-offset: 0.12em;
  }
  .prose :global(li) {
    margin-bottom: var(--space-performance-xs);
    padding-left: var(--space-performance-xs);
  }
  .prose :global(code) {
    padding: 0.12rem var(--space-performance-xs);
    background: var(--color-performance-court);
    font-family: var(--font-performance-code);
    font-size: 0.85em;
  }
  .prose :global(blockquote) {
    margin: var(--space-performance-lg) 0;
    padding-left: var(--space-performance-md);
    border-left: 3px solid var(--color-performance-signal);
    font-size: 1.3em;
    line-height: 1.5;
  }
  .edition-footer {
    display: flex;
    justify-content: space-between;
    gap: var(--space-performance-lg);
    padding: var(--space-performance-lg) 0 var(--space-performance-2xl);
    border-top: 1px solid var(--color-performance-line);
    font-family: var(--font-performance-record);
    font-size: var(--text-performance-operator-label);
    text-transform: uppercase;
  }
  .edition-footer p {
    margin: 0 0 var(--space-performance-xs);
    font-weight: var(--font-performance-semibold);
  }
  .edition-footer span {
    color: var(--color-performance-muted);
  }
  .edition-footer a {
    color: inherit;
    font-weight: var(--font-performance-semibold);
  }
  @media (max-width: 720px) {
    .edition-heading {
      grid-template-columns: 1fr;
    }
    .edition-meta {
      grid-column: 1;
    }
    .article-shell {
      grid-template-columns: 1fr;
    }
    .article-label {
      display: none;
    }
    .edition-footer {
      flex-direction: column;
    }
  }
  @media (max-width: 480px) {
    .edition-shell,
    .article-shell,
    .edition-footer {
      width: min(
        calc(100% - (var(--space-performance-page-gutter) * 2)),
        var(--content-width-performance-editorial, 90rem)
      );
    }
  }
</style>
