<script lang="ts">
	/**
	 * Multi-Step Form Pattern
	 *
	 * Demonstrates wizard-style forms with progress indication,
	 * step navigation, and data persistence between steps.
	 *
	 * Canon Principle: Break complexity into digestible chunks.
	 * Each step should feel achievable.
	 */

	import type { Snippet } from 'svelte';

	interface Step {
		id: string;
		title: string;
		description?: string;
	}

	interface Props {
		/** Steps configuration */
		steps: Step[];
		/** Current step index (0-based) */
		currentStep?: number;
		/** Allow clicking on completed steps to navigate */
		allowStepClick?: boolean;
		/** Callback when step changes */
		onStepChange?: (step: number) => void;
		/** Callback when form completes */
		onComplete?: () => void;
		/** Step content (receives current step index) */
		children: Snippet<[number]>;
	}

	let {
		steps,
		currentStep = $bindable(0),
		allowStepClick = true,
		onStepChange,
		onComplete,
		children
	}: Props = $props();

	const totalSteps = $derived(steps.length);
	const isFirstStep = $derived(currentStep === 0);
	const isLastStep = $derived(currentStep === totalSteps - 1);
	const progressPercent = $derived(((currentStep + 1) / totalSteps) * 100);

	function goToStep(index: number) {
		if (index >= 0 && index < totalSteps) {
			if (allowStepClick || index < currentStep) {
				currentStep = index;
				onStepChange?.(index);
			}
		}
	}

	function nextStep() {
		if (isLastStep) {
			onComplete?.();
		} else {
			goToStep(currentStep + 1);
		}
	}

	function prevStep() {
		if (!isFirstStep) {
			goToStep(currentStep - 1);
		}
	}
</script>

<!--
	Usage:
	```svelte
	<script>
		let step = $state(0);
		const steps = [
			{ id: 'account', title: 'Account', description: 'Create your account' },
			{ id: 'profile', title: 'Profile', description: 'Tell us about yourself' },
			{ id: 'confirm', title: 'Confirm', description: 'Review and submit' }
		];
	</script>

	<MultiStepForm {steps} bind:currentStep={step} onComplete={handleSubmit}>
		{#snippet children(stepIndex)}
			{#if stepIndex === 0}
				<TextField label="Email" name="email" />
				<TextField label="Password" name="password" type="password" />
			{:else if stepIndex === 1}
				<TextField label="Name" name="name" />
				<TextArea label="Bio" name="bio" />
			{:else}
				<p>Review your information...</p>
			{/if}
		{/snippet}
	</MultiStepForm>
	```
-->

<div class="multi-step-form">
	<!-- Progress Bar -->
	<div class="progress-bar" role="progressbar" aria-valuenow={progressPercent} aria-valuemin="0" aria-valuemax="100">
		<div class="progress-fill" style="width: {progressPercent}%"></div>
	</div>

	<!-- Step Indicators -->
	<nav class="step-nav" aria-label="Form progress">
		<ol class="step-list">
			{#each steps as step, index}
				{@const isComplete = index < currentStep}
				{@const isCurrent = index === currentStep}
				{@const isClickable = allowStepClick || isComplete}

				<li class="step-item" class:step-item--complete={isComplete} class:step-item--current={isCurrent}>
					<button
						type="button"
						class="step-button"
						disabled={!isClickable}
						aria-current={isCurrent ? 'step' : undefined}
						onclick={() => goToStep(index)}
					>
						<span class="step-number">
							{#if isComplete}
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
									<polyline points="20 6 9 17 4 12" />
								</svg>
							{:else}
								{index + 1}
							{/if}
						</span>
						<span class="step-label">
							<span class="step-title">{step.title}</span>
							{#if step.description}
								<span class="step-description">{step.description}</span>
							{/if}
						</span>
					</button>

					{#if index < totalSteps - 1}
						<div class="step-connector" class:step-connector--complete={isComplete}></div>
					{/if}
				</li>
			{/each}
		</ol>
	</nav>

	<!-- Step Content -->
	<div class="step-content">
		{@render children(currentStep)}
	</div>

	<!-- Navigation -->
	<div class="step-actions">
		<button
			type="button"
			class="btn btn--secondary"
			disabled={isFirstStep}
			onclick={prevStep}
		>
			Back
		</button>

		<button
			type="button"
			class="btn btn--primary"
			onclick={nextStep}
		>
			{isLastStep ? 'Complete' : 'Continue'}
		</button>
	</div>
</div>

<style>
	.multi-step-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	/* Progress Bar */
	.progress-bar {
		height: 4px;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--color-fg-primary);
		transition: width var(--duration-standard) var(--ease-standard);
	}

	/* Step Navigation */
	.step-nav {
		padding: var(--space-sm) 0;
	}

	.step-list {
		display: flex;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.step-item {
		display: flex;
		align-items: center;
		flex: 1;
	}

	.step-button {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		background: none;
		border: none;
		padding: var(--space-xs);
		cursor: pointer;
		text-align: left;
		border-radius: var(--radius-md);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.step-button:hover:not(:disabled) {
		background: var(--color-hover);
	}

	.step-button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.step-button:disabled {
		cursor: default;
		opacity: 0.5;
	}

	.step-number {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-full);
		background: var(--color-bg-subtle);
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		font-weight: 500;
		flex-shrink: 0;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.step-number svg {
		width: 16px;
		height: 16px;
	}

	.step-item--current .step-number {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.step-item--complete .step-number {
		background: var(--color-success);
		color: white;
	}

	.step-label {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.step-title {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-secondary);
	}

	.step-item--current .step-title {
		color: var(--color-fg-primary);
	}

	.step-description {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.step-connector {
		flex: 1;
		height: 2px;
		background: var(--color-border-default);
		margin: 0 var(--space-xs);
	}

	.step-connector--complete {
		background: var(--color-success);
	}

	/* Hide labels on mobile */
	@media (max-width: 640px) {
		.step-label {
			display: none;
		}
	}

	/* Step Content */
	.step-content {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	/* Actions */
	.step-actions {
		display: flex;
		justify-content: space-between;
		gap: var(--space-sm);
	}

	/* Button styles (inline for pattern independence) */
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-md);
		font-size: var(--text-body-sm);
		font-weight: 500;
		border-radius: var(--radius-md);
		border: 1px solid transparent;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.btn:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn--primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.btn--primary:hover:not(:disabled) {
		opacity: 0.9;
	}

	.btn--secondary {
		background: transparent;
		border-color: var(--color-border-default);
		color: var(--color-fg-secondary);
	}

	.btn--secondary:hover:not(:disabled) {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}
</style>
