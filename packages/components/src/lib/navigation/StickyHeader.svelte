<script lang="ts">
	/**
	 * StickyHeader Component
	 *
	 * Fixed header that reveals backdrop on scroll.
	 * Transparent at top, frosted glass when scrolled.
	 *
	 * Canon principle: Navigation recedes until needed.
	 *
	 * @example
	 * <StickyHeader>
	 *   <a href="/" slot="logo">BRAND</a>
	 *   <nav slot="nav">...</nav>
	 *   <div slot="actions">...</div>
	 * </StickyHeader>
	 */

	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		/** Scroll threshold before backdrop appears */
		scrollThreshold?: number;
		/** Show border when scrolled */
		showBorder?: boolean;
		/** Custom z-index */
		zIndex?: number;
		/** Logo/brand slot */
		logo?: Snippet;
		/** Navigation links slot */
		nav?: Snippet;
		/** Right-side actions slot */
		actions?: Snippet;
		/** Default slot for custom content */
		children?: Snippet;
	}

	let {
		scrollThreshold = 50,
		showBorder = true,
		zIndex = 50,
		logo,
		nav,
		actions,
		children
	}: Props = $props();

	let scrolled = $state(false);

	onMount(() => {
		function handleScroll() {
			scrolled = window.scrollY > scrollThreshold;
		}

		window.addEventListener('scroll', handleScroll, { passive: true });
		handleScroll();

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});
</script>

<header
	class="sticky-header"
	class:scrolled
	class:with-border={showBorder}
	style:--z-index={zIndex}
>
	<div class="header-container">
		{#if children}
			{@render children()}
		{:else}
			{#if logo}
				<div class="header-logo">
					{@render logo()}
				</div>
			{/if}

			{#if nav}
				<div class="header-nav">
					{@render nav()}
				</div>
			{/if}

			{#if actions}
				<div class="header-actions">
					{@render actions()}
				</div>
			{/if}
		{/if}
	</div>
</header>

<style>
	.sticky-header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: var(--z-index, 50);
		background: transparent;
		transition:
			background var(--duration-standard, 300ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)),
			border-color var(--duration-standard, 300ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.sticky-header.scrolled {
		/* Glass Design System - "The Automation Layer" */
		background-color: var(--glass-bg-light);
		backdrop-filter: blur(var(--glass-blur-lg)) var(--glass-saturate-lg);
		-webkit-backdrop-filter: blur(var(--glass-blur-lg)) var(--glass-saturate-lg);
	}

	.sticky-header.with-border.scrolled {
		border-bottom: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.header-container {
		width: 100%;
		max-width: 72rem;
		margin: 0 auto;
		padding: var(--space-sm, 1rem) var(--space-md, 1.618rem);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-lg, 2.618rem);
	}

	.header-logo {
		flex-shrink: 0;
	}

	.header-nav {
		display: none;
		flex: 1;
		justify-content: center;
	}

	@media (min-width: 768px) {
		.header-nav {
			display: flex;
		}
	}

	.header-actions {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: var(--space-sm, 1rem);
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.sticky-header {
			transition: none;
		}
	}
</style>
