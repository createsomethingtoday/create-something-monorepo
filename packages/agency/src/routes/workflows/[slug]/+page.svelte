<script lang="ts">
  import { Button, SEO } from '@create-something/canon';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const guide = $derived(data.guide);
  const canonical = $derived(`https://createsomething.agency/workflows/${guide.slug}`);
  const breadcrumbs = $derived([
    { name: 'Home', url: 'https://createsomething.agency' },
    { name: 'Workflow Guides', url: 'https://createsomething.agency/workflows' },
    { name: guide.title, url: canonical }
  ]);
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

<article class="guide-shell" data-performance-mode="proof">
  <header class="guide-opening">
    <a class="guide-back" href="/workflows">Operator playbook</a>
    <p class="guide-eyebrow">{guide.eyebrow}</p>
    <h1>{guide.title}</h1>
    <p class="guide-answer">{guide.directAnswer}</p>
    <div class="guide-actions">
      <Button href="#operating-path">Run the play</Button>
      <Button href="/map" variant="secondary">Start a private workflow draft</Button>
    </div>
    <aside class="guide-route" aria-label="Operator playbook route">
      <span>Playbook route</span>
      <ol>
        <li><i class="guide-route__mark guide-route__mark--ring" aria-hidden="true">O</i><strong>Read signal</strong></li>
        <li><i class="guide-route__mark guide-route__mark--cross" aria-hidden="true">×</i><strong>Run play</strong></li>
        <li><i class="guide-route__mark guide-route__mark--ring" aria-hidden="true">O</i><strong>Review receipt</strong></li>
      </ol>
    </aside>
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
    <div class="section-label">01 / Read the signal</div>
    <div>
      <h2 id="signals-heading">Signals this play applies</h2>
      <ul>
        {#each guide.signals as signal}
          <li>{signal}</li>
        {/each}
      </ul>
    </div>
  </section>

  <section id="operating-path" class="guide-section" aria-labelledby="path-heading">
    <div class="section-label">02 / Run the play</div>
    <div>
      <h2 id="path-heading">A bounded way to move</h2>
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
    <div class="section-label">03 / Keep the system</div>
    <div>
      <h2 id="artifacts-heading">Playbook artifacts an operator can inspect</h2>
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
    <div class="section-label">04 / Review the receipt</div>
    <div>
      <h2 id="proof-heading">Follow the claim to live proof</h2>
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
    <div class="section-label">05 / Operator questions</div>
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
    <p class="section-label">Next plays</p>
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
    --guide-line: var(--color-performance-line);
    width: min(
      var(--content-width-performance),
      calc(100vw - var(--space-performance-page-gutter) - var(--space-performance-page-gutter))
    );
    margin: 0 auto;
    padding: var(--space-performance-xl) 0 var(--space-performance-2xl);
    color: var(--color-performance-ink);
  }

  .guide-opening {
    max-width: 920px;
    padding-bottom: var(--space-performance-xl);
  }

  .guide-back,
  .guide-eyebrow,
  .section-label {
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    line-height: var(--leading-performance-normal);
    letter-spacing: var(--tracking-performance-widest);
    text-transform: uppercase;
  }

  .guide-back {
    display: inline-block;
    margin-bottom: var(--space-performance-2xl);
    text-underline-offset: var(--space-performance-xs);
    transition: color var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .guide-back:hover {
    color: var(--color-performance-signal);
  }

  .guide-eyebrow {
    color: var(--color-performance-pressure);
  }

  .section-label {
    color: var(--color-performance-muted);
  }

  h1 {
    max-width: 19ch;
    margin: var(--space-performance-xs) 0 var(--space-performance-md);
    font-family: var(--font-performance-editorial);
    font-size: var(--text-performance-display-xl);
    font-weight: var(--font-performance-editorial-weight, 400);
    line-height: var(--leading-performance-editorial, 1.1);
    letter-spacing: -0.045em;
  }

  .guide-answer {
    max-width: 760px;
    margin: 0;
    font-family: var(--font-performance-prose);
    font-size: var(--text-performance-body-lg);
    line-height: var(--leading-performance-relaxed);
  }

  .guide-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-performance-xs);
    margin-top: var(--space-performance-md);
  }

  .guide-route {
    display: grid;
    grid-template-columns: minmax(8rem, 0.3fr) minmax(0, 1fr);
    gap: var(--space-performance-md);
    align-items: center;
    margin-top: var(--space-performance-lg);
    padding: var(--space-performance-sm) 0;
    border-top: 1px solid var(--guide-line);
    border-bottom: 1px solid var(--guide-line);
  }

  .guide-route > span,
  .guide-route strong {
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    line-height: var(--leading-performance-normal);
    letter-spacing: var(--tracking-performance-widest);
    text-transform: uppercase;
  }

  .guide-route > span {
    color: var(--color-performance-muted);
  }

  .guide-route ol {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-performance-xs);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .guide-route li {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: var(--space-performance-xs);
  }

  .guide-route__mark {
    display: grid;
    width: 1.25rem;
    height: 1.25rem;
    flex: 0 0 auto;
    place-items: center;
    font-family: var(--font-performance-display);
    font-size: var(--text-performance-body-md);
    font-style: normal;
    font-weight: var(--font-performance-display-weight);
    line-height: 1;
  }

  .guide-route__mark--ring {
    color: var(--color-performance-controlled);
  }

  .guide-route__mark--cross {
    color: var(--color-performance-signal);
  }

  .guide-decision {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: var(--space-performance-xl) 0 0;
    border-top: 1px solid var(--guide-line);
    border-bottom: 1px solid var(--guide-line);
  }

  .guide-decision div {
    padding: var(--space-performance-md) var(--space-performance-md) var(--space-performance-md) 0;
    border-top: 2px solid var(--color-performance-ready);
  }

  .guide-decision div + div {
    padding-left: var(--space-performance-md);
    border-top-color: var(--color-performance-review);
    border-left: 1px solid var(--guide-line);
  }

  dt,
  .step-list > li > span,
  .proof-list a > span,
  .guide-related a > span {
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-operator-label);
    line-height: var(--leading-performance-topology-label);
    letter-spacing: var(--tracking-performance-operator-label);
    text-transform: uppercase;
  }

  .guide-decision dt {
    color: var(--color-performance-ready);
  }

  .guide-decision div + div dt {
    color: var(--color-performance-review);
  }

  dd {
    margin: var(--space-performance-xs) 0 0;
    font-family: var(--font-performance-prose);
    line-height: var(--leading-performance-relaxed);
  }

  .guide-section {
    display: grid;
    grid-template-columns: minmax(120px, 0.3fr) minmax(0, 1fr);
    gap: var(--space-performance-xl);
    padding: var(--space-performance-xl) 0;
    border-top: 1px solid var(--guide-line);
    scroll-margin-top: var(--distance-performance-stage-sticky-offset);
  }

  .guide-section > div:last-child {
    min-width: 0;
  }

  h2 {
    max-width: 24ch;
    margin: 0 0 var(--space-performance-md);
    font-family: var(--font-performance-display);
    font-size: var(--text-performance-display-sm);
    font-weight: var(--font-performance-display-weight);
    line-height: var(--leading-performance-display);
    letter-spacing: var(--tracking-performance-display);
  }

  h3 {
    margin: 0;
    font-family: var(--font-performance-display);
    font-size: var(--text-performance-h3);
    font-weight: var(--font-performance-display-weight);
    line-height: var(--leading-performance-tight);
  }

  .guide-signals ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .guide-signals li {
    position: relative;
    padding: var(--space-performance-sm) 0 var(--space-performance-sm) var(--space-performance-md);
    border-top: 1px solid var(--guide-line);
    font-family: var(--font-performance-prose);
    line-height: var(--leading-performance-relaxed);
  }

  .guide-signals li::before {
    content: '';
    position: absolute;
    top: calc(var(--space-performance-sm) + var(--space-performance-xs));
    left: 0;
    width: var(--space-performance-xs);
    height: var(--space-performance-xs);
    background: var(--color-performance-controlled);
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
    gap: var(--space-performance-md);
    padding: var(--space-performance-md) 0;
    border-top: 1px solid var(--guide-line);
  }

  .step-list > li > span {
    color: var(--color-performance-signal);
  }

  .step-list p,
  .artifact-grid p,
  .proof-list p,
  .faq-list p {
    margin: var(--space-performance-xs) 0 0;
    font-family: var(--font-performance-prose);
    line-height: var(--leading-performance-relaxed);
  }

  .artifact-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border: 1px solid var(--guide-line);
  }

  .artifact-grid article {
    padding: var(--space-performance-md);
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
    gap: var(--space-performance-md);
    padding: var(--space-performance-md) 0;
    border-bottom: 1px solid var(--guide-line);
    color: inherit;
    text-decoration: none;
    transition: color var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .proof-list a:hover {
    color: var(--color-performance-signal);
  }

  .proof-list a > span {
    color: var(--color-performance-signal);
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
    padding: var(--space-performance-md) var(--space-performance-xl) var(--space-performance-md) 0;
    cursor: pointer;
    font-family: var(--font-performance-display);
    font-size: var(--text-performance-body-md);
    font-weight: var(--font-performance-semibold);
  }

  details p {
    max-width: 760px;
    padding: 0 var(--space-performance-xl) var(--space-performance-md) 0;
  }

  .guide-related {
    padding-top: var(--space-performance-xl);
    border-top: 1px solid var(--guide-line);
  }

  .guide-related > div {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: var(--space-performance-sm);
    border: 1px solid var(--guide-line);
  }

  .guide-related a {
    display: flex;
    min-width: 0;
    min-height: 10rem;
    flex-direction: column;
    gap: var(--space-performance-sm);
    justify-content: space-between;
    padding: var(--space-performance-md);
    color: inherit;
    text-decoration: none;
    transition: color var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .guide-related a:hover {
    color: var(--color-performance-growth);
  }

  .guide-related a + a {
    border-left: 1px solid var(--guide-line);
  }

  .guide-related strong {
    font-family: var(--font-performance-display);
    font-size: var(--text-performance-h2);
    font-weight: var(--font-performance-display-weight);
    line-height: var(--leading-performance-tight);
  }

  @media (max-width: 48rem) {
    .guide-shell {
      width: calc(
        100vw - var(--space-performance-page-gutter) - var(--space-performance-page-gutter)
      );
    }

    .guide-decision,
    .guide-section,
    .artifact-grid,
    .guide-related > div {
      grid-template-columns: 1fr;
    }

    .guide-route {
      grid-template-columns: 1fr;
      gap: var(--space-performance-xs);
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
      gap: var(--space-performance-md);
    }

    .proof-list a {
      grid-template-columns: 1fr;
      gap: var(--space-performance-xs);
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
      transition-duration: var(--duration-performance-instant) !important;
    }
  }
</style>
