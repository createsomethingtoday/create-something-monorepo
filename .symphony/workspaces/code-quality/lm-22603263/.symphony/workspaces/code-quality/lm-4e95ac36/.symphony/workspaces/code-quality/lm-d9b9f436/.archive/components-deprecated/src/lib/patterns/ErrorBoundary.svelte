<script lang="ts">
	/**
	 * Error Boundary Pattern
	 *
	 * Catches and displays errors in a contained region.
	 * Prevents cascading failures while providing recovery options.
	 *
	 * Canon Principle: Graceful degradation.
	 * Errors are contained, not contagious. Recovery paths are clear.
	 *
	 * @example
	 * // Basic error boundary
	 * <ErrorBoundary>{children}</ErrorBoundary>
	 *
	 * // With custom messaging
	 * <ErrorBoundary
	 *   title="Dashboard unavailable"
	 *   message="We're having trouble loading your dashboard."
	 * >{children}</ErrorBoundary>
	 */

	import type { Snippet } from 'svelte';

	interface Props {
		/** Content that might error */
		children: Snippet;
		/** Custom fallback when error occurs */
		fallback?: Snippet<[{ error: Error; reset: () => void }]>;
		/** Callback when error is caught */
		onerror?: (error: Error) => void;
		/** Whether to show technical details */
		showDetails?: boolean;
		/** Custom title for error state */
		title?: string;
		/** Custom message for error state */
		message?: string;
	}

	let {
		children,
		fallback,
		onerror,
		showDetails = false,
		title = 'Something went wrong',
		message = 'An unexpected error occurred. Please try again.'
	}: Props = $props();

	let error = $state<Error | null>(null);
	let hasError = $derived(error !== null);

	function reset() {
		error = null;
	}

	/**
	 * Manually trigger an error state.
	 * Useful for catching errors in async operations.
	 */
	export function setError(err: Error) {
		error = err;
		onerror?.(err);
	}
</script>

<div class="error-boundary">
	{#if hasError && error}
		{#if fallback}
			{@render fallback({ error, reset })}
		{:else}
			<div class="error-fallback" role="alert">
				<div class="error-icon" aria-hidden="true">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
						<path d="M12 9v4" />
						<circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
					</svg>
				</div>

				<div class="error-content">
					<h3 class="error-title">{title}</h3>
					<p class="error-message">{message}</p>

					{#if showDetails}
						<details class="error-details">
							<summary>Technical details</summary>
							<pre><code>{error.stack ?? error.message}</code></pre>
						</details>
					{/if}
				</div>

				<div class="error-actions">
					<button
						type="button"
						class="error-action error-action--primary"
						onclick={reset}
					>
						Try again
					</button>
					<button
						type="button"
						class="error-action error-action--secondary"
						onclick={() => window.location.reload()}
					>
						Reload page
					</button>
				</div>
			</div>
		{/if}
	{:else}
		{@render children()}
	{/if}
</div>

<style>
	.error-boundary {
		display: contents;
	}

	.error-fallback {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: var(--space-xl);
		gap: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		max-width: 480px;
		margin: var(--space-lg) auto;
	}

	.error-icon svg {
		width: 48px;
		height: 48px;
		color: var(--color-warning);
	}

	.error-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.error-title {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.error-message {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.error-details {
		text-align: left;
		margin-top: var(--space-md);
	}

	.error-details summary {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		cursor: pointer;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.error-details summary:hover {
		color: var(--color-fg-secondary);
	}

	.error-details pre {
		margin-top: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		overflow-x: auto;
		font-size: var(--text-caption);
		line-height: 1.5;
	}

	.error-details code {
		color: var(--color-fg-tertiary);
		font-family: monospace;
	}

	.error-actions {
		display: flex;
		gap: var(--space-sm);
		flex-wrap: wrap;
		justify-content: center;
	}

	.error-action {
		padding: var(--space-xs) var(--space-md);
		font-size: var(--text-body);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.error-action--primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
	}

	.error-action--primary:hover {
		opacity: 0.9;
	}

	.error-action--primary:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.error-action--secondary {
		background: transparent;
		color: var(--color-fg-secondary);
		border: 1px solid var(--color-border-default);
	}

	.error-action--secondary:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	.error-action--secondary:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
</style>
