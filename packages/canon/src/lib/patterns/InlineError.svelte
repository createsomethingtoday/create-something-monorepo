<script lang="ts">
	/**
	 * Inline Error Pattern
	 *
	 * Displays error messages inline with content.
	 * Provides context-aware error feedback.
	 *
	 * Canon Principle: Errors should inform, not alarm.
	 * Clear messaging reduces frustration and guides resolution.
	 *
	 * @example
	 * // Simple error
	 * <InlineError message="Email is required" />
	 *
	 * // With error code
	 * <InlineError message="Unable to save changes" code="ERR_NETWORK" />
	 *
	 * // Dismissible warning
	 * <InlineError type="warning" message="Session expires in 5 min" dismissible />
	 */

	import type { Snippet } from 'svelte';

	interface Props {
		/** Error message to display */
		message: string;
		/** Error type for styling */
		type?: 'error' | 'warning' | 'info';
		/** Optional error code or ID */
		code?: string;
		/** Whether the error is dismissible */
		dismissible?: boolean;
		/** Callback when dismissed */
		ondismiss?: () => void;
		/** Optional action for recovery */
		action?: Snippet;
		/** Visual size */
		size?: 'sm' | 'md';
		/** ID of the form field this error relates to */
		for?: string;
	}

	let {
		message,
		type = 'error',
		code,
		dismissible = false,
		ondismiss,
		action,
		size = 'md',
		for: forId
	}: Props = $props();

	function handleDismiss() {
		ondismiss?.();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleDismiss();
		}
	}
</script>

<div
	class="inline-error inline-error--{type} inline-error--{size}"
	role="alert"
	aria-live="polite"
	id={forId ? `${forId}-error` : undefined}
>
	<div class="error-icon" aria-hidden="true">
		{#if type === 'error'}
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="10" />
				<path d="M12 8v4" />
				<circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
			</svg>
		{:else if type === 'warning'}
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
				<path d="M12 9v4" />
				<circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
			</svg>
		{:else}
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="10" />
				<path d="M12 16v-4" />
				<circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
			</svg>
		{/if}
	</div>

	<div class="error-content">
		<p class="error-message">
			{message}
			{#if code}
				<code class="error-code">{code}</code>
			{/if}
		</p>
		{#if action}
			<div class="error-action">
				{@render action()}
			</div>
		{/if}
	</div>

	{#if dismissible}
		<button
			type="button"
			class="error-dismiss"
			onclick={handleDismiss}
			onkeydown={handleKeydown}
			aria-label="Dismiss message"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M18 6L6 18" />
				<path d="M6 6l12 12" />
			</svg>
		</button>
	{/if}
</div>

<style>
	.inline-error {
		display: flex;
		align-items: flex-start;
		gap: var(--space-performance-sm);
		padding: var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-md);
		border: 1px solid;
	}

	.inline-error--sm {
		padding: var(--space-performance-xs);
		gap: var(--space-performance-xs);
	}

	/* Type variants */
	.inline-error--error {
		background: var(--color-performance-error-muted);
		border-color: var(--color-performance-error-border);
		color: var(--color-performance-error);
	}

	.inline-error--warning {
		background: var(--color-performance-warning-muted);
		border-color: var(--color-performance-warning-border);
		color: var(--color-performance-warning);
	}

	.inline-error--info {
		background: var(--color-performance-info-muted);
		border-color: var(--color-performance-info-border);
		color: var(--color-performance-info);
	}

	.error-icon svg {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
	}

	.inline-error--sm .error-icon svg {
		width: 16px;
		height: 16px;
	}

	.error-content {
		flex: 1;
		min-width: 0;
	}

	.error-message {
		font-size: var(--text-performance-body-sm);
		margin: 0;
		color: var(--color-performance-fg-primary);
	}

	.inline-error--sm .error-message {
		font-size: var(--text-performance-caption);
	}

	.error-code {
		font-family: monospace;
		font-size: 0.85em;
		background: var(--color-performance-bg-subtle);
		padding: 0.1em 0.4em;
		border-radius: var(--radius-performance-scale-sm);
		margin-left: var(--space-performance-xs);
	}

	.error-action {
		margin-top: var(--space-performance-xs);
	}

	.error-action :global(button) {
		font-size: var(--text-performance-body-sm);
		text-decoration: underline;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		color: inherit;
	}

	.error-action :global(button:hover) {
		text-decoration: none;
	}

	.error-dismiss {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: var(--radius-performance-scale-sm);
		cursor: pointer;
		color: var(--color-performance-fg-secondary);
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.error-dismiss:hover {
		background: var(--color-performance-hover);
		color: var(--color-performance-fg-primary);
	}

	.error-dismiss:focus-visible {
		outline: 2px solid var(--color-performance-focus);
		outline-offset: 2px;
	}

	.error-dismiss svg {
		width: 16px;
		height: 16px;
	}
</style>
