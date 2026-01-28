<script lang="ts">
	/**
	 * Loading Overlay Pattern
	 *
	 * Full-page or container loading overlay with optional message.
	 * Blocks interaction while preserving context.
	 *
	 * Canon Principle: Presence during absence.
	 * The overlay acknowledges work in progress without erasing context.
	 *
	 * @example
	 * // Container overlay
	 * <LoadingOverlay loading={isLoading} message="Saving..." />
	 *
	 * // Page overlay
	 * <LoadingOverlay loading={isNavigating} scope="page" />
	 *
	 * // With blur effect
	 * <LoadingOverlay loading={true} blur message="Processing..." />
	 */

	import type { Snippet } from 'svelte';

	interface Props {
		/** Whether the overlay is visible */
		loading?: boolean;
		/** Loading message to display */
		message?: string;
		/** Whether to blur the background */
		blur?: boolean;
		/** Overlay scope */
		scope?: 'page' | 'container';
		/** Custom spinner/indicator */
		indicator?: Snippet;
		/** Z-index for the overlay */
		zIndex?: number;
	}

	let {
		loading = false,
		message,
		blur = false,
		scope = 'container',
		indicator,
		zIndex = 50
	}: Props = $props();
</script>

{#if loading}
	<div
		class="loading-overlay loading-overlay--{scope}"
		class:loading-overlay--blur={blur}
		style:z-index={zIndex}
		role="progressbar"
		aria-busy="true"
		aria-label={message ?? 'Loading'}
	>
		<div class="loading-content">
			{#if indicator}
				{@render indicator()}
			{:else}
				<div class="loading-spinner" aria-hidden="true">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" stroke-opacity="0.2" />
						<path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round" />
					</svg>
				</div>
			{/if}
			{#if message}
				<p class="loading-message">{message}</p>
			{/if}
		</div>
	</div>
{/if}

<style>
	.loading-overlay {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-overlay);
		transition: opacity var(--duration-standard) var(--ease-standard);
	}

	.loading-overlay--container {
		position: absolute;
		inset: 0;
	}

	.loading-overlay--page {
		position: fixed;
		inset: 0;
	}

	.loading-overlay--blur {
		backdrop-filter: blur(4px);
	}

	.loading-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
		box-shadow: var(--shadow-lg);
	}

	.loading-spinner svg {
		width: 32px;
		height: 32px;
		color: var(--color-fg-primary);
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		100% {
			transform: rotate(360deg);
		}
	}

	/* Respect reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.loading-spinner svg {
			animation: pulse 2s ease-in-out infinite;
		}

		@keyframes pulse {
			0%, 100% {
				opacity: 0.5;
			}
			50% {
				opacity: 1;
			}
		}
	}

	.loading-message {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0;
		text-align: center;
	}
</style>
