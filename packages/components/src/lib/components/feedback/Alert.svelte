<script lang="ts">
	/**
	 * Alert Component
	 *
	 * Inline status message for communicating feedback to users.
	 * Uses semantic color variants for different message types.
	 *
	 * Canon: The alert disappears; only the message remains.
	 */

	import type { Snippet } from 'svelte';

	interface Props {
		/** Semantic variant determining color and icon */
		variant?: 'success' | 'error' | 'warning' | 'info';
		/** Alert title (optional) */
		title?: string;
		/** Whether the alert can be dismissed */
		dismissible?: boolean;
		/** Called when dismiss button is clicked */
		ondismiss?: () => void;
		/** Alert content */
		children: Snippet;
	}

	let { variant = 'info', title, dismissible = false, ondismiss, children }: Props = $props();

	let dismissed = $state(false);

	function handleDismiss() {
		dismissed = true;
		ondismiss?.();
	}

	// Icon paths for each variant
	const icons = {
		success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
		error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
		warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
		info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
	};
</script>

{#if !dismissed}
	<div class="alert alert-{variant}" role="alert">
		<svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d={icons[variant]} />
		</svg>

		<div class="alert-content">
			{#if title}
				<p class="alert-title">{title}</p>
			{/if}
			<div class="alert-message">
				{@render children()}
			</div>
		</div>

		{#if dismissible}
			<button
				type="button"
				class="alert-dismiss"
				onclick={handleDismiss}
				aria-label="Dismiss alert"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<path d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		{/if}
	</div>
{/if}

<style>
	.alert {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-md);
		border: 1px solid;
	}

	/* Variant styles */
	.alert-success {
		background: var(--color-success-muted);
		border-color: var(--color-success-border);
		color: var(--color-success);
	}

	.alert-error {
		background: var(--color-error-muted);
		border-color: var(--color-error-border);
		color: var(--color-error);
	}

	.alert-warning {
		background: var(--color-warning-muted);
		border-color: var(--color-warning-border);
		color: var(--color-warning);
	}

	.alert-info {
		background: var(--color-info-muted);
		border-color: var(--color-info-border);
		color: var(--color-info);
	}

	/* Icon */
	.alert-icon {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		margin-top: 2px;
	}

	/* Content */
	.alert-content {
		flex: 1;
		min-width: 0;
	}

	.alert-title {
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		margin: 0 0 2px 0;
		color: inherit;
	}

	.alert-message {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.5;
	}

	.alert-message :global(p) {
		margin: 0;
	}

	.alert-message :global(a) {
		color: inherit;
		text-decoration: underline;
	}

	/* Dismiss button */
	.alert-dismiss {
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

	.alert-dismiss:hover {
		color: var(--color-fg-primary);
	}

	.alert-dismiss:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.alert-dismiss svg {
		width: 100%;
		height: 100%;
	}
</style>
