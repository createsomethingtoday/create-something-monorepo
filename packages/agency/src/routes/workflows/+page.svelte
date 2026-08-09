<script lang="ts">
  import { Button, SEO } from '@create-something/canon';
  import { workflowPages } from '$lib/data/workflowPages';

  const faqItems = [
    {
      question: 'What is an AI workflow system?',
      answer:
        'An AI workflow system connects a business signal to a bounded decision and a verifiable result. It names records, owners, tools, approval rights, exceptions, and proof instead of treating a model response as completed work.'
    },
    {
      question: 'Where should a team begin with AI workflow automation?',
      answer:
        'Begin with one repeated handoff that has accessible source records, a responsible owner, measurable delay or rework, and reversible actions. Map it before selecting models, connectors, or agent frameworks.'
    },
    {
      question: 'Why does this library include MCP and Webflow operations?',
      answer:
        'MCP guides explain the connectivity and authority layer. Webflow operations guides show those principles inside real review, app, template, and Marketplace boundaries where evidence and human judgment must remain distinct.'
    }
  ];
</script>

<SEO
  title="AI Workflow Playbook | CREATE SOMETHING .agency"
  description="Twelve practical playbook guides for operators mapping, building, and controlling AI workflows and MCP systems with explicit ownership and proof."
  keywords="AI workflow guides, MCP server development, AI workflow governance, human in the loop AI, Webflow Marketplace operations"
  canonical="https://createsomething.agency/workflows"
  {faqItems}
  propertyName="agency"
/>

<div class="library-shell" data-performance-mode="proof">
  <header class="library-opening">
    <p>Operator playbook / 12 field guides</p>
    <div class="library-opening__main">
      <div>
        <h1>Map the play. Build the system. Keep control.</h1>
        <p class="library-opening__answer">
          A practical playbook for the business handoffs that need to move faster without
          losing the owner, the approval boundary, or the proof.
        </p>
      </div>
      <aside class="playbook-field" aria-labelledby="playbook-field-title">
        <div class="playbook-field__heading">
          <span>One shared playbook</span>
          <strong id="playbook-field-title">Signal → Decision → Proof</strong>
        </div>
        <ol aria-label="Map, Build, and Control operating route">
          <li>
            <span class="playbook-mark playbook-mark--ring" aria-hidden="true">O</span>
            <div><strong>Map</strong><span>Name the handoff and the owner.</span></div>
          </li>
          <li>
            <span class="playbook-mark playbook-mark--cross" aria-hidden="true">×</span>
            <div><strong>Build</strong><span>Connect the system and its boundaries.</span></div>
          </li>
          <li>
            <span class="playbook-mark playbook-mark--ring" aria-hidden="true">O</span>
            <div><strong>Control</strong><span>Review the receipt and recover.</span></div>
          </li>
        </ol>
      </aside>
    </div>
    <div class="library-intro">
      <p>
        Start with one live handoff. Each guide gives you a route to run, the operating artifacts to
        keep, and the proof to inspect when conditions change.
      </p>
      <div>
        <Button href="#guides">Browse the guides</Button>
        <Button href="/map" variant="secondary">Start a private workflow draft</Button>
      </div>
    </div>
  </header>

  <section id="guides" class="guide-index" aria-labelledby="guide-index-heading">
    <header>
      <span>Choose the next play</span>
      <h2 id="guide-index-heading">Twelve operating routes for work that has to hold up.</h2>
    </header>

    <ol>
      {#each workflowPages as guide, index}
        <li>
          <a href={`/workflows/${guide.slug}`}>
            <span class="guide-number">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <span>{guide.eyebrow}</span>
              <h3>{guide.title}</h3>
              <p>{guide.description}</p>
            </div>
            <span class="guide-arrow" aria-hidden="true">↗</span>
          </a>
        </li>
      {/each}
    </ol>
  </section>

  <section class="library-method" aria-labelledby="method-heading">
    <div>
      <span>How to use the playbook</span>
      <h2 id="method-heading">Read for a decision. Leave with a system your team can run.</h2>
    </div>
    <ol>
      <li>
        <strong>Read the signal</strong><span>Match the guide to an observed operating signal.</span>
      </li>
      <li>
        <strong>Set the boundary</strong><span>Use the fit and pause conditions before choosing tools.</span>
      </li>
      <li>
        <strong>Run the play</strong><span>Follow the operating path and keep the named artifacts.</span>
      </li>
      <li>
        <strong>Review the receipt</strong><span
          >Follow each claim to Agency-owned proof and related guidance.</span
        >
      </li>
    </ol>
  </section>

  <section class="library-faq" aria-labelledby="library-faq-heading">
    <span>Direct answers</span>
    <div>
      <h2 id="library-faq-heading">Before you choose a guide</h2>
      {#each faqItems as faq}
        <details>
          <summary>{faq.question}</summary>
          <p>{faq.answer}</p>
        </details>
      {/each}
    </div>
  </section>
</div>

<style>
  .library-shell {
    --library-line: var(--color-performance-line);
    width: min(
      var(--content-width-performance),
      calc(100vw - var(--space-performance-page-gutter) - var(--space-performance-page-gutter))
    );
    margin: 0 auto;
    padding: var(--space-performance-xl) 0 var(--space-performance-2xl);
    color: var(--color-performance-ink);
  }

  .library-opening {
    min-height: min(
      var(--height-performance-stage),
      calc(100vh - var(--height-performance-header))
    );
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding-bottom: var(--space-performance-xl);
  }

  .library-opening__main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.44fr);
    gap: var(--space-performance-xl);
    align-items: end;
    margin: var(--space-performance-2xl) 0 var(--space-performance-xl);
  }

  .library-opening > p,
  .guide-index header > span,
  .library-method > div > span,
  .library-faq > span,
  .guide-index a div > span {
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    line-height: var(--leading-performance-normal);
    letter-spacing: var(--tracking-performance-widest);
    text-transform: uppercase;
  }

  .library-opening > p,
  .guide-index header > span,
  .library-method > div > span,
  .library-faq > span {
    color: var(--color-performance-pressure);
  }

  h1 {
    max-width: 15ch;
    margin: 0;
    font-family: var(--font-performance-display);
    font-size: var(--text-performance-display-xl);
    font-weight: var(--font-performance-display-weight);
    line-height: var(--leading-performance-display);
    letter-spacing: var(--tracking-performance-display);
  }

  .library-opening__answer {
    max-width: 42rem;
    margin: var(--space-performance-md) 0 0;
    font-family: var(--font-performance-prose);
    font-size: var(--text-performance-body-lg);
    line-height: var(--leading-performance-relaxed);
  }

  .playbook-field {
    border: 1px solid var(--library-line);
    background: var(--color-performance-surface);
  }

  .playbook-field__heading {
    display: grid;
    gap: var(--space-performance-xs);
    padding: var(--space-performance-md);
    border-bottom: 1px solid var(--library-line);
  }

  .playbook-field__heading > span,
  .playbook-field li > div > strong {
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    line-height: var(--leading-performance-normal);
    letter-spacing: var(--tracking-performance-widest);
    text-transform: uppercase;
  }

  .playbook-field__heading > span {
    color: var(--color-performance-muted);
  }

  .playbook-field__heading > strong {
    font-family: var(--font-performance-display);
    font-size: var(--text-performance-h3);
    font-weight: var(--font-performance-display-weight);
    line-height: var(--leading-performance-tight);
  }

  .playbook-field ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .playbook-field li {
    display: grid;
    grid-template-columns: 2rem minmax(0, 1fr);
    gap: var(--space-performance-sm);
    align-items: center;
    padding: var(--space-performance-sm) var(--space-performance-md);
  }

  .playbook-field li + li {
    border-top: 1px solid var(--library-line);
  }

  .playbook-field li > div {
    display: grid;
    gap: calc(var(--space-performance-xs) / 2);
  }

  .playbook-field li > div > span {
    font-family: var(--font-performance-prose);
    font-size: var(--text-performance-body-sm);
    line-height: var(--leading-performance-normal);
  }

  .playbook-mark {
    display: grid;
    width: 1.65rem;
    height: 1.65rem;
    place-items: center;
    font-family: var(--font-performance-display);
    font-size: var(--text-performance-h3);
    font-weight: var(--font-performance-display-weight);
    line-height: 1;
  }

  .playbook-mark--ring {
    color: var(--color-performance-controlled);
  }

  .playbook-mark--cross {
    color: var(--color-performance-signal);
  }

  .library-intro {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-performance-xl);
    align-items: end;
    border-top: 1px solid var(--library-line);
    padding-top: var(--space-performance-md);
  }

  .library-intro > p {
    max-width: 680px;
    margin: 0;
    font-family: var(--font-performance-prose);
    font-size: var(--text-performance-body-lg);
    line-height: var(--leading-performance-relaxed);
  }

  .library-intro > div {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-performance-xs);
  }

  .guide-index,
  .library-method,
  .library-faq {
    border-top: 1px solid var(--library-line);
    padding: var(--space-performance-xl) 0;
    scroll-margin-top: var(--distance-performance-stage-sticky-offset);
  }

  .guide-index header,
  .library-method,
  .library-faq {
    display: grid;
    grid-template-columns: minmax(var(--width-performance-stage-index), 0.36fr) minmax(0, 1fr);
    gap: var(--space-performance-xl);
  }

  h2 {
    max-width: 24ch;
    margin: 0;
    font-family: var(--font-performance-display);
    font-size: var(--text-performance-display-sm);
    font-weight: var(--font-performance-display-weight);
    line-height: var(--leading-performance-display);
    letter-spacing: var(--tracking-performance-display);
  }

  .guide-index ol {
    margin: var(--space-performance-xl) 0 0;
    padding: 0;
    border-top: 1px solid var(--library-line);
    list-style: none;
  }

  .guide-index li {
    border-bottom: 1px solid var(--library-line);
  }

  .guide-index a {
    display: grid;
    grid-template-columns: 3rem minmax(0, 1fr) 2rem;
    gap: var(--space-performance-md);
    align-items: start;
    padding: var(--space-performance-md) 0;
    color: var(--color-performance-ink);
    text-decoration: none;
    transition:
      color var(--duration-performance-micro) var(--ease-performance-standard),
      opacity var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .guide-index a:hover {
    color: var(--color-performance-signal);
  }

  .guide-number,
  .guide-arrow {
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    line-height: var(--leading-performance-normal);
  }

  .guide-index h3 {
    margin: var(--space-performance-xs) 0 0;
    font-family: var(--font-performance-display);
    font-size: var(--text-performance-h2);
    font-weight: var(--font-performance-display-weight);
    line-height: var(--leading-performance-tight);
    letter-spacing: var(--tracking-performance-tight);
  }

  .guide-index a p {
    max-width: 700px;
    margin: var(--space-performance-xs) 0 0;
    font-family: var(--font-performance-prose);
    line-height: var(--leading-performance-relaxed);
  }

  .library-method > ol {
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--library-line);
    list-style: none;
  }

  .library-method li {
    display: grid;
    grid-template-columns: 7rem minmax(0, 1fr);
    gap: var(--space-performance-sm);
    padding: var(--space-performance-sm) 0;
    border-bottom: 1px solid var(--library-line);
    line-height: var(--leading-performance-normal);
  }

  .library-method strong,
  summary {
    font-family: var(--font-performance-display);
  }

  .library-method li > span,
  details p {
    font-family: var(--font-performance-prose);
  }

  .library-faq > div > h2 {
    margin-bottom: var(--space-performance-md);
  }

  details {
    border-top: 1px solid var(--library-line);
  }

  details:last-child {
    border-bottom: 1px solid var(--library-line);
  }

  summary {
    padding: var(--space-performance-md) var(--space-performance-xl) var(--space-performance-md) 0;
    cursor: pointer;
    font-size: var(--text-performance-body-md);
    font-weight: var(--font-performance-semibold);
  }

  details p {
    max-width: 720px;
    margin: 0;
    padding: 0 var(--space-performance-xl) var(--space-performance-md) 0;
    line-height: var(--leading-performance-relaxed);
  }

  @media (max-width: 48rem) {
    .library-shell {
      width: calc(
        100vw - var(--space-performance-page-gutter) - var(--space-performance-page-gutter)
      );
    }

    .library-opening {
      min-height: auto;
    }

    .library-intro,
    .library-opening__main,
    .guide-index header,
    .library-method,
    .library-faq {
      grid-template-columns: 1fr;
    }

    .library-intro {
      align-items: start;
    }

    .guide-index a {
      grid-template-columns: 2rem minmax(0, 1fr) 1.25rem;
    }

    .library-method {
      gap: var(--space-performance-lg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(html) {
      scroll-behavior: auto !important;
    }

    .library-shell *,
    .library-shell *::before,
    .library-shell *::after {
      scroll-behavior: auto !important;
      transition-duration: var(--duration-performance-instant) !important;
    }
  }
</style>
