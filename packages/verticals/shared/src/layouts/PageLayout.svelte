<script lang="ts">
	/**
	 * Base Page Layout
	 *
	 * Provides consistent page structure with optional hero and sections.
	 * Uses Canon spacing tokens.
	 */

	import type { Snippet } from 'svelte';

	interface Props {
		/**
		 * Maximum content width: 'narrow' (prose), 'standard', 'wide', 'full'
		 */
		width?: 'narrow' | 'standard' | 'wide' | 'full';
		/**
		 * Vertical padding: 'none', 'sm', 'md', 'lg'
		 */
		padding?: 'none' | 'sm' | 'md' | 'lg';
		/**
		 * Additional CSS classes
		 */
		class?: string;
		/**
		 * Page content
		 */
		children: Snippet;
	}

	let { width = 'standard', padding = 'lg', class: className = '', children }: Props = $props();

	const widthMap = {
		narrow: 'max-w-2xl',
		standard: 'max-w-5xl',
		wide: 'max-w-7xl',
		full: 'max-w-none'
	};

	const paddingMap = {
		none: '',
		sm: 'py-8',
		md: 'py-16',
		lg: 'py-24'
	};
</script>

<main class="page-layout {widthMap[width]} {paddingMap[padding]} {className}">
	{@render children()}
</main>

<style>
	.page-layout {
		width: 100%;
		margin-left: auto;
		margin-right: auto;
		padding-left: var(--space-sm);
		padding-right: var(--space-sm);
	}

	@media (min-width: 768px) {
		.page-layout {
			padding-left: var(--space-md);
			padding-right: var(--space-md);
		}
	}
</style>
