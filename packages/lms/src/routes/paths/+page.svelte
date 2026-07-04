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

<div class="max-w-4xl mx-auto px-6 py-12">
  <h1 class="page-title">Operator Workflow Paths</h1>
  <p class="page-subtitle">
    Use the Codex app to create your first MCP-backed workflow, then use Canon to make the workflow
    visible through maps, boundaries, gates, receipts, and handoff artifacts.
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
          <span>{path.id === 'codex-mcp' ? 'Codex MCP-building skill' : 'Canon learning images'}</span>
          <span>Practical operator workflow</span>
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
