<script lang="ts">
  /**
   * CatalogCard Component
   *
   * Generic card for catalog items (plugins, modules, etc.)
   * Consolidates shared structure from PluginCard and ModuleCard.
   * Canon-compliant with support for optional difficulty badges and metadata.
   */

  interface Props {
    /** URL slug for the item detail page */
    slug: string;
    /** Base path for the link (e.g., '/plugins' or '/modules') */
    basePath: string;
    /** Display name */
    name: string;
    /** Short description */
    description: string;
    /** Category label */
    category: string;
    /** Optional tags */
    tags?: string[];
    /** Optional difficulty level (beginner/intermediate/advanced) */
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    /** Optional metadata text (e.g., duration for modules) */
    metadata?: string;
    /** Custom class for additional styling */
    class?: string;
  }

  let {
    slug,
    basePath,
    name,
    description,
    category,
    tags = [],
    difficulty,
    metadata,
    class: className = ''
  }: Props = $props();
</script>

<a href="{basePath}/{slug}" class="catalog-card {className}">
  <div class="card-header">
    <span class="category-badge">{category}</span>
    {#if difficulty}
      <span class="difficulty-badge difficulty-{difficulty}">
        {difficulty}
      </span>
    {/if}
  </div>

  <div class="card-content">
    <h3 class="item-title">{name}</h3>
    <p class="item-description">{description}</p>

    {#if tags.length > 0}
      <div class="tags">
        {#each tags as tag}
          <span class="tag">{tag}</span>
        {/each}
      </div>
    {/if}

    {#if metadata}
      <p class="item-metadata">{metadata}</p>
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
  .catalog-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: var(--space-performance-md);
    border-radius: var(--radius-performance-scale-lg);
    background: transparent;
    border: 1px solid var(--color-performance-border-default);
    text-decoration: none;
    color: inherit;
    transition: all var(--duration-performance-micro) var(--ease-performance-standard);
    position: relative;
  }

  .catalog-card:hover {
    border-color: var(--color-performance-border-emphasis);
    background: var(--color-performance-bg-elevated);
    transform: scale(var(--scale-performance-micro));
  }

  .card-header {
    display: flex;
    gap: var(--space-performance-xs);
    margin-bottom: var(--space-performance-sm);
    flex-wrap: wrap;
    align-items: center;
  }

  .category-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background: var(--color-performance-bg-subtle);
    border-radius: var(--radius-performance-scale-md);
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-secondary);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  .difficulty-badge {
    font-size: var(--text-performance-body-sm);
    padding: 0.25rem 0.75rem;
    border-radius: var(--radius-performance-scale-sm);
    font-weight: 500;
    text-transform: capitalize;
  }

  .difficulty-beginner {
    background: var(--color-performance-success-muted);
    color: var(--color-performance-success);
  }

  .difficulty-intermediate {
    background: var(--color-performance-info-muted);
    color: var(--color-performance-info);
  }

  .difficulty-advanced {
    background: var(--color-performance-error-muted);
    color: var(--color-performance-error);
  }

  .card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-performance-sm);
    margin-bottom: var(--space-performance-md);
  }

  .item-title {
    font-size: var(--text-performance-body-lg);
    font-weight: 700;
    color: var(--color-performance-fg-primary);
    margin: 0;
    line-height: 1.3;
  }

  .item-description {
    font-size: var(--text-performance-body);
    color: var(--color-performance-fg-secondary);
    margin: 0;
    line-height: 1.5;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-performance-xs);
    margin-top: var(--space-performance-xs);
  }

  .tag {
    display: inline-block;
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-muted);
    background: var(--color-performance-bg-subtle);
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-performance-scale-sm);
    text-transform: lowercase;
  }

  .item-metadata {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-muted);
    margin: 0;
    margin-top: var(--space-performance-xs);
  }

  .card-footer {
    display: flex;
    align-items: center;
    gap: var(--space-performance-xs);
    padding-top: var(--space-performance-sm);
  }

  .explore-link {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-tertiary);
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: 500;
    transition: color var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .catalog-card:hover .explore-link {
    color: var(--color-performance-fg-secondary);
  }

  .arrow {
    display: inline-block;
    transition: transform var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .catalog-card:hover .arrow {
    transform: translateX(4px);
  }

  @media (prefers-reduced-motion: reduce) {
    .catalog-card,
    .arrow {
      transition: none;
    }
  }
</style>
