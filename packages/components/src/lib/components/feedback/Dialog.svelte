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
		z-index: var(--z-modal, 50);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-md);
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

	.dialog {
		position: relative;
		display: flex;
		flex-direction: column;
		max-height: calc(100vh - var(--space-lg) * 2);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-2xl);
		animation: dialogIn var(--duration-standard) var(--ease-standard);
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
		max-width: calc(100vw - var(--space-lg) * 2);
		max-height: calc(100vh - var(--space-lg) * 2);
	}

	/* Header */
	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		padding: var(--space-md) var(--space-lg);
		border-bottom: 1px solid var(--color-border-default);
	}

	.dialog-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
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
		color: var(--color-fg-muted);
		cursor: pointer;
		border-radius: var(--radius-md);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.dialog-close:hover {
		color: var(--color-fg-primary);
		background: var(--color-hover);
	}

	.dialog-close:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.dialog-close svg {
		width: 100%;
		height: 100%;
	}

	.dialog-close-absolute {
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
	}

	/* Body */
	.dialog-body {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-lg);
	}

	.dialog-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-md) 0;
		line-height: 1.6;
	}

	/* Footer */
	.dialog-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-sm);
		padding: var(--space-md) var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.dialog-backdrop,
		.dialog {
			animation: none;
		}
	}
</style>
