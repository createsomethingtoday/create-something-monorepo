<script lang="ts">
  import { onMount } from 'svelte';

  type CheckTone = 'pass' | 'warn' | 'info';
  type StatusTone = 'ready' | 'inspect' | 'stream';

  type Preview = {
    id: string;
    label: string;
    route: string;
    request: string;
    summary: string;
    state: string;
    tone: StatusTone;
    stack: string[];
    checks: Array<{ label: string; tone: CheckTone }>;
    outputs: string[];
  };

  type Props = {
    eyebrow?: string;
    title?: string;
    description?: string;
    previews?: Preview[];
  };

  const DEFAULT_PREVIEWS: Preview[] = [
    {
      id: 'playground',
      label: 'Code Playground',
      route: '/playground',
      request: 'Run a Workers-safe JavaScript snippet with console streaming and async fetch support.',
      summary:
        'The runtime surface stays immediate: edge execution, web-standard APIs, and output frames in one loop.',
      state: 'Execution ready',
      tone: 'ready',
      stack: ['Workers Runtime', 'ES2022', 'Console Stream'],
      checks: [
        { label: 'Snippet sandboxed against the Workers runtime', tone: 'pass' },
        { label: 'Console frames returned in order', tone: 'pass' },
        { label: 'Network calls stay within runtime policy boundaries', tone: 'info' }
      ],
      outputs: ['stdout / stderr stream', 'timing + exit state', 'copyable request body']
    },
    {
      id: 'motion',
      label: 'Motion Lab',
      route: '/motion',
      request: 'Inspect a public URL, extract animation timing, and surface easing, cadence, and layered motion patterns.',
      summary:
        'The tool behaves like an audit surface: collect the motion system, expose the timing, and make the pattern legible.',
      state: 'Inspection live',
      tone: 'inspect',
      stack: ['Puppeteer', 'CSS Parser', 'Motion Analysis'],
      checks: [
        { label: 'Animation frames captured from the supplied page', tone: 'pass' },
        { label: 'Property-level easing map assembled', tone: 'pass' },
        { label: 'Sites with heavy client-side hydration may need a second pass', tone: 'warn' }
      ],
      outputs: ['timing ledger', 'easing inventory', 'phenomenological notes']
    },
    {
      id: 'data',
      label: 'Data Studio',
      route: '/data/nba',
      request: 'Hydrate live game data, blend cached snapshots, and calculate operator-facing signals in real time.',
      summary:
        'This is where practice and observability meet: live data, durable caching, and metrics that stay useful under load.',
      state: 'Realtime synced',
      tone: 'stream',
      stack: ['Workers', 'Cache', 'D1 Snapshots'],
      checks: [
        { label: 'Source data refreshed through a cached edge pipeline', tone: 'pass' },
        { label: 'Derived metrics calculated against the latest snapshot', tone: 'pass' },
        { label: 'Replay windows stay available for inspection and debugging', tone: 'info' }
      ],
      outputs: ['live metric boards', 'historical snapshots', 'derived signal layers']
    }
  ];

  let {
    eyebrow = 'Runtime preview',
    title = 'A live surface for practice',
    description = 'The workbench is where CREATE SOMETHING tests tools, runtime ideas, and interaction patterns against real execution surfaces.',
    previews = DEFAULT_PREVIEWS
  }: Props = $props();

  let activeIndex = $state(0);
  const activePreview = $derived(previews[activeIndex] ?? previews[0]);

  function selectPreview(index: number) {
    activeIndex = index;
  }

  onMount(() => {
    if (previews.length <= 1) return;

    const interval = window.setInterval(() => {
      activeIndex = (activeIndex + 1) % previews.length;
    }, 4000);

    return () => window.clearInterval(interval);
  });
</script>

<div class="terminal-surface runtime-workbench">
  <div class="terminal-surface__bar">
    <div class="terminal-surface__dots" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <span class="terminal-surface__title">space runtime preview</span>
    <span class={`status-chip ${activePreview.tone}`}>{activePreview.state}</span>
  </div>

  <div class="runtime-workbench__body">
    <div class="runtime-workbench__sidebar">
      <div class="runtime-workbench__intro">
        <span class="product-kicker">{eyebrow}</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <div class="preview-tabs" role="tablist" aria-label="Runtime previews">
        {#each previews as preview, index}
          <button
            type="button"
            class="preview-tab"
            class:selected={index === activeIndex}
            aria-pressed={index === activeIndex}
            onclick={() => selectPreview(index)}
          >
            <span class="preview-tab__label">{preview.label}</span>
            <span class="preview-tab__route">{preview.route}</span>
          </button>
        {/each}
      </div>
    </div>

    <div class="runtime-workbench__panel">
      <section class="panel-block">
        <span class="panel-label">Request</span>
        <p class="panel-command">{activePreview.request}</p>
        <div class="product-pills">
          {#each activePreview.stack as item}
            <span class="product-pill">{item}</span>
          {/each}
        </div>
      </section>

      <div class="panel-grid">
        <section class="panel-block">
          <span class="panel-label">Runtime checks</span>
          <ul class="check-list">
            {#each activePreview.checks as check}
              <li>
                <span class={`check-dot ${check.tone}`}></span>
                <span>{check.label}</span>
              </li>
            {/each}
          </ul>
        </section>

        <section class="panel-block">
          <span class="panel-label">Outputs</span>
          <ul class="output-list">
            {#each activePreview.outputs as output}
              <li>{output}</li>
            {/each}
          </ul>
        </section>
      </div>

      <section class="panel-block runtime-decision" class:streaming={activePreview.tone === 'stream'}>
        <span class="panel-label">Why it matters</span>
        <h4>{activePreview.state}</h4>
        <p>{activePreview.summary}</p>
      </section>
    </div>
  </div>
</div>

<style>
  .runtime-workbench {
    width: 100%;
    border-color: var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-md, 4px);
    background: var(--color-performance-panel, #ffffff);
    box-shadow: var(--shadow-performance-panel, none);
    color: var(--color-performance-ink, #090909);
  }

  :global(.runtime-workbench.terminal-surface)::before {
    display: none;
  }

  .runtime-workbench :global(.terminal-surface__bar) {
    border-bottom-color: var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-paper, #f3f3f0);
  }

  .runtime-workbench :global(.terminal-surface__title) {
    color: var(--color-fg-muted);
  }

  .runtime-workbench__body {
    display: grid;
    grid-template-columns: minmax(0, 16rem) minmax(0, 1fr);
  }

  .runtime-workbench__sidebar {
    display: grid;
    gap: 1.25rem;
    padding: 1.2rem;
    border-right: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-paper, #f3f3f0);
  }

  .runtime-workbench__intro {
    display: grid;
    gap: 0.8rem;
  }

  .runtime-workbench__intro h3 {
    margin: 0;
    font-size: clamp(1.4rem, 1.6vw, 1.85rem);
    line-height: 1.08;
    color: var(--color-fg-primary);
  }

  .runtime-workbench__intro p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: 0.95rem;
    line-height: 1.65;
  }

  .preview-tabs {
    display: grid;
    gap: 0.6rem;
  }

  .preview-tab {
    display: grid;
    gap: 0.3rem;
    padding: 0.9rem 0.95rem;
    border-radius: var(--radius-performance-md, 4px);
    border: 1px solid rgba(10, 14, 25, 0.08);
    background: var(--color-performance-panel, #ffffff);
    text-align: left;
    transition:
      border-color var(--duration-micro) var(--ease-standard),
      background var(--duration-micro) var(--ease-standard),
      transform var(--duration-micro) var(--ease-standard);
  }

  .preview-tab:hover {
    border-color: rgba(10, 14, 25, 0.16);
    background: var(--color-performance-court, #e6e6e0);
    transform: translateY(-1px);
  }

  .preview-tab.selected {
    border-color: rgba(49, 92, 255, 0.35);
    background: rgba(49, 92, 255, 0.08);
    box-shadow: none;
  }

  .preview-tab__label {
    color: var(--color-fg-primary);
    font-size: 0.9rem;
    font-weight: var(--font-semibold);
    line-height: 1.2;
  }

  .preview-tab__route,
  .panel-label {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
  }

  .runtime-workbench__panel {
    display: grid;
    gap: 1rem;
    padding: 1.2rem;
  }

  .panel-block {
    display: grid;
    gap: 0.75rem;
  }

  .panel-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .panel-command {
    margin: 0;
    padding: 1rem 1.05rem;
    border-radius: var(--radius-performance-md, 4px);
    border: 1px solid rgba(10, 14, 25, 0.08);
    background: var(--color-performance-paper, #f3f3f0);
    color: var(--color-fg-primary);
    font-family: var(--font-mono);
    font-size: 0.9rem;
    line-height: 1.7;
  }

  .check-list,
  .output-list {
    display: grid;
    gap: 0.65rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .check-list li,
  .output-list li {
    display: flex;
    gap: 0.7rem;
    align-items: flex-start;
    color: var(--color-fg-secondary);
    font-size: 0.95rem;
    line-height: 1.55;
  }

  .check-dot {
    display: inline-flex;
    width: 0.55rem;
    height: 0.55rem;
    margin-top: 0.38rem;
    border-radius: 999px;
    flex: 0 0 auto;
  }

  .check-dot.pass {
    background: rgba(82, 205, 154, 0.92);
  }

  .check-dot.warn {
    background: rgba(255, 184, 0, 0.92);
  }

  .check-dot.info {
    background: rgba(102, 173, 255, 0.92);
  }

  .runtime-decision {
    padding: 1rem 1.05rem;
    border-radius: var(--radius-performance-md, 4px);
    border: 1px solid rgba(49, 92, 255, 0.18);
    background: linear-gradient(180deg, rgba(49, 92, 255, 0.08), rgba(49, 92, 255, 0.03));
  }

  .runtime-decision.streaming {
    border-color: rgba(22, 184, 122, 0.22);
    background: linear-gradient(180deg, rgba(22, 184, 122, 0.08), rgba(22, 184, 122, 0.03));
  }

  .runtime-decision h4 {
    margin: 0;
    font-size: 1.15rem;
    color: var(--color-fg-primary);
  }

  .runtime-decision p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: 0.95rem;
    line-height: 1.65;
  }

  .status-chip {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 1.9rem;
    padding: 0 0.85rem;
    border-radius: 999px;
    border: 1px solid rgba(10, 14, 25, 0.12);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .status-chip.ready {
    background: rgba(22, 184, 122, 0.12);
    color: rgb(4, 120, 87);
  }

  .status-chip.inspect {
    background: rgba(49, 92, 255, 0.1);
    color: rgb(49, 92, 255);
  }

  .status-chip.stream {
    background: rgba(22, 184, 122, 0.12);
    color: rgb(4, 120, 87);
  }

  @media (max-width: 980px) {
    .runtime-workbench__body,
    .panel-grid {
      grid-template-columns: 1fr;
    }

    .runtime-workbench__sidebar {
      border-right: 0;
      border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    }
  }
</style>
