<script lang="ts">
  import '$lib/styles/newsletter-editorial.css';
  import '$lib/styles/newsletter-readers.css';
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

<div class="newsletter-editorial newsletter-reader">
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
  turnstileSiteKey={data.turnstileSiteKey}
  eyebrow="Operator edition"
  headline="Get the next field note first."
  description="A concise operator note, the practical links, and one clear next move—delivered when the work is ready."
  actionLabel="Request the next edition"
  submitLabel="Subscribe"
  note="Double opt-in. Occasional field notes. Unsubscribe whenever it stops being useful."
  source={`io-newsletter-${edition.slug}`}
/>


</div>
