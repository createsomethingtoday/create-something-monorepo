<script lang="ts">
  import { PATHS } from '$content/paths';
</script>

<svelte:head>
  <title>Learning Paths | CREATE SOMETHING Learn</title>
  <meta
    name="description"
    content="Practical paths for governed agent engineering, operator MCP workflows, and Canon proof images."
  />
</svelte:head>

<div class="paths-shell">
  <header class="paths-hero">
    <p class="paths-kicker">CREATE SOMETHING / Learn</p>
    <h1 class="page-title">Learning Paths</h1>
    <p class="page-subtitle">
      Build an agent you can explain and govern. Then deepen your operator practice with MCP tools and Canon workflow images. The <a href="/reference">reference library</a> covers 523 additional lessons across AI engineering.
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
          <span>{path.id === 'governed-agent-engineering' ? 'Agent systems and governance' : path.id === 'codex-mcp' ? 'Codex MCP-building skill' : 'Canon learning images'}</span>
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
    padding: clamp(1.75rem, 4vw, 2.5rem) 0;
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
    font-size: clamp(2rem, 4vw, 3.25rem);
    font-weight: var(--font-medium);
    line-height: 1.02;
    letter-spacing: 0;
  }

  .page-subtitle {
    max-width: 46rem;
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 1rem;
    line-height: 1.55;
  }

  .paths-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    border-top: 1px solid var(--color-performance-line);
  }

  .path-row {
    display: block;
    padding: var(--space-lg) var(--space-md);
    border-bottom: 1px solid var(--color-performance-line);
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-ink, #090909);
    transition:
      border-color var(--duration-micro) var(--ease-standard),
      background var(--duration-micro) var(--ease-standard);
  }

  .path-row:hover {
    border-color: var(--color-performance-line-strong, #9c9c96);
    background: var(--color-performance-court, #e6e6e0);
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
    color: var(--color-performance-muted, #5e6268);
    font-size: var(--text-body-sm);
  }

  .path-description {
    color: var(--color-performance-muted, #5e6268);
    margin-bottom: var(--space-sm);
    line-height: var(--leading-relaxed);
  }

  .path-meta {
    flex-wrap: wrap;
    display: flex;
    gap: var(--space-md);
    color: var(--color-performance-muted, #5e6268);
    font-size: var(--text-body-sm);
  }

  @media (max-width: 720px) {
    .path-row {
      padding: var(--space-md);
    }

    .path-header {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
