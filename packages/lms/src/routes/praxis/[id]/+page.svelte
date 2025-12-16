<script lang="ts">
	import TriadAudit from '$lib/components/TriadAudit.svelte';
	import PraxisContainer from '$lib/components/PraxisContainer.svelte';
	import CodeEditor from '$lib/components/CodeEditor.svelte';
	import { ArrowLeft, ChevronRight, Clock, BookOpen, CheckCircle2, Terminal, Copy, Check } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let userCode = $state('');
	let copied = $state(false);

	async function copyPromptToClipboard() {
		if (!data.exercise.claudeCodePrompt) return;
		try {
			await navigator.clipboard.writeText(data.exercise.claudeCodePrompt);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
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

	function getPathClass(pathId: string): string {
		return `path-${pathId}`;
	}

	function handleExerciseComplete(score: number) {
		console.log('Exercise completed with score:', score);
		// In production, this would save to D1
	}
</script>

<svelte:head>
	<title>{data.exercise.title} - Praxis - CREATE SOMETHING LMS</title>
</svelte:head>

<div class="container mx-auto max-w-4xl">
	<a href="/praxis" class="back-button">
		<ArrowLeft size={16} />
		<span>Back to Exercises</span>
	</a>

	<div class="exercise-header">
		<div class="exercise-meta-header">
			<span class="exercise-path {getPathClass(data.exercise.pathId)}">{data.pathTitle}</span>
			<span class="exercise-difficulty-badge">{data.exercise.difficulty}</span>
			<span class="exercise-duration-badge"><Clock size={12} /> {data.exercise.duration}</span>
		</div>
		<h1 class="exercise-title">{data.exercise.title}</h1>
		<p class="exercise-description">{data.exercise.description}</p>
	</div>

	<div class="objectives-section">
		<h3 class="objectives-title">Objectives</h3>
		<ul class="objectives-list">
			{#each data.exercise.objectives as objective}
				<li>{objective}</li>
			{/each}
		</ul>
	</div>

	{#if data.exercise.beadsTasks && data.exercise.beadsTasks.length > 0}
		<div class="beads-section">
			<h3 class="beads-title">
				<CheckCircle2 size={18} />
				<span>Beads Tasks</span>
			</h3>
			<p class="beads-description">
				Create these tasks in Beads before starting. You learn Beads by using Beads.
			</p>
			<div class="beads-tasks">
				{#each data.exercise.beadsTasks as task}
					<div class="beads-task">
						<code class="beads-command">bd create "{task.title}" --type={task.type}{#if task.labels} --labels={task.labels.join(',')}{/if}</code>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if data.exercise.claudeCodePrompt}
		<div class="claude-prompt-section">
			<h3 class="claude-prompt-title">
				<Terminal size={18} />
				<span>Claude Code Prompt</span>
			</h3>
			<p class="claude-prompt-description">
				Copy this prompt into Claude Code to build YOUR own version:
			</p>
			<div class="claude-prompt-block">
				<pre class="claude-prompt-text">{data.exercise.claudeCodePrompt}</pre>
				<button class="copy-button" onclick={copyPromptToClipboard}>
					{#if copied}
						<Check size={14} />
						<span>Copied!</span>
					{:else}
						<Copy size={14} />
						<span>Copy to Clipboard</span>
					{/if}
				</button>
			</div>
		</div>
	{/if}

	{#if data.exercise.type === 'triad-audit'}
		<TriadAudit
			scenario="Review the code below and identify opportunities for improvement at each level of the Subtractive Triad. Look for duplication (DRY), excess complexity (Rams), and disconnection from the larger system (Heidegger)."
			targetCode={exampleCode}
			onComplete={handleExerciseComplete}
		/>
	{:else if data.exercise.type === 'code'}
		<PraxisContainer
			title="Your Solution"
			instructions="Write code that addresses the objectives above. Apply the principles from the {data.pathTitle} path."
			showSubmit={true}
		>
			{#snippet children()}
				<CodeEditor bind:value={userCode} placeholder="// Your code here..." rows={15} />
			{/snippet}
		</PraxisContainer>
	{:else if data.exercise.type === 'analysis'}
		<PraxisContainer
			title="Your Analysis"
			instructions="Document your analysis below. Address each objective systematically."
			showSubmit={true}
		>
			{#snippet children()}
				<CodeEditor bind:value={userCode} placeholder="## Analysis&#10;&#10;### Objective 1: ..." rows={15} />
			{/snippet}
		</PraxisContainer>
	{:else if data.exercise.type === 'design'}
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
		<a href="/paths/{data.exercise.pathId}/{data.exercise.lessonId}" class="lesson-link">
			<BookOpen size={16} />
			<span>Review the lesson</span>
			<ChevronRight size={16} />
		</a>
	</div>
</div>

<style>
	.back-button {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-md);
		margin: var(--space-lg) 0;
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		font-family: var(--font-mono);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.back-button:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.exercise-header {
		margin-bottom: var(--space-lg);
	}

	.exercise-meta-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
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

	.exercise-path.path-infrastructure {
		color: var(--color-path-infrastructure, var(--color-data-1));
	}

	.exercise-path.path-agents {
		color: var(--color-path-agents, var(--color-data-3));
	}

	.exercise-path.path-method {
		color: var(--color-path-method, var(--color-data-4));
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

	.exercise-title {
		font-size: var(--text-h1);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm) 0;
	}

	.exercise-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin: 0;
	}

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

	/* Beads section */
	.beads-section {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		margin-bottom: var(--space-lg);
	}

	.beads-title {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs) 0;
	}

	.beads-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin: 0 0 var(--space-md) 0;
		font-style: italic;
	}

	.beads-tasks {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.beads-task {
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-sm) var(--space-md);
	}

	.beads-command {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		word-break: break-all;
	}

	/* Claude Code prompt section */
	.claude-prompt-section {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-data-3);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		margin-bottom: var(--space-lg);
	}

	.claude-prompt-title {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-h3);
		color: var(--color-data-3);
		margin: 0 0 var(--space-xs) 0;
	}

	.claude-prompt-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin: 0 0 var(--space-md) 0;
		font-style: italic;
	}

	.claude-prompt-block {
		position: relative;
	}

	.claude-prompt-text {
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-md);
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		white-space: pre-wrap;
		word-break: break-word;
		overflow-x: auto;
		max-height: 400px;
		overflow-y: auto;
		margin: 0 0 var(--space-sm) 0;
		line-height: 1.6;
	}

	.copy-button {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-data-3);
		border: none;
		border-radius: var(--radius-md);
		color: var(--color-bg-pure);
		font-size: var(--text-body-sm);
		font-family: var(--font-mono);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.copy-button:hover {
		opacity: 0.9;
		transform: translateY(-1px);
	}

	.copy-button:active {
		transform: translateY(0);
	}

	/* Lesson link section */
	.lesson-link-section {
		margin-top: var(--space-lg);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
		padding-bottom: var(--space-2xl);
	}

	.lesson-link {
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

	.lesson-link:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}
</style>
