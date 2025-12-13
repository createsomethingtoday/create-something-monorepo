<script lang="ts">
	import TriadAudit from '$lib/components/TriadAudit.svelte';
	import PraxisContainer from '$lib/components/PraxisContainer.svelte';
	import CodeEditor from '$lib/components/CodeEditor.svelte';
	import PraxisResult from '$lib/components/PraxisResult.svelte';
	import { ArrowLeft, ChevronRight } from 'lucide-svelte';

	// Example exercises data
	const exercises = [
		{
			id: 'triad-intro',
			title: 'Introduction to the Subtractive Triad',
			description: 'Practice identifying opportunities at each level of the Subtractive Triad.',
			type: 'triad-audit',
			difficulty: 'Beginner',
			path: 'Foundations'
		},
		{
			id: 'component-refactor',
			title: 'Component Refactoring',
			description: 'Apply DRY principles to reduce duplication in component code.',
			type: 'code',
			difficulty: 'Intermediate',
			path: 'Craft'
		},
		{
			id: 'design-tokens',
			title: 'Design Tokens Migration',
			description: 'Convert Tailwind utilities to Canon CSS variables.',
			type: 'code',
			difficulty: 'Intermediate',
			path: 'Craft'
		},
		{
			id: 'system-coherence',
			title: 'System Coherence Analysis',
			description: 'Evaluate how components serve the whole system.',
			type: 'triad-audit',
			difficulty: 'Advanced',
			path: 'Systems'
		}
	];

	const exampleCode = `function Button({ text, onClick, disabled, loading }) {
  if (loading) {
    return <button disabled>Loading...</button>;
  }
  if (disabled) {
    return <button disabled>{text}</button>;
  }
  return <button onClick={onClick}>{text}</button>;
}

function SubmitButton({ onClick }) {
  return <button onClick={onClick}>Submit</button>;
}

function CancelButton({ onClick }) {
  return <button onClick={onClick}>Cancel</button>;
}`;

	let selectedExercise = $state<string | null>(null);
	let userCode = $state('');

	function handleExerciseComplete(score: number) {
		console.log('Exercise completed with score:', score);
		// In production, this would save to D1
	}
</script>

<svelte:head>
	<title>Praxis Exercises - CREATE SOMETHING LMS</title>
</svelte:head>

<div class="container mx-auto max-w-6xl">
	<header class="page-header">
		<h1 class="page-title">Praxis</h1>
		<p class="page-description">
			Hands-on exercises to practice the principles of subtractive creation. Theory becomes
			understanding through disciplined practice.
		</p>
	</header>

	{#if !selectedExercise}
		<!-- Exercise listing -->
		<div class="exercises-grid">
			{#each exercises as exercise}
				<button
					class="exercise-card"
					onclick={() => {
						selectedExercise = exercise.id;
					}}
				>
					<div class="exercise-meta">
						<span class="exercise-path path-{exercise.path.toLowerCase()}">{exercise.path}</span>
						<span class="exercise-difficulty">{exercise.difficulty}</span>
					</div>
					<h3 class="exercise-title">{exercise.title}</h3>
					<p class="exercise-description">{exercise.description}</p>
					<div class="exercise-footer">
						<span class="exercise-type">{exercise.type}</span>
						<span class="exercise-arrow"><ChevronRight size={18} /></span>
					</div>
				</button>
			{/each}
		</div>
	{:else if selectedExercise === 'triad-intro'}
		<!-- Example Triad Audit exercise -->
		<div class="exercise-view">
			<button class="back-button" onclick={() => (selectedExercise = null)}>
				<ArrowLeft size={16} />
				<span>Back to Exercises</span>
			</button>

			<TriadAudit
				scenario="Review the code below and identify opportunities for improvement at each level of the Subtractive Triad. Look for duplication (DRY), excess complexity (Rams), and disconnection from the larger system (Heidegger)."
				targetCode={exampleCode}
				onComplete={handleExerciseComplete}
			/>
		</div>
	{:else}
		<!-- Placeholder for other exercise types -->
		<div class="exercise-view">
			<button class="back-button" onclick={() => (selectedExercise = null)}>
				<ArrowLeft size={16} />
				<span>Back to Exercises</span>
			</button>

			<PraxisContainer
				title={exercises.find((e) => e.id === selectedExercise)?.title ?? ''}
				instructions="This exercise is under construction. Check back soon!"
				showSubmit={false}
			>
				{#snippet children()}
					<CodeEditor bind:value={userCode} placeholder="// Your code here..." rows={15} />
				{/snippet}
			</PraxisContainer>
		</div>
	{/if}
</div>

<style>
	.page-header {
		padding: var(--space-2xl) 0 var(--space-xl);
		border-bottom: 1px solid var(--color-border-default);
		margin-bottom: var(--space-xl);
	}

	.page-title {
		font-size: var(--text-display);
		margin: 0 0 var(--space-sm) 0;
		color: var(--color-fg-primary);
	}

	.page-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		max-width: 48rem;
		margin: 0;
		line-height: 1.6;
	}

	.exercises-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: var(--space-lg);
		padding-bottom: var(--space-2xl);
	}

	.exercise-card {
		display: flex;
		flex-direction: column;
		padding: var(--space-lg);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-align: left;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.exercise-card:hover {
		border-color: var(--color-border-emphasis);
		background: var(--color-bg-surface);
	}

	.exercise-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-sm);
	}

	.exercise-path {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 600;
	}

	.exercise-path.path-foundations {
		color: var(--color-path-foundations);
	}

	.exercise-path.path-craft {
		color: var(--color-path-craft);
	}

	.exercise-path.path-systems {
		color: var(--color-path-systems);
	}

	.exercise-path.path-partnership {
		color: var(--color-path-partnership);
	}

	.exercise-path.path-advanced {
		color: var(--color-path-advanced);
	}

	.exercise-difficulty {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.exercise-title {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm) 0;
	}

	.exercise-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin: 0 0 var(--space-md) 0;
		flex: 1;
	}

	.exercise-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	.exercise-type {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		text-transform: lowercase;
	}

	.exercise-arrow {
		display: flex;
		align-items: center;
		color: var(--color-fg-muted);
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.exercise-card:hover .exercise-arrow {
		transform: translateX(4px);
	}

	.exercise-view {
		max-width: 56rem;
		margin: 0 auto;
		padding-bottom: var(--space-2xl);
	}

	.back-button {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-md);
		margin-bottom: var(--space-lg);
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		font-family: var(--font-mono);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.back-button:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}
</style>
