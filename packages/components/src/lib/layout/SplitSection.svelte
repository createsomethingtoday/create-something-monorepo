<script lang="ts">
	/**
	 * SplitSection - Two-column layout with flexible content distribution
	 *
	 * Supports multiple split ratios and responsive stacking.
	 * Content and media can be swapped for visual variety.
	 *
	 * @example
	 * <SplitSection>
	 *   {#snippet left()}
	 *     <h2>Feature Title</h2>
	 *     <p>Description...</p>
	 *   {/snippet}
	 *   {#snippet right()}
	 *     <img src="..." alt="..." />
	 *   {/snippet}
	 * </SplitSection>
	 */

	interface Props {
		/** Column ratio distribution */
		ratio?: '50-50' | '60-40' | '40-60' | '70-30' | '30-70';
		/** Vertical alignment of columns */
		align?: 'start' | 'center' | 'end';
		/** Reverse column order on desktop */
		reverse?: boolean;
		/** Gap between columns */
		gap?: 'sm' | 'md' | 'lg' | 'xl';
		/** Stack breakpoint */
		stackAt?: 'sm' | 'md' | 'lg' | 'never';
		/** Additional CSS classes */
		class?: string;
		left?: import('svelte').Snippet;
		right?: import('svelte').Snippet;
	}

	let {
		ratio = '50-50',
		align = 'center',
		reverse = false,
		gap = 'lg',
		stackAt = 'md',
		class: className = '',
		left,
		right
	}: Props = $props();

	const alignClass = `split--align-${align}`;
	const gapClass = `split--gap-${gap}`;
	const stackClass = `split--stack-${stackAt}`;
</script>

<div
	class="split split--{ratio} {alignClass} {gapClass} {stackClass} {className}"
	class:split--reverse={reverse}
>
	<div class="split__left">
		{@render left?.()}
	</div>
	<div class="split__right">
		{@render right?.()}
	</div>
</div>

<style>
	.split {
		display: grid;
		width: 100%;
	}

	/* Ratio variants */
	.split--50-50 {
		grid-template-columns: 1fr 1fr;
	}

	.split--60-40 {
		grid-template-columns: 1.5fr 1fr;
	}

	.split--40-60 {
		grid-template-columns: 1fr 1.5fr;
	}

	.split--70-30 {
		grid-template-columns: 2.33fr 1fr;
	}

	.split--30-70 {
		grid-template-columns: 1fr 2.33fr;
	}

	/* Gap sizes */
	.split--gap-sm {
		gap: var(--space-sm);
	}

	.split--gap-md {
		gap: var(--space-md);
	}

	.split--gap-lg {
		gap: var(--space-lg);
	}

	.split--gap-xl {
		gap: var(--space-xl);
	}

	/* Vertical alignment */
	.split--align-start {
		align-items: start;
	}

	.split--align-center {
		align-items: center;
	}

	.split--align-end {
		align-items: end;
	}

	/* Reverse order */
	.split--reverse .split__left {
		order: 2;
	}

	.split--reverse .split__right {
		order: 1;
	}

	/* Responsive stacking */
	@media (max-width: 640px) {
		.split--stack-sm {
			grid-template-columns: 1fr;
		}

		.split--stack-sm .split__left,
		.split--stack-sm .split__right {
			order: unset;
		}
	}

	@media (max-width: 768px) {
		.split--stack-md {
			grid-template-columns: 1fr;
		}

		.split--stack-md .split__left,
		.split--stack-md .split__right {
			order: unset;
		}
	}

	@media (max-width: 1024px) {
		.split--stack-lg {
			grid-template-columns: 1fr;
		}

		.split--stack-lg .split__left,
		.split--stack-lg .split__right {
			order: unset;
		}
	}

	/* Content styling defaults */
	.split__left,
	.split__right {
		min-width: 0; /* Prevent overflow */
	}
</style>
