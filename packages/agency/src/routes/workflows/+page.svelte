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

<div class="library-shell">
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
    --library-line: color-mix(in srgb, var(--color-performance-ink, #090909) 18%, transparent);
    width: min(100%, 1180px);
    margin: 0 auto;
    padding: clamp(2rem, 6vw, 5.5rem) clamp(1rem, 4vw, 3rem) clamp(4rem, 9vw, 8rem);
  }

  .library-opening {
    min-height: min(760px, calc(100vh - 72px));
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding-bottom: clamp(3rem, 7vw, 6rem);
  }

  .library-opening > p,
  .guide-index header > span,
  .library-method > div > span,
  .library-faq > span,
  .guide-index a div > span {
    font-family: var(--font-performance-mono, ui-monospace, monospace);
    font-size: 0.74rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1 {
    max-width: 15ch;
    margin: clamp(4rem, 10vw, 9rem) 0;
    font-family: var(--font-performance-serif, Georgia, serif);
    font-size: clamp(3.2rem, 8vw, 7.8rem);
    font-weight: 400;
    line-height: 0.9;
    letter-spacing: -0.05em;
  }

  .library-intro {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 2rem;
    align-items: end;
    border-top: 1px solid var(--library-line);
    padding-top: 1.5rem;
  }

  .library-intro > p {
    max-width: 680px;
    margin: 0;
    font-size: clamp(1.12rem, 2vw, 1.45rem);
    line-height: 1.55;
  }

  .library-intro > div {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .guide-index,
  .library-method,
  .library-faq {
    border-top: 1px solid var(--library-line);
    padding: clamp(3rem, 7vw, 6rem) 0;
    scroll-margin-top: 6rem;
  }

  .guide-index header,
  .library-method,
  .library-faq {
    display: grid;
    grid-template-columns: minmax(180px, 0.36fr) minmax(0, 1fr);
    gap: clamp(2rem, 6vw, 6rem);
  }

  h2 {
    max-width: 24ch;
    margin: 0;
    font-family: var(--font-performance-serif, Georgia, serif);
    font-size: clamp(2.2rem, 5vw, 4.8rem);
    font-weight: 400;
    line-height: 0.98;
    letter-spacing: -0.04em;
  }

  .guide-index ol {
    margin: clamp(2.5rem, 6vw, 5rem) 0 0;
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
    gap: clamp(1rem, 3vw, 2rem);
    align-items: start;
    padding: clamp(1.4rem, 3vw, 2.2rem) 0;
    color: inherit;
    text-decoration: none;
  }

  .guide-number,
  .guide-arrow {
    font-family: var(--font-performance-mono, ui-monospace, monospace);
    font-size: 0.76rem;
  }

  .guide-index h3 {
    margin: 0.5rem 0 0;
    font-family: var(--font-performance-serif, Georgia, serif);
    font-size: clamp(1.45rem, 3vw, 2.6rem);
    font-weight: 400;
    line-height: 1.05;
    letter-spacing: -0.025em;
  }

  .guide-index a p {
    max-width: 700px;
    margin: 0.75rem 0 0;
    line-height: 1.55;
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
    gap: 1rem;
    padding: 1.25rem 0;
    border-bottom: 1px solid var(--library-line);
    line-height: 1.5;
  }

  .library-faq > div > h2 {
    margin-bottom: 2rem;
  }

  details {
    border-top: 1px solid var(--library-line);
  }

  details:last-child {
    border-bottom: 1px solid var(--library-line);
  }

  summary {
    padding: 1.35rem 2.5rem 1.35rem 0;
    cursor: pointer;
    font-weight: 600;
  }

  details p {
    max-width: 720px;
    margin: 0;
    padding: 0 2.5rem 1.5rem 0;
    line-height: 1.65;
  }

  @media (max-width: 720px) {
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
      gap: 2rem;
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
      transition-duration: 0.01ms !important;
    }
  }
</style>
