<script lang="ts">
  import { NewsletterSignup, SEO } from '@create-something/canon';

  let { data } = $props();

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Chicago'
  });
</script>

<SEO
  title="Newsletter Archive"
  description="Field notes on building legible, governed AI systems. Read the archive and get the next operator edition by email."
  keywords="AI systems newsletter, agentic engineering, MCP, governed AI, operator field notes"
  propertyName="io"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.io' },
    { name: 'Newsletters', url: 'https://createsomething.io/newsletters' }
  ]}
/>

<header class="archive-hero">
  <div class="archive-shell">
    <p class="eyebrow">Newsletter archive / Field notes</p>
    <div class="hero-grid">
      <h1>Read the field notes.<br />Get the next one first.</h1>
      <div class="hero-copy">
        <p>
          Practical writing about the pages, packages, policies, and proof that make agentic systems
          useful under pressure.
        </p>
        <a href="#subscribe">Get the operator edition <span aria-hidden="true">→</span></a>
      </div>
    </div>
    <div class="signal-rail" aria-label="Publication contract">
      <span><strong>Signal</strong> field evidence</span>
      <span><strong>Decision</strong> operator judgment</span>
      <span><strong>Proof</strong> public archive</span>
    </div>
  </div>
</header>

<main class="archive-main">
  <section class="archive-shell" aria-labelledby="archive-heading">
    <div class="section-heading">
      <div>
        <p class="eyebrow">The archive</p>
        <h2 id="archive-heading">Published editions</h2>
      </div>
      <p>{data.editions.length} {data.editions.length === 1 ? 'field note' : 'field notes'}</p>
    </div>

    <div class="edition-list">
      {#each data.editions as edition, index}
        <a class="edition-card" href="/newsletters/{edition.slug}">
          <div class="edition-index">{String(index + 1).padStart(2, '0')}</div>
          <div class="edition-copy">
            <p class="edition-meta">
              {dateFormatter.format(new Date(edition.deliveryTarget))} · {edition.readingMinutes} min
            </p>
            <h3>{edition.title}</h3>
            <p>{edition.description}</p>
            <span>Read field note <span aria-hidden="true">→</span></span>
          </div>
          {#if edition.hero}
            <img src={edition.hero} alt="" loading={index === 0 ? 'eager' : 'lazy'} />
          {/if}
        </a>
      {:else}
        <div class="empty-state">
          <p class="eyebrow">Next release</p>
          <h3>The first field note is being prepared.</h3>
          <p>Join the list and it will arrive before it enters the public archive.</p>
        </div>
      {/each}
    </div>
  </section>

  <div id="subscribe" class="signup-anchor">
    <NewsletterSignup
      eyebrow="Operator edition"
      headline="Get the next field note first."
      description="The concise edition, practical links, and one clear next move—sent when the work is ready. The full argument remains available in the public archive."
      actionLabel="Request the next edition"
      submitLabel="Subscribe"
      note="Double opt-in. Occasional field notes. Unsubscribe whenever it stops being useful."
      source="io-newsletter-archive"
    />
  </div>
</main>

<style>
  :global(html) {
    scroll-behavior: smooth;
  }
  .archive-shell {
    width: min(
      var(--content-width-performance-editorial, 90rem),
      calc(100% - (var(--space-performance-page-gutter) * 2))
    );
    margin-inline: auto;
  }
  .archive-hero {
    padding: var(--space-performance-2xl) 0 0;
    background: var(--color-performance-editorial-light);
    color: var(--color-performance-editorial-dark);
    border-bottom: 1px solid var(--color-performance-line);
  }
  .eyebrow {
    margin: 0;
    font-family: var(--font-performance-record);
    font-size: var(--text-performance-operator-label);
    font-weight: var(--font-performance-semibold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .hero-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(17rem, 0.55fr);
    gap: var(--space-performance-2xl);
    align-items: end;
    padding: var(--space-performance-lg) 0 var(--space-performance-2xl);
  }
  h1 {
    max-width: 14ch;
    margin: 0;
    font-family: var(--font-performance-editorial);
    font-size: var(--text-performance-display-xl);
    font-weight: var(--font-performance-editorial-weight);
    letter-spacing: -0.055em;
    line-height: var(--leading-performance-display);
  }
  .hero-copy {
    display: grid;
    gap: var(--space-performance-md);
    align-content: end;
    font-family: var(--font-performance-interface);
  }
  .hero-copy p {
    margin: 0;
    font-size: var(--text-performance-body-lg);
    line-height: var(--leading-performance-relaxed);
  }
  .hero-copy a {
    width: fit-content;
    padding-bottom: var(--space-performance-xs);
    border-bottom: 2px solid currentColor;
    color: inherit;
    font-weight: var(--font-performance-semibold);
    text-decoration: none;
  }
  .signal-rail {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border-top: 1px solid var(--color-performance-line);
  }
  .signal-rail span {
    padding: var(--space-performance-sm) var(--space-performance-md);
    font-family: var(--font-performance-record);
    font-size: var(--text-performance-operator-label);
    text-transform: uppercase;
  }
  .signal-rail span + span {
    border-left: 1px solid var(--color-performance-line);
  }
  .signal-rail strong {
    margin-right: var(--space-performance-xs);
    color: var(--color-performance-signal);
  }
  .archive-main {
    background: var(--color-performance-panel);
    color: var(--color-performance-ink);
    font-family: var(--font-performance-interface);
  }
  .archive-main > section {
    padding-block: var(--space-performance-2xl);
  }
  .section-heading {
    display: flex;
    justify-content: space-between;
    gap: var(--space-performance-lg);
    align-items: end;
    padding-bottom: var(--space-performance-md);
    border-bottom: 2px solid currentColor;
  }
  .section-heading h2 {
    margin: var(--space-performance-xs) 0 0;
    font-family: var(--font-performance-editorial);
    font-size: var(--text-performance-display);
    font-weight: var(--font-performance-editorial-weight);
    letter-spacing: -0.045em;
    line-height: var(--leading-performance-editorial);
  }
  .section-heading > p {
    margin: 0;
    font-family: var(--font-performance-record);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }
  .edition-list {
    display: grid;
  }
  .edition-card {
    display: grid;
    grid-template-columns: 4rem minmax(0, 1fr) minmax(15rem, 26rem);
    gap: var(--space-performance-lg);
    padding: var(--space-performance-lg) 0;
    border-bottom: 1px solid var(--color-performance-line);
    color: inherit;
    text-decoration: none;
  }
  .edition-index,
  .edition-meta {
    font-family: var(--font-performance-record);
    font-size: var(--text-performance-operator-label);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .edition-copy {
    display: grid;
    align-content: start;
    gap: var(--space-performance-sm);
  }
  .edition-copy p,
  .edition-copy h3 {
    margin: 0;
  }
  .edition-copy h3 {
    max-width: 18ch;
    font-family: var(--font-performance-editorial);
    font-size: var(--text-performance-display-sm);
    font-weight: var(--font-performance-editorial-weight);
    letter-spacing: -0.04em;
    line-height: var(--leading-performance-editorial);
  }
  .edition-copy > p:not(.edition-meta) {
    max-width: 43rem;
    color: var(--color-performance-muted);
    font-size: var(--text-performance-body);
    line-height: var(--leading-performance-relaxed);
  }
  .edition-copy > span {
    margin-top: var(--space-performance-xs);
    font-family: var(--font-performance-record);
    font-size: var(--text-performance-caption);
    font-weight: var(--font-performance-semibold);
    text-transform: uppercase;
  }
  .edition-card img {
    width: 100%;
    aspect-ratio: 16 / 10;
    object-fit: cover;
    border: 1px solid var(--color-performance-line);
    border-radius: var(--radius-performance-editorial);
    filter: saturate(0.85) contrast(1.04);
  }
  .edition-card:hover h3,
  .edition-card:focus-visible h3 {
    text-decoration: underline;
    text-decoration-thickness: 0.08em;
    text-underline-offset: 0.12em;
  }
  .empty-state {
    padding: var(--space-performance-xl) 0;
  }
  .empty-state h3 {
    max-width: 18ch;
    margin: var(--space-performance-sm) 0;
    font-family: var(--font-performance-editorial);
    font-size: var(--text-performance-display-sm);
    font-weight: var(--font-performance-editorial-weight);
  }
  .empty-state > p:last-child {
    max-width: 36rem;
    color: var(--color-performance-muted);
    line-height: var(--leading-performance-relaxed);
  }
  .signup-anchor {
    scroll-margin-top: var(--space-performance-xl);
  }
  @media (max-width: 760px) {
    .hero-grid {
      grid-template-columns: 1fr;
    }
    .signal-rail {
      grid-template-columns: 1fr;
    }
    .signal-rail span + span {
      border-left: 0;
      border-top: 1px solid var(--color-performance-line);
    }
    .edition-card {
      grid-template-columns: 2.5rem minmax(0, 1fr);
    }
    .edition-card img {
      grid-column: 2;
      grid-row: 2;
    }
  }
  @media (max-width: 480px) {
    .archive-shell {
      width: min(
        calc(100% - (var(--space-performance-page-gutter) * 2)),
        var(--content-width-performance-editorial, 90rem)
      );
    }
    .edition-card {
      grid-template-columns: 1fr;
    }
    .edition-index {
      display: none;
    }
    .edition-card img {
      grid-column: 1;
      grid-row: auto;
    }
  }
</style>
