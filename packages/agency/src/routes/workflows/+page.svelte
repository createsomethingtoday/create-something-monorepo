<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceConversionHandoff,
    PerformanceNarrativeStage,
    SEO,
    type PerformanceNarrativeScene
  } from '@create-something/canon';
  import { playbookHeroMedia } from '$lib/data/playbookHeroMedia';
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

  const playbookScenes: PerformanceNarrativeScene[] = [
    {
      id: 'signal',
      label: 'Read',
      summary: 'Start from observed work',
      title: 'Read the signal before choosing the system.',
      detail:
        'Match the guide to a live handoff, delay, exception, or review queue. The starting point is an operating signal—not a model or automation product.',
      tone: 'review',
      evidence: ['live handoff', 'named owner', 'observed delay or rework']
    },
    {
      id: 'boundary',
      label: 'Bound',
      summary: 'Protect the decision',
      title: 'Set the fit, pause, and approval conditions.',
      detail:
        'Each guide marks where AI can assist, where a person decides, which permissions matter, and what should stop before a tool path is selected.',
      tone: 'block',
      receipts: ['fit condition', 'pause condition', 'approval authority']
    },
    {
      id: 'run',
      label: 'Run',
      summary: 'Follow the owned route',
      title: 'Run the play and keep its operating artifacts.',
      detail:
        'Use the guide to name the source, action, decision state, output, and recovery route. The artifacts remain useful after a vendor or model changes.',
      tone: 'allow',
      evidence: ['workflow map', 'runbook', 'decision rules', 'recovery path']
    },
    {
      id: 'proof',
      label: 'Review',
      summary: 'Inspect the receipt',
      title: 'Follow every claim back to proof.',
      detail:
        'The guide ends with a receipt: the source, rule, decision, result, and evidence that lets the next operator understand what happened.',
      tone: 'neutral',
      receipts: ['source', 'rule', 'decision', 'result', 'recovery']
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

<div class="workflow-library property-performance" data-performance-mode="proof">
  <PerformanceCampaignOpening
    eyebrow="Operator playbook / 12 field guides"
    propertyRole="Workflow library"
    expression="editorial"
    title="Map the play. Build the system. Keep control."
    lede="A practical playbook for the business handoffs that need to move faster without losing the owner, the approval boundary, or the proof."
    proof={[
      { label: 'Library', value: '12 field guides' },
      { label: 'Operating route', value: 'Map / Build / Control' },
      { label: 'Receipt', value: 'Signal → Decision → Proof' }
    ]}
    density="compact"
    media={playbookHeroMedia.workflows}
    mediaMobilePlacement="background"
  >
    {#snippet actions()}
      <Button href="#guides" size="lg">Browse the guides</Button>
      <Button href="/map" variant="secondary">Start a private workflow draft</Button>
    {/snippet}
  </PerformanceCampaignOpening>

  <div class="library-shell">
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
  </div>

  <PerformanceNarrativeStage
    id="playbook-route"
    eyebrow="How to use the playbook"
    title="Read for a decision. Leave with a system your team can run."
    description="Each guide moves through the same four-part operating route, so the reader knows what to observe, protect, keep, and prove."
    scenes={playbookScenes}
    ariaLabel="Workflow Playbook operating route"
    expression="editorial"
  />

  <div class="library-shell library-shell--faq">
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

  <PerformanceConversionHandoff
    eyebrow="Private workflow draft"
    title="Choose the live handoff behind the guide."
    description="The library helps you recognize the pattern. The private draft turns one real workflow into an owner, boundary, operating route, and first proof requirement."
    handoff={{
      owner: 'Your workflow operator',
      authority: 'Draft the workflow; no production mutation',
      proof: 'Private map with owner, decision, stop, and receipt',
      state: 'draft'
    }}
    steps={[
      {
        label: 'Guide',
        title: 'Choose the closest operating pattern.',
        detail: 'Use the fit and pause conditions to name the right starting point.'
      },
      {
        label: 'Map',
        title: 'Bring one live handoff.',
        detail: 'Name the source, owner, action, approval boundary, and failure state.'
      },
      {
        label: 'Proof',
        title: 'Set the first verification gate.',
        detail: 'Decide what must be visible before any build or production change.'
      }
    ]}
    expression="editorial"
    density="concise"
  >
    {#snippet actions()}
      <Button href="/map" size="lg">Start a private workflow draft</Button>
      <Button href="#guides" variant="secondary">Return to the guides</Button>
    {/snippet}
  </PerformanceConversionHandoff>
</div>

<style>
  .workflow-library {
    background: var(--color-performance-panel);
    color: var(--color-performance-ink);
  }

  .library-shell {
    --library-line: var(--color-performance-line);
    width: min(
      var(--content-width-performance),
      calc(100vw - var(--space-performance-page-gutter) - var(--space-performance-page-gutter))
    );
    margin: 0 auto;
    padding: var(--space-performance-2xl) 0;
    color: var(--color-performance-ink);
  }

  .guide-index header > span,
  .library-faq > span,
  .guide-index a div > span {
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    line-height: var(--leading-performance-normal);
    letter-spacing: var(--tracking-performance-widest);
    text-transform: uppercase;
  }

  .guide-index header > span,
  .library-faq > span {
    color: var(--color-performance-pressure);
  }

  .guide-index,
  .library-faq {
    border-top: 1px solid var(--library-line);
    padding: var(--space-performance-xl) 0;
    scroll-margin-top: var(--distance-performance-stage-sticky-offset);
  }

  .guide-index header,
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

  summary {
    font-family: var(--font-performance-display);
  }

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

    .guide-index header,
    .library-faq {
      grid-template-columns: 1fr;
    }

    .guide-index a {
      grid-template-columns: 2rem minmax(0, 1fr) 1.25rem;
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
