<script lang="ts">
	/**
	 * Drawer Component
	 *
	 * Slide-out panel for secondary content or navigation.
	 * Uses focus trapping for accessibility.
	 *
	 * Canon: The drawer slides; space transforms.
	 */

	import type { Snippet } from 'svelte';
	import { focusTrap } from '../../actions/a11y.js';

	interface Props {
		/** Whether drawer is open (bindable) */
		open?: boolean;
		/** Drawer title */
		title?: string;
		/** Side to slide from */
		side?: 'left' | 'right';
		/** Drawer width */
		width?: 'sm' | 'md' | 'lg' | 'full';
		/** Whether clicking backdrop closes drawer */
		closeOnBackdrop?: boolean;
		/** Whether pressing Escape closes drawer */
		closeOnEscape?: boolean;
		/** Called when drawer should close */
		onclose?: () => void;
		/** Drawer content */
		children: Snippet;
		/** Optional footer content */
		footer?: Snippet;
	}

	let {
		open = $bindable(false),
		title,
		side = 'right',
		width = 'md',
		closeOnBackdrop = true,
		closeOnEscape = true,
		onclose,
		children,
		footer
	}: Props = $props();

	function close() {
		open = false;
		onclose?.();
	}

	function handleBackdropClick(event: MouseEvent) {
		if (closeOnBackdrop && event.target === event.currentTarget) {
			close();
		}
	}

	function handleEscape() {
		if (closeOnEscape) {
			close();
		}
	}

	// Prevent body scroll when drawer is open
	$effect(() => {
		if (open) {
			document.body.style.overflow = 'hidden';
			return () => {
				document.body.style.overflow = '';
			};
		}
	});
</script>

{#if open}
	<div class="drawer-backdrop" onclick={handleBackdropClick} role="presentation">
		<div
			class="drawer drawer-{side} drawer-{width}"
			role="dialog"
			aria-modal="true"
			aria-label={title || 'Drawer'}
			use:focusTrap={{ active: open, onEscape: handleEscape }}
		>
			<header class="drawer-header">
				{#if title}
					<h2 class="drawer-title">{title}</h2>
				{/if}
				<button
					type="button"
					class="drawer-close"
					onclick={close}
					aria-label="Close drawer"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
						<path d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</header>

			<div class="drawer-body">
				{@render children()}
			</div>

			{#if footer}
				<footer class="drawer-footer">
					{@render footer()}
				</footer>
			{/if}
		</div>
	</div>
{/if}

<style>
	.drawer-backdrop {
		position: fixed;
		inset: 0;
		z-index: var(--z-drawer, 40);
		background: var(--color-overlay);
		animation: backdropIn var(--duration-standard) var(--ease-standard);
	}

	@keyframes backdropIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.drawer {
		position: fixed;
		top: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		box-shadow: var(--shadow-2xl);
	}

	/* Side positioning */
	.drawer-left {
		left: 0;
		border-left: none;
		border-top-right-radius: var(--radius-lg);
		border-bottom-right-radius: var(--radius-lg);
		animation: slideInLeft var(--duration-standard) var(--ease-standard);
	}

	.drawer-right {
		right: 0;
		border-right: none;
		border-top-left-radius: var(--radius-lg);
		border-bottom-left-radius: var(--radius-lg);
		animation: slideInRight var(--duration-standard) var(--ease-standard);
	}

	@keyframes slideInLeft {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(0);
		}
	}

	@keyframes slideInRight {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}

	/* Width variants */
	.drawer-sm {
		width: 320px;
		max-width: 100%;
	}

	.drawer-md {
		width: 400px;
		max-width: 100%;
	}

	.drawer-lg {
		width: 560px;
		max-width: 100%;
	}

	.drawer-full {
		width: 100%;
	}

	/* Header */
	.drawer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		padding: var(--space-md) var(--space-lg);
		border-bottom: 1px solid var(--color-border-default);
		flex-shrink: 0;
	}

	.drawer-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	/* Close button */
	.drawer-close {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		padding: 6px;
		background: none;
		border: none;
		color: var(--color-fg-muted);
		cursor: pointer;
		border-radius: var(--radius-md);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.drawer-close:hover {
		color: var(--color-fg-primary);
		background: var(--color-hover);
	}

	.drawer-close:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.drawer-close svg {
		width: 100%;
		height: 100%;
	}

	/* Body */
	.drawer-body {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-lg);
	}

	/* Footer */
	.drawer-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-sm);
		padding: var(--space-md) var(--space-lg);
		border-top: 1px solid var(--color-border-default);
		flex-shrink: 0;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.drawer-backdrop {
			animation: none;
		}
		.drawer-left,
		.drawer-right {
			animation: none;
		}
	}
</style>
