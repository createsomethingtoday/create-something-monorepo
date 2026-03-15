<script lang="ts">
	/**
	 * BentoGrid - Asymmetric grid system for visual interest
	 *
	 * Creates Apple-style bento box layouts with featured items
	 * spanning multiple cells. Responsive by default.
	 *
	 * @example
	 * <BentoGrid>
	 *   <BentoItem span="wide">Featured content</BentoItem>
	 *   <BentoItem>Regular item</BentoItem>
	 *   <BentoItem>Regular item</BentoItem>
	 *   <BentoItem span="tall">Tall content</BentoItem>
	 * </BentoGrid>
	 */

	interface Props {
		/** Number of base columns */
		columns?: 2 | 3 | 4;
		/** Gap between items */
		gap?: 'sm' | 'md' | 'lg';
		/** Additional CSS classes */
		class?: string;
		children?: import('svelte').Snippet;
	}

	let {
		columns = 3,
		gap = 'md',
		class: className = '',
		children
	}: Props = $props();
</script>

<div
	class="bento bento--cols-{columns} bento--gap-{gap} {className}"
>
	{@render children?.()}
</div>

<style>
	.bento {
		display: grid;
		width: 100%;
	}

	/* Column configurations */
	.bento--cols-2 {
		grid-template-columns: repeat(2, 1fr);
	}

	.bento--cols-3 {
		grid-template-columns: repeat(3, 1fr);
	}

	.bento--cols-4 {
		grid-template-columns: repeat(4, 1fr);
	}

	/* Gap sizes */
	.bento--gap-sm {
		gap: var(--space-sm);
	}

	.bento--gap-md {
		gap: var(--space-md);
	}

	.bento--gap-lg {
		gap: var(--space-lg);
	}

	/* Responsive - stack on mobile */
	@media (max-width: 640px) {
		.bento--cols-2,
		.bento--cols-3,
		.bento--cols-4 {
			grid-template-columns: 1fr;
		}
	}

	@media (min-width: 641px) and (max-width: 1024px) {
		.bento--cols-3,
		.bento--cols-4 {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
