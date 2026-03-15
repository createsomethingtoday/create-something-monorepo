<script lang="ts">
	/**
	 * MobileDrawer Component
	 *
	 * Slide-out drawer for mobile navigation.
	 * Supports both side drawer and bottom sheet variants.
	 *
	 * Canon principle: Mobile navigation should feel native.
	 *
	 * @example
	 * <MobileDrawer bind:open={menuOpen} position="right">
	 *   <nav>...</nav>
	 * </MobileDrawer>
	 */

	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		/** Whether the drawer is open */
		open?: boolean;
		/** Position of the drawer */
		position?: 'left' | 'right' | 'bottom';
		/** Close when clicking overlay */
		closeOnOverlayClick?: boolean;
		/** Close when pressing Escape */
		closeOnEscape?: boolean;
		/** Drawer content */
		children?: Snippet;
		/** Called when drawer should close */
		onclose?: () => void;
	}

	let {
		open = $bindable(false),
		position = 'right',
		closeOnOverlayClick = true,
		closeOnEscape = true,
		children,
		onclose
	}: Props = $props();

	function close() {
		open = false;
		onclose?.();
	}

	function handleOverlayClick() {
		if (closeOnOverlayClick) {
			close();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (closeOnEscape && event.key === 'Escape') {
			close();
		}
	}

	// Lock body scroll when open
	$effect(() => {
		if (typeof document !== 'undefined') {
			if (open) {
				document.body.style.overflow = 'hidden';
			} else {
				document.body.style.overflow = '';
			}
		}
	});

	onMount(() => {
		return () => {
			if (typeof document !== 'undefined') {
				document.body.style.overflow = '';
			}
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Overlay -->
	<div
		class="drawer-overlay"
		onclick={handleOverlayClick}
		onkeydown={(e) => e.key === 'Enter' && handleOverlayClick()}
		role="button"
		tabindex="-1"
		aria-label="Close drawer"
	></div>

	<!-- Drawer -->
	<div
		class="drawer"
		class:drawer-left={position === 'left'}
		class:drawer-right={position === 'right'}
		class:drawer-bottom={position === 'bottom'}
		role="dialog"
		aria-modal="true"
	>
		<div class="drawer-content">
			{#if children}
				{@render children()}
			{/if}
		</div>
	</div>
{/if}

<style>
	.drawer-overlay {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: var(--color-overlay, rgba(0, 0, 0, 0.5));
		animation: fadeIn var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.drawer {
		position: fixed;
		z-index: 50;
		background: var(--color-bg-elevated, #0a0a0a);
		display: flex;
		flex-direction: column;
	}

	/* Left drawer */
	.drawer-left {
		top: 0;
		left: 0;
		bottom: 0;
		width: min(320px, 85vw);
		border-right: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		animation: slideInLeft var(--duration-standard, 300ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	/* Right drawer */
	.drawer-right {
		top: 0;
		right: 0;
		bottom: 0;
		width: min(320px, 85vw);
		border-left: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		animation: slideInRight var(--duration-standard, 300ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	/* Bottom drawer (sheet) */
	.drawer-bottom {
		left: 0;
		right: 0;
		bottom: 0;
		max-height: 85vh;
		border-top: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-xl, 16px) var(--radius-xl, 16px) 0 0;
		animation: slideInUp var(--duration-standard, 300ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.drawer-content {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-lg, 2.618rem) var(--space-md, 1.618rem);
	}

	/* Bottom sheet handle */
	.drawer-bottom .drawer-content::before {
		content: '';
		display: block;
		width: 32px;
		height: 4px;
		background: var(--color-fg-subtle, rgba(255, 255, 255, 0.2));
		border-radius: var(--radius-full, 9999px);
		margin: 0 auto var(--space-md, 1.618rem);
	}

	/* Animations */
	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes slideInLeft {
		from { transform: translateX(-100%); }
		to { transform: translateX(0); }
	}

	@keyframes slideInRight {
		from { transform: translateX(100%); }
		to { transform: translateX(0); }
	}

	@keyframes slideInUp {
		from { transform: translateY(100%); }
		to { transform: translateY(0); }
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.drawer-overlay,
		.drawer-left,
		.drawer-right,
		.drawer-bottom {
			animation: none;
		}
	}
</style>
