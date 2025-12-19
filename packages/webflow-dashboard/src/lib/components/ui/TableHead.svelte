<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		class?: string;
		sortable?: boolean;
		sorted?: boolean;
		direction?: 'asc' | 'desc';
		onclick?: () => void;
	}

	let {
		children,
		class: className = '',
		sortable = false,
		sorted = false,
		direction = 'asc',
		onclick
	}: Props = $props();
</script>

<th class="table-head {className}" class:sortable class:sorted role={sortable ? 'button' : undefined}>
	<button class="head-content" {onclick} disabled={!sortable} type="button">
		{@render children()}
		{#if sortable}
			<span class="sort-indicator" class:active={sorted} aria-hidden="true">
				{#if sorted}
					{direction === 'asc' ? '↑' : '↓'}
				{:else}
					↕
				{/if}
			</span>
		{/if}
	</button>
</th>

<style>
	.table-head {
		padding: 0;
		text-align: left;
		font-weight: 600;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.head-content {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: none;
		border: none;
		font: inherit;
		color: inherit;
		text-align: left;
		cursor: default;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.sortable .head-content {
		cursor: pointer;
	}

	.sortable .head-content:hover {
		color: var(--color-fg-primary);
		background: var(--color-hover);
	}

	.sortable .head-content:active {
		background: var(--color-active);
	}

	.sort-indicator {
		color: var(--color-fg-subtle);
		font-size: var(--text-caption);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.sort-indicator.active {
		color: var(--color-fg-primary);
	}

	.sortable .head-content:hover .sort-indicator {
		color: var(--color-fg-secondary);
	}
</style>
