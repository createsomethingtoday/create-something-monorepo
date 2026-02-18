<script lang="ts">
	import type { Snippet } from 'svelte';
	import { tick } from 'svelte';
	import { X } from 'lucide-svelte';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		title?: string;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		children: Snippet;
	}

	let { isOpen, onClose, title, size = 'md', children }: Props = $props();
	let dialogElement = $state<HTMLDivElement | null>(null);
	let lastFocusedElement = $state<HTMLElement | null>(null);

	const focusableSelector =
		'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function getFocusableElements(): HTMLElement[] {
		if (!dialogElement) return [];
		return Array.from(dialogElement.querySelectorAll<HTMLElement>(focusableSelector)).filter(
			(el) => !el.hasAttribute('disabled') && el.tabIndex !== -1
		);
	}

	function trapFocus(event: KeyboardEvent) {
		const focusable = getFocusableElements();
		if (focusable.length === 0) {
			event.preventDefault();
			return;
		}

		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		const current = document.activeElement as HTMLElement | null;

		if (event.shiftKey && current === first) {
			event.preventDefault();
			last.focus();
			return;
		}

		if (!event.shiftKey && current === last) {
			event.preventDefault();
			first.focus();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
			return;
		}

		if (e.key === 'Tab') {
			trapFocus(e);
		}
	}

	$effect(() => {
		if (!isOpen || typeof document === 'undefined') return;

		lastFocusedElement = document.activeElement as HTMLElement | null;

		void tick().then(() => {
			const focusable = getFocusableElements();
			if (focusable.length > 0) {
				focusable[0].focus();
				return;
			}
			dialogElement?.focus();
		});

		return () => {
			lastFocusedElement?.focus();
		};
	});
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="backdrop" onclick={handleBackdropClick} onkeydown={handleKeydown}>
		<div
			class="dialog {size}"
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? 'dialog-title' : undefined}
			tabindex="-1"
			bind:this={dialogElement}
		>
		{#if title}
			<div class="dialog-header">
				<h2 id="dialog-title" class="dialog-title">{title}</h2>
				<button class="close-button" onclick={onClose} aria-label="Close dialog">
					<X size={20} />
				</button>
			</div>
		{:else}
			<button class="close-button standalone" onclick={onClose} aria-label="Close dialog">
				<X size={20} />
			</button>
		{/if}

			<div class="dialog-content">
				{@render children()}
			</div>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: var(--color-overlay-heavy);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-md);
		z-index: 1000;
		animation: fadeIn var(--duration-micro) var(--ease-standard);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.dialog {
		position: relative;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
		max-height: calc(100vh - var(--space-xl));
		overflow-y: auto;
		animation: slideIn var(--duration-standard) var(--ease-standard);
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.dialog.sm {
		width: 100%;
		max-width: 24rem;
	}

	.dialog.md {
		width: 100%;
		max-width: 32rem;
	}

	.dialog.lg {
		width: 100%;
		max-width: 48rem;
	}

	.dialog.xl {
		width: 100%;
		max-width: 64rem;
	}

	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-md);
		border-bottom: 1px solid var(--color-border-default);
		position: sticky;
		top: 0;
		background: var(--color-bg-surface);
		z-index: 1;
	}

	.dialog-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.close-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		background: transparent;
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.close-button:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.close-button.standalone {
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
	}

	.dialog-content {
		padding: var(--space-md);
	}
</style>
