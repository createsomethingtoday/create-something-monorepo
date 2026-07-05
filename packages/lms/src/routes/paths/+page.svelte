<script lang="ts">
  import { PATHS } from '$content/paths';
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
      Use the Codex app to create your first MCP-backed workflow, then use Canon to make the workflow
      visible through maps, boundaries, gates, receipts, and handoff artifacts.
    </p>
  </header>

  <div class="paths-list">
    {#each PATHS as path}
      <a href="/paths/{path.id}" class="path-row {path.color}">
        <div class="path-header">
          <div class="path-dot"></div>
          <h2 class="path-title">{path.title}</h2>
          <span class="path-subtitle">{path.subtitle}</span>
        </div>

        <p class="path-description">{path.description}</p>

        <div class="path-meta">
          <span>{path.lessons.length} lessons</span>
          <span>{path.id === 'codex-mcp' ? 'Codex MCP-building skill' : 'Canon learning images'}</span>
          <span>Practical operator workflow</span>
        </div>
      </a>
    {/each}
  </div>
</div>

<style>
  .paths-shell {
    width: min(56rem, calc(100% - 2.5rem));
    margin-inline: auto;
    padding: clamp(3rem, 8vw, 5rem) 0;
    color: var(--color-clear-onyx, #0a0e19);
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
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-grey, #636363);
    font-family: var(--font-mono);
    font-size: 0.76rem;
    font-weight: var(--font-semibold);
    line-height: 1.15;
    text-transform: uppercase;
  }

  .page-title {
    max-width: 12ch;
    margin: 0;
    color: var(--color-clear-onyx, #0a0e19);
    font-size: var(--text-h1);
    font-weight: var(--font-medium);
    line-height: 1.02;
    letter-spacing: 0;
  }

  .page-subtitle {
    max-width: 46rem;
    margin: 0;
    color: var(--color-clear-grey, #636363);
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
    padding: var(--space-lg);
    border-radius: var(--radius-clear-md, 8px);
    border: 1px solid var(--color-clear-border, #e1e1e1);
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-onyx, #0a0e19);
    transition:
      border-color var(--duration-micro) var(--ease-standard),
      background var(--duration-micro) var(--ease-standard);
  }

  .path-row:hover {
    border-color: var(--color-clear-border-strong, #cecece);
    background: var(--color-clear-porcelain-soft, #f2f2f2);
  }

  .path-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-sm);
  }

  .path-dot {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: var(--radius-full);
    background: var(--path-color);
  }

  .path-title {
    font-size: var(--text-h3);
    font-weight: var(--font-semibold);
  }

  .path-subtitle {
    color: var(--color-clear-grey, #636363);
    font-size: var(--text-body-sm);
  }

  .path-description {
    color: var(--color-clear-grey, #636363);
    margin-bottom: var(--space-sm);
    line-height: var(--leading-relaxed);
  }

  .path-meta {
    flex-wrap: wrap;
    display: flex;
    gap: var(--space-md);
    color: var(--color-clear-grey-quiet, #818181);
    font-size: var(--text-body-sm);
  }

  @media (max-width: 720px) {
    .path-header {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
