<script lang="ts">
	/**
	 * Progress Component
	 *
	 * Determinate progress bar showing completion percentage.
	 * Includes accessible labeling for screen readers.
	 *
	 * Canon: The progress reveals; completion approaches.
	 */

	interface Props {
		/** Progress value (0-100) */
		value?: number;
		/** Maximum value (for custom ranges) */
		max?: number;
		/** Accessible label describing what's in progress */
		label?: string;
		/** Whether to show percentage text */
		showValue?: boolean;
		/** Size variant */
		size?: 'sm' | 'md' | 'lg';
		/** Color variant */
		variant?: 'default' | 'success' | 'warning' | 'error';
	}

	let {
		value = 0,
		max = 100,
		label,
		showValue = false,
		size = 'md',
		variant = 'default'
	}: Props = $props();

	// Clamp value between 0 and max
	const clampedValue = $derived(Math.min(Math.max(0, value), max));
	const percentage = $derived(Math.round((clampedValue / max) * 100));
</script>

<div class="progress progress-{size}">
	{#if label || showValue}
		<div class="progress-header">
			{#if label}
				<span class="progress-label">{label}</span>
			{/if}
			{#if showValue}
				<span class="progress-value">{percentage}%</span>
			{/if}
		</div>
	{/if}

	<div
		class="progress-track"
		role="progressbar"
		aria-valuenow={clampedValue}
		aria-valuemin={0}
		aria-valuemax={max}
		aria-label={label || 'Progress'}
	>
		<div
			class="progress-fill progress-fill-{variant}"
			style="width: {percentage}%"
		></div>
	</div>
</div>

<style>
	.progress {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		width: 100%;
	}

	/* Header with label and value */
	.progress-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-sm);
	}

	.progress-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.progress-value {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	/* Track */
	.progress-track {
		width: 100%;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	/* Size variants */
	.progress-sm .progress-track {
		height: 4px;
	}

	.progress-md .progress-track {
		height: 8px;
	}

	.progress-lg .progress-track {
		height: 12px;
	}

	.progress-sm .progress-label,
	.progress-sm .progress-value {
		font-size: var(--text-caption);
	}

	.progress-lg .progress-label,
	.progress-lg .progress-value {
		font-size: var(--text-body);
	}

	/* Fill */
	.progress-fill {
		height: 100%;
		border-radius: var(--radius-full);
		transition: width var(--duration-standard) var(--ease-standard);
	}

	.progress-fill-default {
		background: var(--color-fg-primary);
	}

	.progress-fill-success {
		background: var(--color-success);
	}

	.progress-fill-warning {
		background: var(--color-warning);
	}

	.progress-fill-error {
		background: var(--color-error);
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.progress-fill {
			transition: none;
		}
	}
</style>
