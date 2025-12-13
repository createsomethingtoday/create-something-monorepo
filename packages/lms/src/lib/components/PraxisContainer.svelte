<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		instructions: string;
		children?: Snippet;
		result?: Snippet;
		onsubmit?: () => void;
		submitting?: boolean;
		showSubmit?: boolean;
	}

	let {
		title,
		instructions,
		children,
		result,
		onsubmit,
		submitting = false,
		showSubmit = true
	}: Props = $props();
</script>

<div class="container">
	<div class="header">
		<h2 class="title">{title}</h2>
		<p class="instructions">{instructions}</p>
	</div>

	<div class="exercise">
		{@render children?.()}
	</div>

	{#if result}
		<div class="result-area">
			{@render result()}
		</div>
	{/if}

	{#if showSubmit}
		<div class="actions">
			<button class="submit-btn" onclick={onsubmit} disabled={submitting}>
				{submitting ? 'Evaluating...' : 'Submit'}
			</button>
		</div>
	{/if}
</div>

<style>
	.container {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.header {
		padding: var(--space-lg);
		border-bottom: 1px solid var(--color-border-default);
	}

	.title {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm) 0;
	}

	.instructions {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		margin: 0;
		line-height: 1.6;
	}

	.exercise {
		padding: var(--space-lg);
	}

	.result-area {
		padding: 0 var(--space-lg) var(--space-lg);
	}

	.actions {
		padding: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
		display: flex;
		justify-content: flex-end;
	}

	.submit-btn {
		padding: var(--space-sm) var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
		font-family: var(--font-mono);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.submit-btn:hover:not(:disabled) {
		background: var(--color-hover);
		border-color: var(--color-border-strong);
	}

	.submit-btn:active:not(:disabled) {
		background: var(--color-active);
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
