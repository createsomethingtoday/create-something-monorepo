<script lang="ts">
  import { PATHS } from '$content/paths';

  const pathProof: Record<string, string> = {
    'codex-mcp': 'Working MCP receipt',
    'make-your-workflow-visible': 'Workflow proof map'
  };

  function pathTimeBudget(path: (typeof PATHS)[number]): string {
    const minutes = path.lessons.reduce(
      (total, lesson) => total + Number.parseInt(lesson.duration, 10),
      0
    );

    return `${minutes} min`;
  }
</script>

<svelte:head>
  <title>Operator Workflow Paths | CREATE SOMETHING Learn</title>
  <meta
    name="description"
    content="Operator learning paths for creating MCP workflows in the Codex app and making those workflows visible with Canon images."
  />
</svelte:head>

<div class="paths-shell">
  <header class="paths-hero">
    <p class="paths-kicker">Operator learning</p>
    <h1 class="page-title">Operator Workflow Paths</h1>
    <p class="page-subtitle">
      Use the Codex app to create your first MCP-backed workflow, then use Canon to make the
      workflow visible through maps, boundaries, gates, receipts, and handoff artifacts.
    </p>
  </header>

  <div class="paths-list">
    {#each PATHS as path, index}
      <a href="/paths/{path.id}" class="path-row {path.color}">
        <div class="path-record">
          <span>Path {String(index + 1).padStart(2, '0')}</span>
          <span>{path.lessons.length} lessons · {pathTimeBudget(path)}</span>
        </div>

        <div class="path-header">
          <div class="path-dot"></div>
          <h2 class="path-title">{path.title}</h2>
          <span class="path-subtitle">{path.subtitle}</span>
        </div>

        <p class="path-description">{path.description}</p>

        <dl class="path-ledger" aria-label={`${path.title} learning plan`}>
          <div>
            <dt>Next move</dt>
            <dd>{path.lessons[0]?.title ?? 'Review path'}</dd>
          </div>
          <div>
            <dt>Time budget</dt>
            <dd>{pathTimeBudget(path)}</dd>
          </div>
          <div>
            <dt>Proof artifact</dt>
            <dd>{pathProof[path.id]}</dd>
          </div>
        </dl>

        <span class="path-action">View sequence <span aria-hidden="true">→</span></span>
      </a>
    {/each}
  </div>
</div>

<style>
  .paths-shell {
    width: min(56rem, calc(100% - 2.5rem));
    margin-inline: auto;
    padding: clamp(3rem, 8vw, 5rem) 0;
    color: var(--color-performance-ink, #090909);
  }

  .paths-hero {
    display: grid;
    gap: 0.8rem;
    margin-bottom: clamp(2rem, 5vw, 3rem);
  }

  .paths-kicker {
    width: fit-content;
    margin: 0;
    padding: 0.35rem 0.6rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-mono);
    font-size: 0.76rem;
    font-weight: var(--font-semibold);
    line-height: 1.15;
    text-transform: uppercase;
  }

  .page-title {
    max-width: 12ch;
    margin: 0;
    color: var(--color-performance-ink, #090909);
    font-size: var(--text-h1);
    font-weight: var(--font-medium);
    line-height: 1.02;
    letter-spacing: 0;
  }

  .page-subtitle {
    max-width: 46rem;
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: var(--text-body-lg);
    line-height: 1.55;
  }

  .paths-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .path-row {
    display: block;
    padding: clamp(1.25rem, 3vw, 1.75rem);
    border-radius: var(--radius-performance-md, 4px);
    border: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-ink, #090909);
    text-decoration: none;
    transition:
      border-color var(--duration-micro) var(--ease-standard),
      background var(--duration-micro) var(--ease-standard);
  }

  .path-row:hover {
    border-color: var(--color-performance-line-strong, #9c9c96);
    background: var(--color-performance-court, #e6e6e0);
  }

  .path-row:focus-visible {
    outline: 2px solid var(--color-performance-focus, #171717);
    outline-offset: 3px;
  }

  .path-record {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: var(--font-semibold);
    letter-spacing: 0.06em;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .path-record span:last-child {
    color: var(--color-performance-muted, #5e6268);
    letter-spacing: 0;
    text-transform: none;
  }

  .path-header {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;
    column-gap: var(--space-sm);
    row-gap: 0.22rem;
    margin-bottom: var(--space-md);
  }

  .path-dot {
    width: 0.75rem;
    height: 0.75rem;
    margin-top: 0.38rem;
    border-radius: var(--radius-full);
    background: var(--path-color);
  }

  .path-title {
    grid-column: 2;
    margin: 0;
    font-size: var(--text-h3);
    font-weight: var(--font-semibold);
    line-height: 1.1;
  }

  .path-subtitle {
    grid-column: 2;
    color: var(--color-performance-muted, #5e6268);
    font-size: var(--text-body-sm);
    line-height: 1.35;
  }

  .path-description {
    color: var(--color-performance-muted, #5e6268);
    margin: 0;
    line-height: var(--leading-relaxed);
  }

  .path-ledger {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin: var(--space-lg) 0 var(--space-md);
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .path-ledger > div {
    display: grid;
    gap: 0.32rem;
    min-width: 0;
    padding: var(--space-sm) var(--space-md);
  }

  .path-ledger > div:first-child {
    padding-left: 0;
  }

  .path-ledger > div + div {
    border-left: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .path-ledger dt {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-mono);
    font-size: 0.66rem;
    font-weight: var(--font-semibold);
    letter-spacing: 0.06em;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .path-ledger dd {
    margin: 0;
    color: var(--color-performance-ink, #090909);
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    line-height: 1.35;
  }

  .path-action {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--color-performance-ink, #090909);
    font-size: var(--text-body-sm);
    font-weight: var(--font-semibold);
  }

  @media (max-width: 720px) {
    .path-header {
      margin-bottom: var(--space-sm);
    }

    .path-record {
      align-items: flex-start;
      flex-direction: column;
      gap: 0.25rem;
    }

    .path-ledger {
      grid-template-columns: minmax(0, 1fr);
      margin: var(--space-md) 0;
    }

    .path-ledger > div {
      padding: var(--space-sm) 0;
    }

    .path-ledger > div + div {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
      border-left: 0;
    }
  }
</style>
