<script lang="ts">
	/**
	 * LessonSteps - Installation/action steps with checkmarks
	 * 
	 * Displays numbered steps that users can check off.
	 * Supports platform-specific commands.
	 */
	import { Check, Copy, Terminal } from 'lucide-svelte';

	interface Step {
		command?: string;
		text?: string;
		platform?: string;
		note?: string;
	}

	let {
		title,
		steps,
		class: className = ''
	}: {
		title: string;
		steps: Step[];
		class?: string;
	} = $props();

	let completedSteps = $state<Set<number>>(new Set());
	let copiedIndex = $state<number | null>(null);

	function toggleStep(index: number) {
		if (completedSteps.has(index)) {
			completedSteps.delete(index);
		} else {
			completedSteps.add(index);
		}
		completedSteps = new Set(completedSteps);
	}

	async function copyCommand(command: string, index: number) {
		await navigator.clipboard.writeText(command);
		copiedIndex = index;
		setTimeout(() => {
			copiedIndex = null;
		}, 2000);
	}
</script>

<section class="lesson-steps {className}">
	<h3 class="steps-title">{title}</h3>
	
	<div class="steps-list">
		{#each steps as step, index}
			<div 
				class="step-card"
				class:completed={completedSteps.has(index)}
			>
				<button 
					class="step-checkbox"
					onclick={() => toggleStep(index)}
					aria-label={completedSteps.has(index) ? 'Mark incomplete' : 'Mark complete'}
				>
					{#if completedSteps.has(index)}
						<Check size={16} />
					{:else}
						<span class="step-number">{index + 1}</span>
					{/if}
				</button>
				
				<div class="step-content">
					{#if step.platform}
						<span class="step-platform">{step.platform}</span>
					{/if}
					
					{#if step.command}
						<div class="step-command">
							<Terminal size={14} class="command-icon" />
							<code>{step.command}</code>
							<button 
								class="copy-btn"
								onclick={() => copyCommand(step.command!, index)}
								aria-label="Copy command"
							>
								{#if copiedIndex === index}
									<Check size={14} />
								{:else}
									<Copy size={14} />
								{/if}
							</button>
						</div>
					{/if}
					
					{#if step.text}
						<p class="step-text">{step.text}</p>
					{/if}
					
					{#if step.note}
						<p class="step-note">{step.note}</p>
					{/if}
				</div>
			</div>
		{/each}
	</div>
	
	<div class="steps-progress">
		<div 
			class="progress-fill"
			style="width: {(completedSteps.size / steps.length) * 100}%"
		></div>
	</div>
	<p class="steps-count">
		{completedSteps.size} of {steps.length} complete
	</p>
</section>

<style>
	.lesson-steps {
		padding: var(--space-xl);
		max-width: 700px;
		margin: var(--space-xl) auto;
	}

	.steps-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		margin-bottom: var(--space-lg);
	}

	.steps-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.step-card {
		display: flex;
		gap: var(--space-md);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-md);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.step-card.completed {
		background: var(--color-bg-elevated);
		border-color: var(--color-success);
	}

	.step-card.completed .step-content {
		opacity: 0.7;
	}

	.step-checkbox {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid var(--color-border-default);
		border-radius: var(--radius-full);
		background: var(--color-bg-base);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.step-card.completed .step-checkbox {
		background: var(--color-success);
		border-color: var(--color-success);
		color: var(--color-bg-pure);
	}

	.step-number {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.step-content {
		flex: 1;
		min-width: 0;
	}

	.step-platform {
		display: inline-block;
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-xs);
	}

	.step-command {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-base);
		border-radius: var(--radius-sm);
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
	}

	.step-command :global(.command-icon) {
		color: var(--color-fg-muted);
		flex-shrink: 0;
	}

	.step-command code {
		flex: 1;
		overflow-x: auto;
		white-space: nowrap;
	}

	.copy-btn {
		flex-shrink: 0;
		padding: var(--space-xs);
		background: transparent;
		border: none;
		color: var(--color-fg-muted);
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.copy-btn:hover {
		color: var(--color-fg-primary);
	}

	.step-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: var(--space-xs) 0 0;
	}

	.step-note {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		font-style: italic;
		margin: var(--space-xs) 0 0;
	}

	.steps-progress {
		height: 4px;
		background: var(--color-bg-surface);
		border-radius: var(--radius-full);
		margin-top: var(--space-lg);
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--color-success);
		transition: width var(--duration-standard) var(--ease-standard);
	}

	.steps-count {
		text-align: center;
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-top: var(--space-sm);
		margin-bottom: 0;
	}
</style>
