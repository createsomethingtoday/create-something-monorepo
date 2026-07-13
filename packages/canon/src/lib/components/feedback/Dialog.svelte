<script lang="ts">
	/**
	 * Dialog Component
	 *
	 * Modal dialog with focus trapping and accessible markup.
	 * Uses the focusTrap action for keyboard navigation.
	 *
	 * Canon: The dialog frames; content speaks.
	 */

	import type { Snippet } from 'svelte';
	import { focusTrap } from '../../actions/a11y.js';

	interface Props {
		/** Whether the dialog is open */
		open?: boolean;
		/** Dialog title */
		title?: string;
		/** Dialog description */
		description?: string;
		/** Whether clicking backdrop closes dialog */
		closeOnBackdrop?: boolean;
		/** Whether pressing Escape closes dialog */
		closeOnEscape?: boolean;
		/** Size variant */
		size?: 'sm' | 'md' | 'lg' | 'full';
		/** Called when dialog should close */
		onclose?: () => void;
		/** Dialog content */
		children: Snippet;
		/** Optional footer content */
		footer?: Snippet;
	}

	let {
		open = $bindable(false),
		title,
		description,
		closeOnBackdrop = true,
		closeOnEscape = true,
		size = 'md',
		onclose,
		children,
		footer
	}: Props = $props();

	const dialogId = `dialog-${crypto.randomUUID().slice(0, 8)}`;
	const titleId = `${dialogId}-title`;
	const descriptionId = `${dialogId}-description`;

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
</script>

{#if open}
	<div class="dialog-backdrop" onclick={handleBackdropClick} role="presentation">
		<div
			class="dialog dialog-{size}"
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? titleId : undefined}
			aria-describedby={description ? descriptionId : undefined}
			use:focusTrap={{ active: open, onEscape: handleEscape }}
		>
			{#if title}
				<header class="dialog-header">
					<h2 id={titleId} class="dialog-title">{title}</h2>
					<button
						type="button"
						class="dialog-close"
						onclick={close}
						aria-label="Close dialog"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
							<path d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</header>
			{:else}
				<button
					type="button"
					class="dialog-close dialog-close-absolute"
					onclick={close}
					aria-label="Close dialog"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
						<path d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			{/if}

			<div class="dialog-body">
				{#if description}
					<p id={descriptionId} class="dialog-description">{description}</p>
				{/if}
				{@render children()}
			</div>

			{#if footer}
				<footer class="dialog-footer">
					{@render footer()}
				</footer>
			{/if}
		</div>
	</div>
{/if}

<style>
	.dialog-backdrop {
		position: fixed;
		inset: 0;
		z-index: var(--z-performance-modal, 50);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-performance-md);
		background: var(--color-performance-overlay);
		animation: backdropIn var(--duration-performance-standard) var(--ease-performance-standard);
	}

	@keyframes backdropIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.dialog {
		position: relative;
		display: flex;
		flex-direction: column;
		max-height: calc(100vh - var(--space-performance-lg) * 2);
		/* Glass Design System - "The Automation Layer" */
		background-color: var(--glass-performance-bg-medium);
		backdrop-filter: blur(var(--glass-performance-blur-xl)) var(--glass-performance-saturate-xl);
		border: 1px solid var(--glass-performance-border-medium);
		border-radius: var(--radius-performance-scale-lg);
		box-shadow: var(--glass-performance-shadow-lg);
		animation: dialogIn var(--duration-performance-standard) var(--ease-performance-standard);
	}

	@keyframes dialogIn {
		from {
			opacity: 0;
			transform: scale(0.95) translateY(-10px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	/* Size variants */
	.dialog-sm {
		width: 100%;
		max-width: 400px;
	}

	.dialog-md {
		width: 100%;
		max-width: 500px;
	}

	.dialog-lg {
		width: 100%;
		max-width: 700px;
	}

	.dialog-full {
		width: 100%;
		max-width: calc(100vw - var(--space-performance-lg) * 2);
		max-height: calc(100vh - var(--space-performance-lg) * 2);
	}

	/* Header */
	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-performance-sm);
		padding: var(--space-performance-md) var(--space-performance-lg);
	}

	.dialog-title {
		font-size: var(--text-performance-h3);
		font-weight: var(--font-performance-semibold);
		color: var(--color-performance-fg-primary);
		margin: 0;
	}

	/* Close button */
	.dialog-close {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		padding: 6px;
		background: none;
		border: none;
		color: var(--color-performance-fg-muted);
		cursor: pointer;
		border-radius: var(--radius-performance-scale-md);
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.dialog-close:hover {
		color: var(--color-performance-fg-primary);
		background: var(--color-performance-hover);
	}

	.dialog-close:focus-visible {
		outline: 2px solid var(--color-performance-focus);
		outline-offset: 2px;
	}

	.dialog-close svg {
		width: 100%;
		height: 100%;
	}

	.dialog-close-absolute {
		position: absolute;
		top: var(--space-performance-sm);
		right: var(--space-performance-sm);
	}

	/* Body */
	.dialog-body {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-performance-lg);
	}

	.dialog-description {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-secondary);
		margin: 0 0 var(--space-performance-md) 0;
		line-height: 1.6;
	}

	/* Footer */
	.dialog-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-performance-sm);
		padding: var(--space-performance-md) var(--space-performance-lg);
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.dialog-backdrop,
		.dialog {
			animation: none;
		}
	}
</style>
