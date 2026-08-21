<script lang="ts">
	import { Button, SEO } from '@create-something/canon';
	import {
		assessWorkflowReadiness,
		readinessDimensions,
		type ReadinessAnswers
	} from '$lib/operator-library/readiness';

	let answers = $state<Partial<ReadinessAnswers>>({});

	const answeredCount = $derived(
		readinessDimensions.filter((dimension) => answers[dimension.id] !== undefined).length
	);
	const isComplete = $derived(answeredCount === readinessDimensions.length);
	const assessment = $derived(
		isComplete ? assessWorkflowReadiness(answers as ReadinessAnswers) : undefined
	);

	function setAnswer(id: keyof ReadinessAnswers, answer: boolean) {
		answers = { ...answers, [id]: answer };
	}

	function resetAssessment() {
		answers = {};
	}
</script>

<SEO
	title="Workflow Readiness"
	description="A short operator assessment for finding ambiguity, missing access, ownership gaps, mistrust, and absent proof before AI work runs."
	keywords="AI workflow readiness, AI governance assessment, operator playbook, workflow proof"
	propertyName="ltd"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.ltd' },
		{ name: 'Readiness', url: 'https://createsomething.ltd/readiness' }
	]}
/>

<main class="readiness-page">
	<header class="readiness-page__hero">
		<p>CREATE SOMETHING .ltd · Workflow readiness</p>
		<h1>Find the boundary before work crosses it.</h1>
		<p>
			Answer five questions about one recurring workflow. This stays in your browser; it is a
			quick way to see what must be clear before a team or agent can run the work with trust.
		</p>
	</header>

	<section class="readiness-page__assessment" aria-labelledby="assessment-title">
		<div class="readiness-page__progress" aria-live="polite">
			<span>Readiness check</span>
			<strong>{answeredCount} / {readinessDimensions.length}</strong>
		</div>
		<h2 id="assessment-title">Does this workflow have a place to stand?</h2>

		<div class="readiness-page__questions">
			{#each readinessDimensions as dimension, index}
				<fieldset>
					<legend><span>0{index + 1}</span>{dimension.question}</legend>
					<div>
						<button
							type="button"
							class:readiness-page__answer--selected={answers[dimension.id] === true}
							aria-pressed={answers[dimension.id] === true}
							onclick={() => setAnswer(dimension.id, true)}
						>Yes</button
						>
						<button
							type="button"
							class:readiness-page__answer--selected={answers[dimension.id] === false}
							aria-pressed={answers[dimension.id] === false}
							onclick={() => setAnswer(dimension.id, false)}
						>No</button
						>
					</div>
				</fieldset>
			{/each}
		</div>
	</section>

	{#if assessment}
		<section class="readiness-page__result" class:readiness-page__result--ready={assessment.state === 'ready'} aria-live="polite">
			<p>State · {assessment.state}</p>
			{#if assessment.state === 'ready'}
				<h2>This workflow has a visible operating boundary.</h2>
				<p>Choose the playbook that fits the work and make the owner, wait point, and receipt explicit.</p>
			{:else if assessment.state === 'review'}
				<h2>Two boundaries need a human decision before this can run with trust.</h2>
				<p>Resolve the gaps below, then assess the workflow again.</p>
			{:else}
				<h2>Do not delegate this workflow yet.</h2>
				<p>Several operating boundaries are missing. Start with the first gap and keep the work in a reviewable lane.</p>
			{/if}

			{#if assessment.gaps.length}
				<ul>
					{#each assessment.gaps as gap}
						<li><strong>{gap.gap}</strong><span>{gap.detail}</span></li>
					{/each}
				</ul>
			{/if}

			<div class="readiness-page__result-actions">
				<Button href={assessment.nextAction.href}>{assessment.nextAction.label}</Button>
				<Button variant="secondary" onclick={resetAssessment}>Check another workflow</Button>
			</div>
		</section>
	{:else}
		<section class="readiness-page__next" aria-label="What happens next">
			<p>When all five answers are in, you will get a readiness state and the right first playbook.</p>
		</section>
	{/if}
</main>

<style>
	.readiness-page {
		min-height: 100%;
		background: var(--color-performance-panel, #fff);
		color: var(--color-performance-ink, #090909);
	}

	.readiness-page__hero,
	.readiness-page__assessment,
	.readiness-page__result,
	.readiness-page__next {
		padding: clamp(2rem, 6vw, 6rem) clamp(1rem, 8vw, 10rem);
	}

	.readiness-page__hero {
		background: var(--color-performance-ink, #090909);
		color: var(--color-performance-panel, #fff);
	}

	.readiness-page__hero > p:first-child,
	.readiness-page__progress,
	.readiness-page__result > p:first-child {
		margin: 0;
		font-family: var(--font-performance-mono);
		font-size: 0.75rem;
		font-weight: var(--font-performance-semibold);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.readiness-page h1,
	.readiness-page h2 {
		margin: 0;
		font-weight: var(--font-performance-medium);
		letter-spacing: -0.055em;
		line-height: 0.98;
		text-wrap: balance;
	}

	.readiness-page h1 {
		max-width: 58rem;
		margin-top: 1rem;
		font-size: clamp(3.4rem, 8vw, 7.6rem);
	}

	.readiness-page h2 {
		max-width: 50rem;
		font-size: clamp(2rem, 4.5vw, 4.4rem);
	}

	.readiness-page__hero > p:last-child {
		max-width: 43rem;
		margin: 1.5rem 0 0;
		color: rgba(255, 255, 255, 0.72);
		font-size: clamp(1rem, 1.8vw, 1.3rem);
		line-height: 1.5;
	}

	.readiness-page__assessment {
		border-top: 1px solid var(--color-performance-line, #d7d7d2);
	}

	.readiness-page__progress {
		display: flex;
		justify-content: space-between;
		max-width: 58rem;
		margin-bottom: 1.2rem;
		color: var(--color-performance-muted, #5e6268);
	}

	.readiness-page__questions {
		max-width: 58rem;
		margin-top: 2.5rem;
		border-top: 1px solid var(--color-performance-line, #d7d7d2);
	}

	.readiness-page fieldset {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 1.5rem;
		align-items: center;
		margin: 0;
		padding: 1.25rem 0;
		border: 0;
		border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
	}

	.readiness-page legend {
		font-size: clamp(1rem, 1.7vw, 1.28rem);
		line-height: 1.35;
	}

	.readiness-page legend span {
		display: inline-block;
		width: 2.7rem;
		color: var(--color-performance-signal, #3267d6);
		font-family: var(--font-performance-mono);
		font-size: 0.76rem;
	}

	.readiness-page fieldset > div {
		display: flex;
		gap: 0.45rem;
	}

	.readiness-page__questions button {
		min-width: 4.25rem;
		min-height: 2.75rem;
		border: 1px solid var(--color-performance-line-strong, #9c9c96);
		border-radius: 0;
		background: var(--color-performance-panel, #fff);
		color: var(--color-performance-ink, #090909);
		font: inherit;
		font-size: 0.9rem;
		font-weight: var(--font-performance-semibold);
		cursor: pointer;
	}

	.readiness-page__questions button:hover,
	.readiness-page__questions .readiness-page__answer--selected {
		border-color: var(--color-performance-ink, #090909);
		background: var(--color-performance-ink, #090909);
		color: var(--color-performance-panel, #fff);
	}

	.readiness-page__result {
		border-top: 1px solid var(--color-performance-line, #d7d7d2);
		background: #fff7e5;
	}

	.readiness-page__result--ready {
		background: #e7f4ea;
	}

	.readiness-page__result > p:first-child {
		margin-bottom: 1rem;
		color: var(--color-performance-muted, #5e6268);
	}

	.readiness-page__result > p:not(:first-child),
	.readiness-page__next p {
		max-width: 43rem;
		margin: 1.25rem 0 0;
		color: var(--color-performance-muted, #5e6268);
		font-size: 1.1rem;
		line-height: 1.5;
	}

	.readiness-page__result ul {
		display: grid;
		gap: 0;
		max-width: 58rem;
		margin: 2rem 0 0;
		padding: 0;
		border-top: 1px solid rgba(9, 9, 9, 0.2);
		list-style: none;
	}

	.readiness-page__result li {
		display: grid;
		grid-template-columns: minmax(0, 0.7fr) minmax(0, 1.3fr);
		gap: 1.5rem;
		padding: 1rem 0;
		border-bottom: 1px solid rgba(9, 9, 9, 0.2);
	}

	.readiness-page__result li strong {
		font-size: 1rem;
	}

	.readiness-page__result li span {
		color: var(--color-performance-muted, #5e6268);
		line-height: 1.45;
	}

	.readiness-page__result-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 2rem;
	}

	.readiness-page__next {
		border-top: 1px solid var(--color-performance-line, #d7d7d2);
		background: var(--color-performance-paper, #f3f3f0);
	}

	.readiness-page__next p {
		margin: 0;
	}

	@media (max-width: 47.99rem) {
		.readiness-page fieldset,
		.readiness-page__result li {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
	}
</style>
