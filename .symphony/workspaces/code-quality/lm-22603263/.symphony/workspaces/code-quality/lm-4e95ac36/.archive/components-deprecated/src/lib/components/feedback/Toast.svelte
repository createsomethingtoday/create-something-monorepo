<script lang="ts">
	/**
	 * Toast Component
	 *
	 * Transient notification that auto-dismisses after a duration.
	 * Includes progress indicator showing time remaining.
	 *
	 * Canon: The toast appears, communicates, then disappears.
	 */

	import { onMount } from 'svelte';

	interface Props {
		/** Semantic variant determining color and icon */
		variant?: 'success' | 'error' | 'warning' | 'info';
		/** Toast message */
		message: string;
		/** Optional title */
		title?: string;
		/** Duration in ms before auto-dismiss (0 to disable) */
		duration?: number;
		/** Whether to show progress bar */
		showProgress?: boolean;
		/** Called when toast is dismissed */
		ondismiss?: () => void;
	}

	let {
		variant = 'info',
		message,
		title,
		duration = 5000,
		showProgress = true,
		ondismiss
	}: Props = $props();

	let visible = $state(true);
	let progress = $state(100);
	let paused = $state(false);

	// Icon paths for each variant
	const icons = {
		success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
		error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
		warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
		info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
	};

	function dismiss() {
		visible = false;
		ondismiss?.();
	}

	onMount(() => {
		if (duration <= 0) return;

		const startTime = Date.now();
		let elapsed = 0;
		let rafId: number;

		function tick() {
			if (paused) {
				rafId = requestAnimationFrame(tick);
				return;
			}

			const now = Date.now();
			elapsed = now - startTime;
			progress = Math.max(0, 100 - (elapsed / duration) * 100);

			if (elapsed >= duration) {
				dismiss();
			} else {
				rafId = requestAnimationFrame(tick);
			}
		}

		rafId = requestAnimationFrame(tick);

		return () => {
			cancelAnimationFrame(rafId);
		};
	});
</script>

{#if visible}
	<div
		class="toast toast-{variant}"
		role="alert"
		aria-live="polite"
		onmouseenter={() => (paused = true)}
		onmouseleave={() => (paused = false)}
	>
		<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d={icons[variant]} />
		</svg>

		<div class="toast-content">
			{#if title}
				<p class="toast-title">{title}</p>
			{/if}
			<p class="toast-message">{message}</p>
		</div>

		<button
			type="button"
			class="toast-dismiss"
			onclick={dismiss}
			aria-label="Dismiss notification"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
				<path d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>

		{#if showProgress && duration > 0}
			<div class="toast-progress" style="width: {progress}%"></div>
		{/if}
	</div>
{/if}

<style>
	.toast {
		position: relative;
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-elevated);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
		box-shadow: var(--shadow-lg);
		overflow: hidden;
		min-width: 300px;
		max-width: 420px;
		animation: toastIn var(--duration-standard) var(--ease-standard);
	}

	@keyframes toastIn {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Variant icon colors */
	.toast-success .toast-icon {
		color: var(--color-success);
	}

	.toast-error .toast-icon {
		color: var(--color-error);
	}

	.toast-warning .toast-icon {
		color: var(--color-warning);
	}

	.toast-info .toast-icon {
		color: var(--color-info);
	}

	/* Icon */
	.toast-icon {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		margin-top: 2px;
	}

	/* Content */
	.toast-content {
		flex: 1;
		min-width: 0;
	}

	.toast-title {
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		margin: 0 0 2px 0;
	}

	.toast-message {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
		line-height: 1.5;
	}

	/* Dismiss button */
	.toast-dismiss {
		flex-shrink: 0;
		width: 20px;
		height: 20px;
		padding: 0;
		background: none;
		border: none;
		color: var(--color-fg-muted);
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.toast-dismiss:hover {
		color: var(--color-fg-primary);
	}

	.toast-dismiss:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.toast-dismiss svg {
		width: 100%;
		height: 100%;
	}

	/* Progress bar */
	.toast-progress {
		position: absolute;
		bottom: 0;
		left: 0;
		height: 3px;
		background: var(--color-fg-muted);
		transition: width 100ms linear;
	}

	.toast-success .toast-progress {
		background: var(--color-success);
	}

	.toast-error .toast-progress {
		background: var(--color-error);
	}

	.toast-warning .toast-progress {
		background: var(--color-warning);
	}

	.toast-info .toast-progress {
		background: var(--color-info);
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.toast {
			animation: none;
		}
	}
</style>
