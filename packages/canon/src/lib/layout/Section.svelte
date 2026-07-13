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

	const variantClass = $derived(`section--${variant}`);
	const sizeClass = $derived(`section--${size}`);
	const widthClass = $derived(`section--${width}`);
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
		padding-left: var(--space-performance-md);
		padding-right: var(--space-performance-md);
	}

	/* Padding sizes - practical values for page layout
	   Note: Avoids --space-performance-2xl (110px) and --space-performance-3xl (177px) which are
	   impractical for section padding. See CLAUDE.md "Spacing Guidance". */
	.section--sm {
		padding-top: var(--space-performance-lg);  /* ~42px */
		padding-bottom: var(--space-performance-lg);
	}

	.section--md {
		padding-top: var(--space-performance-xl);  /* ~68px */
		padding-bottom: var(--space-performance-xl);
	}

	.section--lg {
		padding-top: 6rem;             /* 96px - equivalent to py-24 */
		padding-bottom: 6rem;
	}

	.section--xl {
		padding-top: 8rem;             /* 128px - equivalent to py-32 */
		padding-bottom: 8rem;
	}

	/* Background variants */
	.section--default {
		background: var(--color-performance-bg-pure);
	}

	.section--subtle {
		background: var(--color-performance-bg-subtle);
	}

	.section--pure {
		background: var(--color-performance-bg-pure);
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
