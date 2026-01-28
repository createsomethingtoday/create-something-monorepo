<script lang="ts">
	/**
	 * First Time User Pattern
	 *
	 * Welcome and onboarding experience for new users.
	 * Guides users through initial setup or introduces features.
	 *
	 * Canon Principle: First impressions set expectations.
	 * Onboarding should feel like a conversation, not a tutorial.
	 */

	import type { Snippet } from 'svelte';

	interface Step {
		id: string;
		title: string;
		description: string;
		action?: string;
	}

	interface Props {
		/** Welcome title */
		title: string;
		/** Welcome subtitle */
		subtitle?: string;
		/** Onboarding steps */
		steps?: Step[];
		/** Whether to show step checkboxes */
		showChecklist?: boolean;
		/** Completed step IDs */
		completedSteps?: string[];
		/** Callback when step is clicked */
		onStepClick?: (stepId: string) => void;
		/** Callback to dismiss onboarding */
		onDismiss?: () => void;
		/** Custom content instead of steps */
		children?: Snippet;
	}

	let {
		title,
		subtitle,
		steps = [],
		showChecklist = true,
		completedSteps = [],
		onStepClick,
		onDismiss,
		children
	}: Props = $props();

	const progress = $derived(
		steps.length > 0
			? Math.round((completedSteps.length / steps.length) * 100)
			: 0
	);

	function isComplete(stepId: string): boolean {
		return completedSteps.includes(stepId);
	}
</script>

<!--
	Usage:
	```svelte
	<script>
		let completed = $state(['step-1']);

		const steps = [
			{ id: 'step-1', title: 'Create account', description: 'Set up your profile', action: 'Done' },
			{ id: 'step-2', title: 'Add first project', description: 'Start building', action: 'Create' },
			{ id: 'step-3', title: 'Invite team', description: 'Collaborate together', action: 'Invite' }
		];
	</script>

	<FirstTimeUser
		title="Welcome to CREATE SOMETHING"
		subtitle="Let's get you set up in a few steps."
		{steps}
		completedSteps={completed}
		onStepClick={(id) => { /* navigate */ }}
		onDismiss={() => { /* hide */ }}
	/>
	```
-->

<div class="ftu-container">
	<header class="ftu-header">
		<div class="ftu-titles">
			<h2 class="ftu-title">{title}</h2>
			{#if subtitle}
				<p class="ftu-subtitle">{subtitle}</p>
			{/if}
		</div>

		{#if onDismiss}
			<button
				type="button"
				class="ftu-dismiss"
				onclick={onDismiss}
				aria-label="Dismiss onboarding"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		{/if}
	</header>

	{#if steps.length > 0}
		<!-- Progress indicator -->
		<div class="ftu-progress">
			<div class="ftu-progress-bar">
				<div class="ftu-progress-fill" style="width: {progress}%"></div>
			</div>
			<span class="ftu-progress-text">{completedSteps.length} of {steps.length} complete</span>
		</div>

		<!-- Steps checklist -->
		<ul class="ftu-steps" role="list">
			{#each steps as step}
				{@const completed = isComplete(step.id)}

				<li class="ftu-step" class:ftu-step--complete={completed}>
					{#if showChecklist}
						<div class="ftu-step-check">
							{#if completed}
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
									<polyline points="20 6 9 17 4 12" />
								</svg>
							{/if}
						</div>
					{/if}

					<div class="ftu-step-content">
						<h4 class="ftu-step-title">{step.title}</h4>
						<p class="ftu-step-description">{step.description}</p>
					</div>

					{#if step.action && !completed}
						<button
							type="button"
							class="ftu-step-action"
							onclick={() => onStepClick?.(step.id)}
						>
							{step.action}
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	{:else if children}
		<div class="ftu-custom">
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.ftu-container {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.ftu-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-md);
	}

	.ftu-titles {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.ftu-title {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.ftu-subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.ftu-dismiss {
		background: none;
		border: none;
		padding: var(--space-xs);
		cursor: pointer;
		color: var(--color-fg-muted);
		border-radius: var(--radius-md);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.ftu-dismiss:hover {
		background: var(--color-hover);
		color: var(--color-fg-secondary);
	}

	.ftu-dismiss:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.ftu-dismiss svg {
		width: 20px;
		height: 20px;
	}

	/* Progress */
	.ftu-progress {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.ftu-progress-bar {
		flex: 1;
		height: 6px;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.ftu-progress-fill {
		height: 100%;
		background: var(--color-success);
		transition: width var(--duration-standard) var(--ease-standard);
	}

	.ftu-progress-text {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		white-space: nowrap;
	}

	/* Steps */
	.ftu-steps {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.ftu-step {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.ftu-step--complete {
		opacity: 0.7;
	}

	.ftu-step-check {
		width: 24px;
		height: 24px;
		border-radius: var(--radius-full);
		border: 2px solid var(--color-border-emphasis);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.ftu-step--complete .ftu-step-check {
		background: var(--color-success);
		border-color: var(--color-success);
		color: white;
	}

	.ftu-step-check svg {
		width: 14px;
		height: 14px;
	}

	.ftu-step-content {
		flex: 1;
		min-width: 0;
	}

	.ftu-step-title {
		font-size: var(--text-body);
		font-weight: 500;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.ftu-step--complete .ftu-step-title {
		text-decoration: line-through;
		color: var(--color-fg-secondary);
	}

	.ftu-step-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0;
	}

	.ftu-step-action {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--text-body-sm);
		font-weight: 500;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.ftu-step-action:hover {
		opacity: 0.9;
	}

	.ftu-step-action:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.ftu-custom {
		padding: var(--space-sm) 0;
	}
</style>
