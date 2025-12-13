<script lang="ts">
	/**
	 * Section Layout Component
	 *
	 * For dividing pages into consistent sections with Canon spacing.
	 */

	import type { Snippet } from 'svelte';

	interface Props {
		/**
		 * Section ID for anchor links
		 */
		id?: string;
		/**
		 * Background variant
		 */
		background?: 'default' | 'surface' | 'elevated' | 'subtle';
		/**
		 * Vertical padding size
		 */
		padding?: 'sm' | 'md' | 'lg' | 'xl';
		/**
		 * Additional CSS classes
		 */
		class?: string;
		/**
		 * Section content
		 */
		children: Snippet;
	}

	let {
		id,
		background = 'default',
		padding = 'lg',
		class: className = '',
		children
	}: Props = $props();

	const bgMap = {
		default: 'bg-pure',
		surface: 'bg-surface',
		elevated: 'bg-elevated',
		subtle: 'bg-subtle'
	};

	const paddingMap = {
		sm: 'section-sm',
		md: 'section-md',
		lg: 'section-lg',
		xl: 'section-xl'
	};
</script>

<section {id} class="section {bgMap[background]} {paddingMap[padding]} {className}">
	{@render children()}
</section>

<style>
	.section {
		width: 100%;
	}

	.bg-pure {
		background: var(--color-bg-pure);
	}
	.bg-surface {
		background: var(--color-bg-surface);
	}
	.bg-elevated {
		background: var(--color-bg-elevated);
	}
	.bg-subtle {
		background: var(--color-bg-subtle);
	}

	.section-sm {
		padding-top: var(--space-md);
		padding-bottom: var(--space-md);
	}
	.section-md {
		padding-top: var(--space-lg);
		padding-bottom: var(--space-lg);
	}
	.section-lg {
		padding-top: var(--space-xl);
		padding-bottom: var(--space-xl);
	}
	.section-xl {
		padding-top: var(--space-2xl);
		padding-bottom: var(--space-2xl);
	}
</style>
