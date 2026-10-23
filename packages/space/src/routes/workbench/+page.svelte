<script lang="ts">
  import WorkshopTrace from '$lib/workshop/WorkshopTrace.svelte';
  import WorkshopScene from '$lib/workshop/WorkshopScene.svelte';
  import '$lib/workshop/workshop.css';
  import {
    Button,
    PerformanceCardGrid,
    PerformanceDecisionPanel,
    PerformancePageSection,
    SEO,
    type PerformanceCardItem,
    type PerformanceDecisionItem
  } from '@create-something/canon';

  const tools: PerformanceCardItem[] = [
    {
      eyebrow: 'Execution',
      icon: 'settings',
      title: 'Code Playground',
      href: '/playground',
      detail:
        'Execute JavaScript directly in the Workers runtime with console streaming, async support, and an inspectable request surface.'
    },
    {
      eyebrow: 'Guided practice',
      icon: 'check',
      title: 'Praxis',
      href: '/praxis',
      detail:
        'Learn integration patterns through guided challenges that turn runtime ideas into operator habits instead of abstract lessons.'
    },
    {
      eyebrow: 'Inspection',
      icon: 'clock',
      title: 'Motion Lab',
      href: '/motion',
      detail:
        'Analyze animation systems from any public URL with extracted timing, easing, sequencing, and motion architecture notes.'
    },
    {
      eyebrow: 'Realtime data',
      icon: 'document',
      title: 'Data Studio',
      href: '/data/nba',
      detail:
        'Work with live dashboards, historical snapshots, and derived metrics that stay useful under real refresh and caching conditions.'
    },
    {
      eyebrow: 'Concept graph',
      icon: 'search',
      title: 'Discover',
      href: '/discover',
      detail:
        'Map concepts across CREATE SOMETHING properties and use the network to move from idea to implementation and back again.'
    }
  ];

  const decisionStates: PerformanceDecisionItem[] = [
    {
      label: 'Run',
      summary: 'Live surface',
      title: 'Execute against the runtime.',
      detail:
        'The workbench earns its place when the visitor can run, inspect, or compare something real instead of reading a static promise.',
      tone: 'allow',
      evidence: [
        'Route performs real work',
        'Request and response shape stay visible',
        'Output can be repeated or compared'
      ],
      receipts: ['console output', 'route state', 'timing result'],
      actions: [{ label: 'Open Playground', href: '/playground' }]
    },
    {
      label: 'Inspect',
      summary: 'Behavior visible',
      title: 'Show the state behind the result.',
      detail:
        'When timing, easing, cache state, or data refresh affects the outcome, the interaction should surface that behavior directly.',
      tone: 'review',
      evidence: [
        'The user can see what changed',
        'Failure modes are part of the surface',
        'The next route is chosen by behavior, not hype'
      ],
      receipts: ['motion report', 'data snapshot', 'state trace'],
      actions: [
        { label: 'Inspect Motion', href: '/motion' },
        { label: 'Open Data', href: '/data/nba' }
      ]
    },
    {
      label: 'Promote',
      summary: 'Pattern survived',
      title: 'Move useful behavior into the right property.',
      detail:
        'A successful workbench result should become research when it teaches, or delivery when the workflow needs controls and owners.',
      tone: 'neutral',
      evidence: [
        'The runtime behavior is repeatable',
        'The artifact has a clear receiving property',
        'Promotion path names the owner and next decision'
      ],
      receipts: ['research note', 'handoff link', 'workflow cue'],
      actions: [
        { label: 'Read Pattern', href: 'https://createsomething.io' },
        {
          label: 'Map Workflow',
          href: 'https://createsomething.agency/practice?source=space&intent=runtime-to-practice&stage=qualify&lane=workflow_infrastructure'
        }
      ]
    }
  ];
</script>

<SEO
  title="Workbench | CREATE SOMETHING .space"
  description="CREATE SOMETHING .space is the live workbench for testing tools, runtimes, and interaction patterns on Cloudflare Workers."
  keywords="developer tools, code playground, motion analysis, realtime dashboards, Cloudflare Workers, live workbench, automation practice"
  ogImage="/og-image.png"
  propertyName="space"
/>

<div class="space-workbench">
  <header data-mobile-search-boundary class="workshop section">
    <div class="wrap story-opening">
      <div>
        <p class="eyebrow">CREATE SOMETHING .space / The Workbench</p>
        <h1>Try it.<br />Inspect what happens.</h1>
        <p class="lead">
          Code, motion, data, and guided practice. Pick a tool and work with its actual output.
        </p>
        <div class="actions">
          <Button href="/playground">Open The Playground</Button><Button
            href="/praxis"
            variant="secondary">Start Praxis</Button
          >
        </div>
      </div>
      <WorkshopScene scene="practice" eager />
    </div>
  </header>

  <PerformancePageSection
    variant="white"
    eyebrow="Live surfaces"
    title="Pick a route and work with the system directly."
    description="Each route exposes execution, analysis, or learning as a working surface—not a static marketing panel."
  >
    {#snippet after()}
      <PerformanceCardGrid items={tools} columns={3} ariaLabel="Live workbench surfaces" />
    {/snippet}
  </PerformancePageSection>

  <section class="workshop section">
    <div class="wrap">
      <WorkshopTrace />
      <details class="runtime-explanation">
        <summary>How the workbench organizes a runtime decision</summary>
        <PerformanceDecisionPanel
          density="compact"
          id="runtime-decision"
          eyebrow="Runtime decision path"
          title="Use interaction to show what can run, what needs inspection, and what should move."
          description="The workbench should communicate through visible state changes: execute, inspect, then promote only what survives runtime contact."
          items={decisionStates}
          ariaLabel="Runtime decision path"
        />
      </details>
      <div class="runtime-next">
        <p class="eyebrow">Pick a surface</p>
        <h2>Start with what<br />you want to inspect.</h2>
        <p class="lead">
          Open the playground to execute code, motion to inspect interaction systems, or data to
          work against a live refresh loop.
        </p>
        <div class="actions">
          <Button href="/motion">Inspect Motion</Button><Button href="/data/nba" variant="secondary"
            >Open Data Studio</Button
          >
        </div>
      </div>
    </div>
  </section>
</div>

<style>
  .runtime-explanation {
    margin-top: 2rem;
    border: 1px solid var(--color-performance-line);
  }
  .runtime-explanation summary {
    padding: 1.25rem;
    cursor: pointer;
    font: 0.85rem var(--font-performance-mono);
    min-height: 44px;
  }
  .runtime-explanation summary:focus-visible {
    outline: 3px solid var(--color-performance-signal);
    outline-offset: 4px;
  }
  .runtime-explanation :global(.clear-decision-panel) {
    --color-performance-ink: #090909;
    --color-performance-fg-primary: #090909;
    --color-performance-fg-secondary: #4b4e53;
    --color-performance-muted: #5e6268;
    --color-performance-panel: #ffffff;
    --color-performance-paper: #f3f3f0;
    --color-performance-court: #e6e6e0;
    color: #090909;
  }
  .runtime-next {
    padding-block: 3rem 0;
  }
  .runtime-next h2 {
    margin: 1.5rem 0;
  }

  /* Scope shared-component refinements to the .space Workbench. */
  .space-workbench :global(.clear-decision-panel__console),
  .space-workbench :global(.clear-card-grid__card) {
    box-shadow: none;
    border-radius: var(--radius-performance-md);
  }
  .space-workbench :global(.clear-card-grid__card:hover) {
    border-color: var(--color-performance-line-strong);
  }
  .space-workbench :global(a:focus-visible),
  .space-workbench :global(button:focus-visible) {
    outline: 3px solid var(--color-performance-signal);
    outline-offset: 4px;
  }
  .space-workbench :global(.clear-decision-panel__tab) {
    min-height: 44px;
  }
</style>
