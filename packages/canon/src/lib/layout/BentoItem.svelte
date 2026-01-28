<script lang="ts">
	/**
	 * BentoItem - Child component for BentoGrid
	 *
	 * Supports spanning multiple columns/rows for featured content.
	 * Works with BentoGrid for asymmetric layouts.
	 *
	 * @example
	 * <BentoItem span="wide">Featured content</BentoItem>
	 * <BentoItem span="tall">Sidebar content</BentoItem>
	 * <BentoItem span="large">Hero item</BentoItem>
	 */

	interface Props {
		/** How this item spans the grid */
		span?: 'default' | 'wide' | 'tall' | 'large';
		/** Background variant */
		variant?: 'default' | 'elevated' | 'glass';
		/** Additional CSS classes */
		class?: string;
		children?: import('svelte').Snippet;
	}

	let {
		span = 'default',
		variant = 'default',
		class: className = '',
		children
	}: Props = $props();
</script>

<div class="bento-item bento-item--{span} bento-item--{variant} {className}">
	{@render children?.()}
</div>

<style>
	.bento-item {
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		transition: border-color var(--duration-micro) var(--ease-standard);
		min-height: 12rem;
		display: flex;
		flex-direction: column;
	}

	/* Span configurations */
	.bento-item--default {
		grid-column: span 1;
		grid-row: span 1;
	}

	.bento-item--wide {
		grid-column: span 2;
		grid-row: span 1;
	}

	.bento-item--tall {
		grid-column: span 1;
		grid-row: span 2;
	}

	.bento-item--large {
		grid-column: span 2;
		grid-row: span 2;
	}

	/* Variant styles */
	.bento-item--default {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
	}

	.bento-item--default:hover {
		border-color: var(--color-border-emphasis);
	}

	.bento-item--elevated {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		box-shadow: var(--shadow-md);
	}

	.bento-item--elevated:hover {
		border-color: var(--color-border-emphasis);
	}

	.bento-item--glass {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--color-border-default);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
	}

	.bento-item--glass:hover {
		border-color: var(--color-border-emphasis);
		background: rgba(255, 255, 255, 0.05);
	}

	/* Responsive - reset spans on mobile */
	@media (max-width: 640px) {
		.bento-item--wide,
		.bento-item--tall,
		.bento-item--large {
			grid-column: span 1;
			grid-row: span 1;
		}
	}

	@media (min-width: 641px) and (max-width: 1024px) {
		.bento-item--large {
			grid-column: span 2;
			grid-row: span 1;
		}
	}
</style>
