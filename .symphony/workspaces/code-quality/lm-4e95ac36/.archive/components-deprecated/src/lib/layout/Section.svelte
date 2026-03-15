<script lang="ts">
	/**
	 * Section - Consistent section wrapper with Canon spacing
	 *
	 * Provides standardized vertical rhythm and optional background variants.
	 * All sections in a page should use this for visual consistency.
	 *
	 * @example
	 * <Section>
	 *   <h2>Section Title</h2>
	 *   <p>Content...</p>
	 * </Section>
	 *
	 * <Section variant="elevated" size="lg">
	 *   <FeatureGrid />
	 * </Section>
	 */

	interface Props {
		/** Background variant */
		variant?: 'default' | 'elevated' | 'subtle' | 'pure';
		/** Vertical padding size */
		size?: 'sm' | 'md' | 'lg' | 'xl';
		/** Maximum content width */
		width?: 'narrow' | 'default' | 'wide' | 'full';
		/** HTML id for anchor links */
		id?: string;
		/** Additional CSS classes */
		class?: string;
		children?: import('svelte').Snippet;
	}

	let {
		variant = 'default',
		size = 'lg',
		width = 'default',
		id,
		class: className = '',
		children
	}: Props = $props();

	const variantClass = `section--${variant}`;
	const sizeClass = `section--${size}`;
	const widthClass = `section--${width}`;
</script>

<section
	{id}
	class="section {variantClass} {sizeClass} {widthClass} {className}"
>
	<div class="section__container">
		{@render children?.()}
	</div>
</section>

<style>
	.section {
		width: 100%;
	}

	.section__container {
		margin: 0 auto;
		padding-left: var(--space-md);
		padding-right: var(--space-md);
	}

	/* Padding sizes (golden ratio) */
	.section--sm {
		padding-top: var(--space-lg);
		padding-bottom: var(--space-lg);
	}

	.section--md {
		padding-top: var(--space-xl);
		padding-bottom: var(--space-xl);
	}

	.section--lg {
		padding-top: var(--space-2xl);
		padding-bottom: var(--space-2xl);
	}

	.section--xl {
		padding-top: calc(var(--space-2xl) * 1.618);
		padding-bottom: calc(var(--space-2xl) * 1.618);
	}

	/* Background variants */
	.section--default {
		background: var(--color-bg-pure);
	}

	.section--elevated {
		background: var(--color-bg-elevated);
	}

	.section--subtle {
		background: var(--color-bg-subtle);
	}

	.section--pure {
		background: var(--color-bg-pure);
	}

	/* Content widths */
	.section--narrow .section__container {
		max-width: 40rem;
	}

	.section--default .section__container,
	.section--elevated .section__container,
	.section--subtle .section__container,
	.section--pure .section__container {
		max-width: 72rem;
	}

	/* Override for width classes */
	.section--narrow .section__container {
		max-width: 40rem;
	}

	.section--wide .section__container {
		max-width: 90rem;
	}

	.section--full .section__container {
		max-width: none;
		padding-left: 0;
		padding-right: 0;
	}

	/* Ensure width class takes precedence */
	.section.section--narrow .section__container {
		max-width: 40rem;
	}

	.section.section--default:not(.section--narrow):not(.section--wide):not(.section--full)
		.section__container {
		max-width: 72rem;
	}
</style>
