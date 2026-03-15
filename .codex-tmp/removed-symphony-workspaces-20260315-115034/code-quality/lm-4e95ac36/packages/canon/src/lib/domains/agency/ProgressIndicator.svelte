<script lang="ts">
	interface Props {
		currentStep: number;
		totalSteps: number;
		onNavigate?: (step: number) => void;
	}

	let { currentStep, totalSteps, onNavigate }: Props = $props();

	function handleClick(index: number) {
		// Only allow navigating to past steps
		if (index < currentStep && onNavigate) {
			onNavigate(index);
		}
	}
</script>

<!-- Threshold markers: minimal, contemplative progress indication -->
<div class="progress-threshold" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={totalSteps}>
	{#each Array(totalSteps) as _, i}
		<button
			type="button"
			class="threshold-marker"
			class:past={i < currentStep}
			class:current={i === currentStep}
			class:clickable={i < currentStep}
			aria-label={i === currentStep ? 'Current step' : i < currentStep ? `Go back to step ${i + 1}` : 'Upcoming'}
			onclick={() => handleClick(i)}
			disabled={i >= currentStep}
		></button>
	{/each}
</div>

<style>
	.progress-threshold {
		display: flex;
		gap: var(--space-sm);
	}

	.threshold-marker {
		width: 8px;
		height: 8px;
		border-radius: var(--radius-full);
		background: transparent;
		border: 1px solid var(--color-fg-subtle);
		transition: all var(--duration-standard) var(--ease-standard);
		padding: 0;
		cursor: default;
	}

	.threshold-marker.current {
		border-color: var(--color-fg-tertiary);
		box-shadow: 0 0 0 2px var(--color-bg-elevated), 0 0 0 4px var(--color-fg-subtle);
	}

	.threshold-marker.past {
		background: var(--color-fg-muted);
		border-color: var(--color-fg-muted);
	}

	.threshold-marker.clickable {
		cursor: pointer;
	}

	.threshold-marker.clickable:hover {
		background: var(--color-fg-tertiary);
		border-color: var(--color-fg-tertiary);
	}
</style>
