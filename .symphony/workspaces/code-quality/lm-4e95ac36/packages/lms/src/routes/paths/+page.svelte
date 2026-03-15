<script lang="ts">
  import { PATHS } from '$content/paths';
</script>

<svelte:head>
  <title>Codex MCP Course | CREATE SOMETHING Learn</title>
  <meta name="description" content="A single practical course for learning Codex by building an MCP." />
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-12">
  <h1 class="page-title">Codex MCP Course</h1>
  <p class="page-subtitle">
    This learn site is now one focused curriculum: build, connect, test, and ship an MCP server with
    Codex.
  </p>

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
          <span>Practical, code-first walkthrough</span>
        </div>
      </a>
    {/each}
  </div>
</div>

<style>
  .page-title {
    font-size: var(--text-h1);
    margin-bottom: var(--space-sm);
  }

  .page-subtitle {
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-xl);
  }

  .paths-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .path-row {
    display: block;
    padding: var(--space-lg);
    border-radius: var(--radius-xl);
    border: 1px solid var(--color-border-default);
    background: var(--color-bg-elevated);
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
  }

  .path-subtitle {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
  }

  .path-description {
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-sm);
  }

  .path-meta {
    display: flex;
    gap: var(--space-md);
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
  }
</style>
