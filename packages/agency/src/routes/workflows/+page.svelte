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
  title="AI Workflow Guides | CREATE SOMETHING .agency"
  description="Twelve practical guides for mapping, building, securing, evaluating, and operating AI workflows and MCP systems with explicit ownership and proof."
  keywords="AI workflow guides, MCP server development, AI workflow governance, human in the loop AI, Webflow Marketplace operations"
  canonical="https://createsomething.agency/workflows"
  {faqItems}
  propertyName="agency"
/>

<div class="library-shell" data-performance-mode="proof">
  <header class="library-opening">
    <p>Workflow library / 12 operating guides</p>
    <h1>Useful answers for work that must hold up under pressure.</h1>
    <div class="library-intro">
      <p>
        Start with one business handoff. These guides show how to map the work, connect the systems,
        place judgment, protect authority, and preserve proof.
      </p>
      <div>
        <Button href="#guides">Browse the guides</Button>
        <Button href="/map" variant="secondary">Map one workflow</Button>
      </div>
    </div>
  </header>

  <section id="guides" class="guide-index" aria-labelledby="guide-index-heading">
    <header>
      <span>Choose by the decision you need to make</span>
      <h2 id="guide-index-heading">Twelve bounded paths, not twelve keyword swaps.</h2>
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
      <span>How to use the library</span>
      <h2 id="method-heading">Read for a decision. Leave with an artifact.</h2>
    </div>
    <ol>
      <li>
        <strong>Recognize</strong><span>Match the guide to an observed operating signal.</span>
      </li>
      <li>
        <strong>Bound</strong><span>Use the fit and pause conditions before choosing tools.</span>
      </li>
      <li>
        <strong>Build</strong><span>Follow the operating path and keep the named artifacts.</span>
      </li>
      <li>
        <strong>Verify</strong><span
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
    margin: var(--space-performance-2xl) 0 var(--space-performance-xl);
    font-family: var(--font-performance-display);
    font-size: var(--text-performance-display-xl);
    font-weight: var(--font-performance-display-weight);
    line-height: var(--leading-performance-display);
    letter-spacing: var(--tracking-performance-display);
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
