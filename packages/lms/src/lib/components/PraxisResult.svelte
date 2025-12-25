<script lang="ts">
	import { Check, X, Info } from 'lucide-svelte';

	type ResultState = 'success' | 'error' | 'info';

	interface Props {
		state: ResultState;
		feedback: string;
		score?: number;
		maxScore?: number;
	}

	let { state, feedback, score, maxScore }: Props = $props();

	const stateLabels = {
		success: 'Success',
		error: 'Try Again',
		info: 'Information'
	};
</script>

<div class="result {state}">
	<div class="result-header">
		<span class="result-icon">
			{#if state === 'success'}
				<Check size={18} strokeWidth={2.5} />
			{:else if state === 'error'}
				<X size={18} strokeWidth={2.5} />
			{:else}
				<Info size={18} strokeWidth={2} />
			{/if}
		</span>
		<span class="result-label">{stateLabels[state]}</span>
		{#if score !== undefined && maxScore !== undefined}
			<span class="result-score">{score}/{maxScore}</span>
		{/if}
	</div>
	<p class="result-feedback">{feedback}</p>
</div>

<style>
	.result {
		padding: var(--space-md);
		border-radius: var(--radius-md);
		border: 1px solid;
	}

	.result.success {
		background: var(--color-success-muted);
		border-color: var(--color-success-border);
		color: var(--color-success);
	}

	.result.error {
		background: var(--color-error-muted);
		border-color: var(--color-error-border);
		color: var(--color-error);
	}

	.result.info {
		background: var(--color-info-muted);
		border-color: var(--color-info-border);
		color: var(--color-info);
	}

	.result-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-sm);
	}

	.result-icon {
		display: flex;
		align-items: center;
	}

	.result-label {
		font-size: var(--text-body-sm);
		font-weight: 600;
	}

	.result-score {
		margin-left: auto;
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		font-weight: 600;
	}

	.result-feedback {
		margin: 0;
		font-size: var(--text-body-sm);
		line-height: 1.6;
		opacity: 0.9;
	}
</style>
