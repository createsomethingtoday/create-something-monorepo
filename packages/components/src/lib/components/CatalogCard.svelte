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
		padding: var(--space-md);
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		text-decoration: none;
		color: inherit;
		transition: all var(--duration-micro) var(--ease-standard);
		position: relative;
	}

	.catalog-card:hover {
		border-color: var(--color-border-emphasis);
		background: var(--color-hover);
	}

	.card-header {
		display: flex;
		gap: var(--space-xs);
		margin-bottom: var(--space-sm);
		flex-wrap: wrap;
		align-items: center;
	}

	.category-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		white-space: nowrap;
	}

	.difficulty-badge {
		font-size: var(--text-body-sm);
		padding: 0.25rem 0.75rem;
		border-radius: var(--radius-sm);
		font-weight: 500;
		text-transform: capitalize;
	}

	.difficulty-beginner {
		background: var(--color-success-muted);
		color: var(--color-success);
	}

	.difficulty-intermediate {
		background: var(--color-info-muted);
		color: var(--color-info);
	}

	.difficulty-advanced {
		background: var(--color-error-muted);
		color: var(--color-error);
	}

	.card-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.item-title {
		font-size: var(--text-body-lg);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0;
		line-height: 1.3;
	}

	.item-description {
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
		color: var(--color-fg-muted);
		background: var(--color-bg-subtle);
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		text-transform: lowercase;
	}

	.item-metadata {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0;
		margin-top: var(--space-xs);
	}

	.card-footer {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	.explore-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-weight: 500;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.catalog-card:hover .explore-link {
		color: var(--color-fg-secondary);
	}

	.arrow {
		display: inline-block;
		transition: transform var(--duration-micro) var(--ease-standard);
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
