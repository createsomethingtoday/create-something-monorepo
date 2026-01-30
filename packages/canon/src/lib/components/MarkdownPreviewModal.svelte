<script lang="ts">
	/**
	 * MarkdownPreviewModal Component
	 *
	 * Modal for previewing markdown content before copying or sending to Claude.ai.
	 * Displays raw markdown with copy functionality.
	 *
	 * Canon: The markdown speaks; the modal frames.
	 */

	import { focusTrap } from '../actions/a11y.js';
	import { copyToClipboard } from '../utils/clipboard.js';

	interface Props {
		/** Whether the modal is open */
		open?: boolean;
		/** Markdown content to display */
		content: string;
		/** Modal title */
		title?: string;
		/** Called when modal should close */
		onclose?: () => void;
	}

	let { open = $bindable(false), content, title = 'Markdown Preview', onclose }: Props = $props();

	let copyFeedback = $state(false);

	function close() {
		open = false;
		onclose?.();
	}

	async function handleCopy() {
		const success = await copyToClipboard(content);
		if (success) {
			copyFeedback = true;
			setTimeout(() => {
				copyFeedback = false;
			}, 2000);
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			close();
		}
	}

	function handleEscape() {
		close();
	}
</script>

{#if open}
	<div class="backdrop" onclick={handleBackdropClick} role="presentation">
		<div
			class="modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
			use:focusTrap={{ active: open, onEscape: handleEscape }}
		>
			<header class="header">
				<h2 id="modal-title" class="title">{title}</h2>
				<div class="header-actions">
					<button
						type="button"
						class="copy-button"
						onclick={handleCopy}
						aria-label="Copy markdown to clipboard"
					>
						<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
							<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
						</svg>
						<span>{copyFeedback ? 'Copied!' : 'Copy'}</span>
					</button>
					<button type="button" class="close-button" onclick={close} aria-label="Close modal">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</header>

			<div class="body">
				<pre class="markdown-content">{content}</pre>
			</div>
		</div>
	</div>
{/if}

<style>
	.backdrop {
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

	.modal {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 800px;
		max-height: calc(100vh - var(--space-lg) * 2);
		/* Glass Design System - "The Automation Layer" */
		background-color: var(--glass-bg-medium);
		backdrop-filter: blur(var(--glass-blur-xl)) var(--glass-saturate-xl);
		border: 1px solid var(--glass-border-medium);
		border-radius: var(--radius-lg);
		box-shadow: var(--glass-shadow-lg);
		animation: modalIn var(--duration-standard) var(--ease-standard);
	}

	@keyframes modalIn {
		from {
			opacity: 0;
			transform: scale(0.95) translateY(-10px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		padding: var(--space-md) var(--space-lg);
		border-bottom: 1px solid var(--color-border-default);
	}

	.title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.copy-button {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.copy-button:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
		border-color: var(--color-border-emphasis);
	}

	.copy-button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.close-button {
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

	.close-button:hover {
		color: var(--color-fg-primary);
		background: var(--color-hover);
	}

	.close-button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.close-button svg {
		width: 100%;
		height: 100%;
	}

	.icon {
		width: 16px;
		height: 16px;
	}

	.body {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-lg);
	}

	.markdown-content {
		margin: 0;
		padding: var(--space-md);
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New',
			monospace;
		font-size: var(--text-body-sm);
		line-height: 1.6;
		white-space: pre-wrap;
		word-break: break-word;
		overflow-x: auto;
	}

	@media (prefers-reduced-motion: reduce) {
		.backdrop,
		.modal {
			animation: none;
		}
	}
</style>
