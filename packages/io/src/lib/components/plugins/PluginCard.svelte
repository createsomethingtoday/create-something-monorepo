<script lang="ts">
	import type { Plugin } from '$lib/config/plugins';

	interface Props {
		plugin: Plugin;
	}

	let { plugin }: Props = $props();
</script>

<a href="/plugins/{plugin.slug}" class="plugin-card">
	<div class="card-header">
		<div class="category-badge">{plugin.category}</div>
	</div>

	<div class="card-content">
		<h3 class="plugin-name">{plugin.name}</h3>
		<p class="plugin-description">{plugin.description}</p>

		<div class="tags">
			{#each plugin.tags as tag}
				<span class="tag">{tag}</span>
			{/each}
		</div>
	</div>

	<div class="card-footer">
		<span class="explore-link">Explore →</span>
	</div>
</a>

<style>
	.plugin-card {
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-decoration: none;
		color: inherit;
		transition: all var(--duration-micro) var(--ease-standard);
		position: relative;
	}

	.plugin-card:hover {
		border-color: var(--color-border-emphasis);
		background: var(--color-hover);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-md);
		margin-bottom: var(--space-md);
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
		white-space: nowrap;
	}

	.card-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.plugin-name {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
		line-height: 1.3;
	}

	.plugin-description {
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
		padding: 0.25rem 0.5rem;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		color: var(--color-fg-muted);
		font-weight: 400;
		text-transform: lowercase;
	}

	.card-footer {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.plugin-card:hover .card-footer {
		color: var(--color-fg-secondary);
	}

	.explore-link {
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.plugin-card:hover .explore-link {
		transform: translateX(4px);
	}

	@media (prefers-reduced-motion: reduce) {
		.plugin-card,
		.explore-link {
			transition: none;
		}
	}
</style>
