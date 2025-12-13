<script lang="ts">
	type ResultState = 'success' | 'error' | 'info';

	interface Props {
		state: ResultState;
		feedback: string;
		score?: number;
		maxScore?: number;
	}

	let { state, feedback, score, maxScore }: Props = $props();

	const icons = {
		success: '✓',
		error: '✗',
		info: 'ℹ'
	};

	const stateLabels = {
		success: 'Success',
		error: 'Try Again',
		info: 'Information'
	};
</script>

<div class="result {state}">
	<div class="result-header">
		<span class="result-icon">{icons[state]}</span>
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
		background: rgba(68, 170, 68, 0.1);
		border-color: rgba(68, 170, 68, 0.3);
		color: var(--color-success);
	}

	.result.error {
		background: rgba(204, 68, 68, 0.1);
		border-color: rgba(204, 68, 68, 0.3);
		color: var(--color-error);
	}

	.result.info {
		background: rgba(68, 119, 170, 0.1);
		border-color: rgba(68, 119, 170, 0.3);
		color: var(--color-info);
	}

	.result-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-sm);
	}

	.result-icon {
		font-size: var(--text-body-lg);
		font-weight: bold;
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
