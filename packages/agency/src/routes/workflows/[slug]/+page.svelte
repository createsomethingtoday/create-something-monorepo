<script lang="ts">
  import { Button, SEO } from '@create-something/canon';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const guide = data.guide;
  const canonical = `https://createsomething.agency/workflows/${guide.slug}`;
  const breadcrumbs = [
    { name: 'Home', url: 'https://createsomething.agency' },
    { name: 'Workflow Guides', url: 'https://createsomething.agency/workflows' },
    { name: guide.title, url: canonical }
  ];
</script>

<SEO
  title={guide.seoTitle}
  description={guide.description}
  keywords={guide.keywords.join(', ')}
  {canonical}
  ogType="article"
  publishedTime={guide.publishedTime}
  modifiedTime={guide.modifiedTime}
  articleSection="Workflow Guides"
  articleTags={guide.keywords}
  faqItems={guide.faqs}
  {breadcrumbs}
  propertyName="agency"
/>

<article class="guide-shell">
  <header class="guide-opening">
    <a class="guide-back" href="/workflows">Workflow guides</a>
    <p class="guide-eyebrow">{guide.eyebrow}</p>
    <h1>{guide.title}</h1>
    <p class="guide-answer">{guide.directAnswer}</p>
    <div class="guide-actions">
      <Button href="#operating-path">Use the operating path</Button>
      <Button href="/map" variant="secondary">Map one workflow</Button>
    </div>
    <dl class="guide-decision">
      <div>
        <dt>Good fit</dt>
        <dd>{guide.fit}</dd>
      </div>
      <div>
        <dt>Pause when</dt>
        <dd>{guide.notFit}</dd>
      </div>
    </dl>
  </header>

  <section class="guide-section guide-signals" aria-labelledby="signals-heading">
    <div class="section-label">01 / Recognize the work</div>
    <div>
      <h2 id="signals-heading">Signals this guide applies</h2>
      <ul>
        {#each guide.signals as signal}
          <li>{signal}</li>
        {/each}
      </ul>
    </div>
  </section>

  <section id="operating-path" class="guide-section" aria-labelledby="path-heading">
    <div class="section-label">02 / Operating path</div>
    <div>
      <h2 id="path-heading">A bounded way to proceed</h2>
      <ol class="step-list">
        {#each guide.steps as step, index}
          <li>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </div>
          </li>
        {/each}
      </ol>
    </div>
  </section>

  <section class="guide-section" aria-labelledby="artifacts-heading">
    <div class="section-label">03 / What remains</div>
    <div>
      <h2 id="artifacts-heading">Artifacts an operator can inspect</h2>
      <div class="artifact-grid">
        {#each guide.artifacts as artifact}
          <article>
            <h3>{artifact.title}</h3>
            <p>{artifact.detail}</p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section class="guide-section" aria-labelledby="proof-heading">
    <div class="section-label">04 / Owned evidence</div>
    <div>
      <h2 id="proof-heading">Follow the claim to a working surface</h2>
      <div class="proof-list">
        {#each guide.proofLinks as proof}
          <a href={proof.href}>
            <span>{proof.label}</span>
            <p>{proof.detail}</p>
          </a>
        {/each}
      </div>
    </div>
  </section>

  <section class="guide-section" aria-labelledby="faq-heading">
    <div class="section-label">05 / Direct answers</div>
    <div>
      <h2 id="faq-heading">Questions operators ask</h2>
      <div class="faq-list">
        {#each guide.faqs as faq}
          <details>
            <summary>{faq.question}</summary>
            <p>{faq.answer}</p>
          </details>
        {/each}
      </div>
    </div>
  </section>

  <footer class="guide-related">
    <p class="section-label">Related workflow guides</p>
    <div>
      {#each data.related as related}
        <a href={`/workflows/${related.slug}`}>
          <span>{related.eyebrow}</span>
          <strong>{related.title}</strong>
        </a>
      {/each}
    </div>
  </footer>
</article>

<style>
  .guide-shell {
    --guide-line: color-mix(in srgb, var(--color-performance-ink, #090909) 18%, transparent);
    width: min(100%, 1120px);
    margin: 0 auto;
    padding: clamp(2rem, 6vw, 5.5rem) clamp(1rem, 4vw, 3rem) clamp(4rem, 9vw, 8rem);
  }

  .guide-opening {
    max-width: 920px;
    padding-bottom: clamp(3rem, 8vw, 7rem);
  }

  .guide-back,
  .guide-eyebrow,
  .section-label {
    font-family: var(--font-performance-mono, ui-monospace, monospace);
    font-size: 0.75rem;
    line-height: 1.4;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .guide-back {
    display: inline-block;
    margin-bottom: clamp(3rem, 9vw, 7.5rem);
    text-underline-offset: 0.3em;
  }

  .guide-eyebrow,
  .section-label {
    color: color-mix(in srgb, var(--color-performance-ink, #090909) 62%, transparent);
  }

  h1 {
    max-width: 19ch;
    margin: 0.75rem 0 1.5rem;
    font-family: var(--font-performance-serif, Georgia, serif);
    font-size: clamp(2.85rem, 7vw, 6.6rem);
    font-weight: 400;
    line-height: 0.94;
    letter-spacing: -0.045em;
  }

  .guide-answer {
    max-width: 760px;
    margin: 0;
    font-size: clamp(1.16rem, 2vw, 1.55rem);
    line-height: 1.55;
  }

  .guide-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 2rem;
  }

  .guide-decision {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: clamp(3rem, 7vw, 6rem) 0 0;
    border-top: 1px solid var(--guide-line);
    border-bottom: 1px solid var(--guide-line);
  }

  .guide-decision div {
    padding: 1.5rem 1.5rem 1.75rem 0;
  }

  .guide-decision div + div {
    padding-left: 1.5rem;
    border-left: 1px solid var(--guide-line);
  }

  dt,
  .step-list > li > span,
  .proof-list a > span,
  .guide-related a > span {
    font-family: var(--font-performance-mono, ui-monospace, monospace);
    font-size: 0.72rem;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  dd {
    margin: 0.65rem 0 0;
    line-height: 1.6;
  }

  .guide-section {
    display: grid;
    grid-template-columns: minmax(120px, 0.3fr) minmax(0, 1fr);
    gap: clamp(1.5rem, 5vw, 5rem);
    padding: clamp(3rem, 7vw, 6rem) 0;
    border-top: 1px solid var(--guide-line);
    scroll-margin-top: 6rem;
  }

  .guide-section > div:last-child {
    min-width: 0;
  }

  h2 {
    max-width: 24ch;
    margin: 0 0 2rem;
    font-family: var(--font-performance-serif, Georgia, serif);
    font-size: clamp(2rem, 4.5vw, 4rem);
    font-weight: 400;
    line-height: 1;
    letter-spacing: -0.035em;
  }

  h3 {
    margin: 0;
    font-size: clamp(1.05rem, 1.8vw, 1.3rem);
    font-weight: 600;
    line-height: 1.25;
  }

  .guide-signals ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .guide-signals li {
    padding: 1.1rem 0 1.1rem 1.5rem;
    border-top: 1px solid var(--guide-line);
    line-height: 1.55;
    position: relative;
  }

  .guide-signals li::before {
    content: '';
    position: absolute;
    top: 1.7rem;
    left: 0;
    width: 0.42rem;
    height: 0.42rem;
    background: var(--color-performance-ink, #090909);
    transform: rotate(45deg);
  }

  .step-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .step-list li {
    display: grid;
    grid-template-columns: 3rem minmax(0, 1fr);
    gap: 1.25rem;
    padding: 1.5rem 0;
    border-top: 1px solid var(--guide-line);
  }

  .step-list p,
  .artifact-grid p,
  .proof-list p,
  .faq-list p {
    margin: 0.65rem 0 0;
    line-height: 1.65;
  }

  .artifact-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border: 1px solid var(--guide-line);
  }

  .artifact-grid article {
    padding: clamp(1.2rem, 3vw, 2rem);
  }

  .artifact-grid article + article {
    border-left: 1px solid var(--guide-line);
  }

  .proof-list {
    border-top: 1px solid var(--guide-line);
  }

  .proof-list a {
    display: grid;
    grid-template-columns: minmax(150px, 0.42fr) minmax(0, 1fr);
    gap: 1.5rem;
    padding: 1.4rem 0;
    border-bottom: 1px solid var(--guide-line);
    color: inherit;
    text-decoration: none;
  }

  .proof-list p {
    margin-top: 0;
  }

  .faq-list {
    border-top: 1px solid var(--guide-line);
  }

  details {
    border-bottom: 1px solid var(--guide-line);
  }

  summary {
    padding: 1.4rem 2.5rem 1.4rem 0;
    cursor: pointer;
    font-size: 1.05rem;
    font-weight: 600;
  }

  details p {
    max-width: 760px;
    padding: 0 2.5rem 1.6rem 0;
  }

  .guide-related {
    padding-top: clamp(3rem, 7vw, 6rem);
    border-top: 1px solid var(--guide-line);
  }

  .guide-related > div {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: 1.25rem;
    border: 1px solid var(--guide-line);
  }

  .guide-related a {
    display: flex;
    min-width: 0;
    min-height: 10rem;
    flex-direction: column;
    gap: 1rem;
    justify-content: space-between;
    padding: 1.5rem;
    color: inherit;
    text-decoration: none;
  }

  .guide-related a + a {
    border-left: 1px solid var(--guide-line);
  }

  .guide-related strong {
    font-family: var(--font-performance-serif, Georgia, serif);
    font-size: 1.4rem;
    font-weight: 400;
    line-height: 1.15;
  }

  @media (max-width: 720px) {
    .guide-decision,
    .guide-section,
    .artifact-grid,
    .guide-related > div {
      grid-template-columns: 1fr;
    }

    .guide-decision div + div,
    .artifact-grid article + article,
    .guide-related a + a {
      padding-left: 0;
      border-top: 1px solid var(--guide-line);
      border-left: 0;
    }

    .guide-decision div + div {
      padding-left: 0;
    }

    .guide-section {
      gap: 1.25rem;
    }

    .proof-list a {
      grid-template-columns: 1fr;
      gap: 0.55rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(html) {
      scroll-behavior: auto !important;
    }

    .guide-shell *,
    .guide-shell *::before,
    .guide-shell *::after {
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>
