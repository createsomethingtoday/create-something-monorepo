<script lang="ts">
  import type { Module } from '$lib/types/modules';

  interface Props {
    module: Module;
    enabled?: boolean;
    onToggle?: (enabled: boolean) => void;
  }

  let { module, enabled = false, onToggle }: Props = $props();

  function handleToggle() {
    if (onToggle) {
      onToggle(!enabled);
    }
  }
</script>

<a href="/modules/{module.slug}" class="module-card">
  <div class="card-header">
    <span class="category-badge">{module.category}</span>
    {#if module.difficulty}
      <span class="difficulty-badge difficulty-{module.difficulty}">
        {module.difficulty}
      </span>
    {/if}
  </div>

  <div class="card-content">
    <h3 class="module-title">{module.name}</h3>
    <p class="module-description">{module.description}</p>

    {#if module.tags && module.tags.length > 0}
      <div class="tags">
        {#each module.tags as tag}
          <span class="tag">{tag}</span>
        {/each}
      </div>
    {/if}

    {#if module.duration}
      <p class="module-meta">{module.duration}</p>
    {/if}
  </div>

  <div class="card-footer">
    <span class="explore-link">
      Explore
      <span class="arrow" aria-hidden="true">→</span>
    </span>
  </div>
</a>

<style>
  .module-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: var(--space-md);
    border-radius: var(--radius-lg);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    text-decoration: none;
    color: inherit;
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .module-card:hover {
    border-color: var(--color-border-emphasis);
    background: var(--color-bg-subtle);
  }

  .card-header {
    display: flex;
    gap: var(--space-xs);
    margin-bottom: var(--space-sm);
    flex-wrap: wrap;
    align-items: center;
  }

  .category-badge {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  .difficulty-badge {
    font-size: var(--text-body-sm);
    padding: 0.25rem 0.75rem;
    border-radius: var(--radius-sm);
    font-weight: 500;
    text-transform: capitalize;
  }

  .difficulty-beginner {
    background: rgba(68, 170, 68, 0.1);
    color: var(--color-success);
  }

  .difficulty-intermediate {
    background: rgba(80, 130, 185, 0.1);
    color: var(--color-info);
  }

  .difficulty-advanced {
    background: rgba(212, 77, 77, 0.1);
    color: var(--color-error);
  }

  .card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .module-title {
    font-size: var(--text-body-lg);
    font-weight: 700;
    color: var(--color-fg-primary);
    margin: 0;
    line-height: 1.3;
  }

  .module-description {
    font-size: var(--text-body);
    color: var(--color-fg-secondary);
    margin: 0;
    line-height: 1.5;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    margin-top: var(--space-xs);
  }

  .tag {
    display: inline-block;
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
    background: var(--color-bg-subtle);
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    text-transform: lowercase;
  }

  .module-meta {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    margin: 0;
    margin-top: var(--space-xs);
  }

  .card-footer {
    margin-top: var(--space-sm);
    padding-top: var(--space-sm);
    border-top: 1px solid var(--color-border-default);
  }

  .explore-link {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: 500;
  }

  .arrow {
    display: inline-block;
    transition: transform var(--duration-micro) var(--ease-standard);
  }

  .module-card:hover .arrow {
    transform: translateX(4px);
  }

  @media (prefers-reduced-motion: reduce) {
    .module-card,
    .arrow {
      transition: none;
    }
  }
</style>
