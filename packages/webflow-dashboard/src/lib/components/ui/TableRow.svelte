<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLTableRowElement> {
		children?: Snippet;
		/** Renders row as a card on mobile (<768px) when used with cardContent snippet */
		cardMode?: boolean;
		/** Content to render in card mode on mobile */
		cardContent?: Snippet;
	}

	let { class: className = '', children, cardMode = false, cardContent, ...restProps }: Props = $props();
</script>

{#if cardMode && cardContent}
	<!-- Card layout for mobile -->
	<div class="table-row-card">
		{@render cardContent()}
	</div>
{/if}

<!-- Table row (hidden on mobile when cardMode is true) -->
<tr class="table-row {className}" class:hide-on-mobile={cardMode} {...restProps}>
	{#if children}
		{@render children()}
	{/if}
</tr>

<style>
	.table-row {
		border-bottom: 1px solid var(--color-border-default);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.table-row:hover {
		background: var(--color-hover);
	}

	.table-row-card {
		display: none;
	}

	@media (max-width: 767px) {
		.table-row.hide-on-mobile {
			display: none;
		}

		.table-row-card {
			display: block;
			padding: var(--space-md);
			background: var(--color-bg-surface);
			border: 1px solid var(--color-border-default);
			border-radius: var(--radius-lg);
			margin-bottom: var(--space-sm);
			transition: border-color var(--duration-micro) var(--ease-standard);
		}

		.table-row-card:hover {
			border-color: var(--color-border-emphasis);
		}
	}
</style>
