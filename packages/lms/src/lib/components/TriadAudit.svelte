<script lang="ts">
	import PraxisContainer from './PraxisContainer.svelte';
	import PraxisResult from './PraxisResult.svelte';

	interface Props {
		scenario: string;
		targetCode?: string;
		onComplete?: (score: number) => void;
	}

	let { scenario, targetCode, onComplete }: Props = $props();

	interface TriadResponse {
		dry: string;
		rams: string;
		heidegger: string;
	}

	let responses = $state<TriadResponse>({
		dry: '',
		rams: '',
		heidegger: ''
	});

	let evaluationResult = $state<{
		state: 'success' | 'error' | 'info';
		feedback: string;
		score: number;
	} | null>(null);

	let submitting = $state(false);

	const questions = [
		{
			id: 'dry' as const,
			level: 'Implementation',
			question: 'Have I built this before?',
			action: 'Unify',
			description: 'Look for duplication - repeated logic, similar patterns, or redundant code.'
		},
		{
			id: 'rams' as const,
			level: 'Artifact',
			question: 'Does this earn its existence?',
			action: 'Remove',
			description: 'Identify excess - unnecessary complexity, unused features, or decorative elements.'
		},
		{
			id: 'heidegger' as const,
			level: 'System',
			question: 'Does this serve the whole?',
			action: 'Reconnect',
			description:
				'Find disconnection - components that work in isolation but not as a coherent system.'
		}
	];

	function evaluateResponses() {
		submitting = true;

		// Simple keyword-based evaluation (in production, this would use AI)
		let score = 0;
		const maxScore = 3;

		// DRY: Look for mentions of duplication, repetition, reuse
		const dryKeywords = ['duplicate', 'repeat', 'reuse', 'common', 'shared', 'abstract'];
		if (dryKeywords.some((kw) => responses.dry.toLowerCase().includes(kw))) score++;

		// Rams: Look for mentions of simplification, removal, unnecessary
		const ramsKeywords = [
			'remove',
			'simplify',
			'unnecessary',
			'excess',
			'minimal',
			'essential'
		];
		if (ramsKeywords.some((kw) => responses.rams.toLowerCase().includes(kw))) score++;

		// Heidegger: Look for mentions of connection, coherence, system
		const heideggerKeywords = [
			'connect',
			'integrate',
			'coherent',
			'whole',
			'system',
			'relationship'
		];
		if (heideggerKeywords.some((kw) => responses.heidegger.toLowerCase().includes(kw))) score++;

		// Generate feedback
		let feedback = '';
		if (score === maxScore) {
			feedback =
				'Excellent! You identified opportunities at all three levels of the Subtractive Triad.';
			evaluationResult = { state: 'success', feedback, score };
		} else if (score >= 2) {
			feedback =
				'Good work! You found issues at multiple levels. Consider revisiting the questions you missed.';
			evaluationResult = { state: 'info', feedback, score };
		} else {
			feedback =
				'Think more deeply about each level. Look for specific examples in the code of duplication, excess, and disconnection.';
			evaluationResult = { state: 'error', feedback, score };
		}

		submitting = false;

		if (onComplete) {
			onComplete(score);
		}
	}
</script>

<PraxisContainer
	title="Subtractive Triad Audit"
	instructions={scenario}
	onsubmit={evaluateResponses}
	{submitting}
>
	{#snippet children()}
		{#if targetCode}
			<div class="code-sample">
				<div class="code-header">Code to Audit</div>
				<pre class="code"><code>{targetCode}</code></pre>
			</div>
		{/if}

		<div class="triad-sections">
			{#each questions as q}
				<div class="triad-section">
					<div class="section-header">
						<div class="level">{q.level}</div>
						<div class="discipline">{q.action}</div>
					</div>

					<div class="question">{q.question}</div>
					<p class="description">{q.description}</p>

					<textarea
						bind:value={responses[q.id]}
						placeholder="Your analysis..."
						rows="4"
						class="response-input"
					></textarea>
				</div>
			{/each}
		</div>
	{/snippet}

	{#snippet result()}
		{#if evaluationResult !== null}
			<PraxisResult
				state={evaluationResult.state}
				feedback={evaluationResult.feedback}
				score={evaluationResult.score}
				maxScore={3}
			/>
		{/if}
	{/snippet}
</PraxisContainer>

<style>
	.code-sample {
		margin-bottom: var(--space-lg);
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.code-header {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-elevated);
		border-bottom: 1px solid var(--color-border-default);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.code {
		margin: 0;
		padding: var(--space-md);
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		overflow-x: auto;
	}

	.triad-sections {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.triad-section {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-sm);
	}

	.level {
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.discipline {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-fg-muted);
	}

	.question {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		font-style: italic;
		margin-bottom: var(--space-xs);
	}

	.description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin: 0 0 var(--space-sm) 0;
		line-height: 1.5;
	}

	.response-input {
		width: 100%;
		padding: var(--space-sm);
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-primary);
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		line-height: 1.6;
		resize: vertical;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.response-input:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
	}

	.response-input::placeholder {
		color: var(--color-fg-muted);
	}
</style>
