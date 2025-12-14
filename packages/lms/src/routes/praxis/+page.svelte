<script lang="ts">
	import TriadAudit from '$lib/components/TriadAudit.svelte';
	import PraxisContainer from '$lib/components/PraxisContainer.svelte';
	import CodeEditor from '$lib/components/CodeEditor.svelte';
	import PraxisResult from '$lib/components/PraxisResult.svelte';
	import { ArrowLeft, ChevronRight, Clock, BookOpen } from 'lucide-svelte';
	import { PRAXIS_EXERCISES, type PraxisExercise } from '$lib/content/praxis';
	import { PATHS } from '$lib/content/paths';

	// Get path title from ID
	function getPathTitle(pathId: string): string {
		return PATHS.find((p) => p.id === pathId)?.title ?? pathId;
	}

	// Get path color class
	function getPathClass(pathId: string): string {
		return `path-${pathId}`;
	}

	// Example code for triad audit exercises
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
			{#each PRAXIS_EXERCISES as exercise}
				<button
					class="exercise-card"
					onclick={() => {
						selectedExercise = exercise.id;
					}}
				>
					<div class="exercise-meta">
						<span class="exercise-path {getPathClass(exercise.pathId)}">{getPathTitle(exercise.pathId)}</span>
						<span class="exercise-difficulty">{exercise.difficulty}</span>
					</div>
					<h3 class="exercise-title">{exercise.title}</h3>
					<p class="exercise-description">{exercise.description}</p>
					<div class="exercise-footer">
						<div class="exercise-info">
							<span class="exercise-type">{exercise.type}</span>
							<span class="exercise-duration"><Clock size={12} /> {exercise.duration}</span>
						</div>
						<a
							href="/paths/{exercise.pathId}/{exercise.lessonId}"
							class="exercise-lesson-link"
							onclick={(e) => e.stopPropagation()}
						>
							<BookOpen size={14} />
							<span>Lesson</span>
						</a>
					</div>
				</button>
			{/each}
		</div>
	{:else if PRAXIS_EXERCISES.find((e) => e.id === selectedExercise)?.type === 'triad-audit'}
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
		{@const currentExercise = PRAXIS_EXERCISES.find((e) => e.id === selectedExercise)}
		<!-- Exercise view for code, analysis, design types -->
		<div class="exercise-view">
			<button class="back-button" onclick={() => (selectedExercise = null)}>
				<ArrowLeft size={16} />
				<span>Back to Exercises</span>
			</button>

			{#if currentExercise}
				<div class="exercise-header">
					<div class="exercise-meta-header">
						<span class="exercise-path {getPathClass(currentExercise.pathId)}">{getPathTitle(currentExercise.pathId)}</span>
						<span class="exercise-difficulty-badge">{currentExercise.difficulty}</span>
						<span class="exercise-duration-badge"><Clock size={12} /> {currentExercise.duration}</span>
					</div>
					<h1 class="exercise-title-large">{currentExercise.title}</h1>
					<p class="exercise-description-large">{currentExercise.description}</p>
				</div>

				<div class="objectives-section">
					<h3 class="objectives-title">Objectives</h3>
					<ul class="objectives-list">
						{#each currentExercise.objectives as objective}
							<li>{objective}</li>
						{/each}
					</ul>
				</div>

				{#if currentExercise.type === 'code'}
					<PraxisContainer
						title="Your Solution"
						instructions="Write code that addresses the objectives above. Apply the principles from the {getPathTitle(currentExercise.pathId)} path."
						showSubmit={true}
					>
						{#snippet children()}
							<CodeEditor bind:value={userCode} placeholder="// Your code here..." rows={15} />
						{/snippet}
					</PraxisContainer>
				{:else if currentExercise.type === 'analysis'}
					<PraxisContainer
						title="Your Analysis"
						instructions="Document your analysis below. Address each objective systematically."
						showSubmit={true}
					>
						{#snippet children()}
							<CodeEditor bind:value={userCode} placeholder="## Analysis&#10;&#10;### Objective 1: ..." rows={15} />
						{/snippet}
					</PraxisContainer>
				{:else if currentExercise.type === 'design'}
					<PraxisContainer
						title="Your Design"
						instructions="Document your design decisions and artifacts below."
						showSubmit={true}
					>
						{#snippet children()}
							<CodeEditor bind:value={userCode} placeholder="## Design Document&#10;&#10;### Architecture&#10;..." rows={15} />
						{/snippet}
					</PraxisContainer>
				{/if}

				<div class="lesson-link-section">
					<a href="/paths/{currentExercise.pathId}/{currentExercise.lessonId}" class="lesson-link-large">
						<BookOpen size={16} />
						<span>Review the lesson</span>
						<ChevronRight size={16} />
					</a>
				</div>
			{/if}
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

	/* Exercise info row */
	.exercise-info {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.exercise-duration {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.exercise-lesson-link {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		text-decoration: none;
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.exercise-lesson-link:hover {
		color: var(--color-fg-primary);
		background: var(--color-hover);
	}

	/* Exercise detail view header */
	.exercise-header {
		margin-bottom: var(--space-lg);
	}

	.exercise-meta-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-sm);
	}

	.exercise-difficulty-badge {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: capitalize;
	}

	.exercise-duration-badge {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.exercise-title-large {
		font-size: var(--text-h1);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm) 0;
	}

	.exercise-description-large {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin: 0;
	}

	/* Objectives section */
	.objectives-section {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		margin-bottom: var(--space-lg);
	}

	.objectives-title {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm) 0;
	}

	.objectives-list {
		margin: 0;
		padding-left: var(--space-lg);
		color: var(--color-fg-secondary);
	}

	.objectives-list li {
		margin-bottom: var(--space-xs);
		line-height: 1.6;
	}

	.objectives-list li:last-child {
		margin-bottom: 0;
	}

	/* Lesson link section */
	.lesson-link-section {
		margin-top: var(--space-lg);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.lesson-link-large {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-md);
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.lesson-link-large:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	/* Path color classes for additional paths */
	.exercise-path.path-infrastructure {
		color: var(--color-path-infrastructure, var(--color-data-1));
	}

	.exercise-path.path-agents {
		color: var(--color-path-agents, var(--color-data-3));
	}

	.exercise-path.path-method {
		color: var(--color-path-method, var(--color-data-4));
	}
</style>
