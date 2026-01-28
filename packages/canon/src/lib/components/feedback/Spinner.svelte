<script lang="ts">
	/**
	 * Spinner Component
	 *
	 * Loading indicator for indeterminate operations.
	 * Animated border creates the spinning effect.
	 *
	 * Canon: The spinner signals; patience follows.
	 */

	interface Props {
		/** Size variant */
		size?: 'sm' | 'md' | 'lg' | 'xl';
		/** Accessible label for screen readers */
		label?: string;
		/** Whether to center in container */
		centered?: boolean;
	}

	let { size = 'md', label = 'Loading', centered = false }: Props = $props();
</script>

<div class="spinner-container" class:centered>
	<div
		class="spinner spinner-{size}"
		role="status"
		aria-label={label}
	>
		<span class="sr-only">{label}</span>
	</div>
</div>

<style>
	.spinner-container {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.spinner-container.centered {
		display: flex;
		width: 100%;
		padding: var(--space-lg);
	}

	.spinner {
		border-radius: var(--radius-full);
		border-style: solid;
		border-color: var(--color-border-default);
		border-top-color: var(--color-fg-primary);
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Size variants */
	.spinner-sm {
		width: 16px;
		height: 16px;
		border-width: 2px;
	}

	.spinner-md {
		width: 24px;
		height: 24px;
		border-width: 2px;
	}

	.spinner-lg {
		width: 32px;
		height: 32px;
		border-width: 3px;
	}

	.spinner-xl {
		width: 48px;
		height: 48px;
		border-width: 4px;
	}

	/* Screen reader only */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation: none;
			border-color: var(--color-fg-muted);
			border-top-color: var(--color-fg-primary);
		}
	}
</style>
