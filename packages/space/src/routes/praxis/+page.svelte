<script lang="ts">
	/**
	 * Integration Praxis
	 *
	 * A tool for understanding WORKWAY through practice.
	 * Not a game—a compressed hermeneutic circle.
	 *
	 * "Weniger, aber besser"
	 */

	import { exercises, type Exercise } from '$lib/praxis/exercises';
	import CodeEditor from '$lib/components/CodeEditor.svelte';

	let currentExerciseIndex = $state(0);
	let code = $state(exercises[0].starterCode);
	let output = $state<string[]>([]);
	let isRunning = $state(false);
	let isValid = $state(false);
	let hasReflected = $state(false);

	let exercise = $derived(exercises[currentExerciseIndex]);
	let showPattern = $derived(isValid && hasReflected);
	let progress = $derived(`${currentExerciseIndex + 1}/${exercises.length}`);
	let canNext = $derived(currentExerciseIndex < exercises.length - 1);
	let canPrev = $derived(currentExerciseIndex > 0);
	let isLastExercise = $derived(currentExerciseIndex === exercises.length - 1);

	let editor: CodeEditor;

	function handleCodeChange(newCode: string) {
		code = newCode;
	}

	async function runCode() {
		if (isRunning) return;
		isRunning = true;
		output = ['Running...'];

		try {
			const response = await fetch('/api/praxis/run', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ exerciseId: exercise.id, code })
			});
			const result = await response.json();
			output = result.success ? result.output : [`Error: ${result.error}`];
			isValid = result.valid === true;
		} catch (err) {
			output = [`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`];
			isValid = false;
		} finally {
			isRunning = false;
		}
	}

	function navigate(direction: 'prev' | 'next') {
		if (direction === 'prev' && !canPrev) return;
		if (direction === 'next' && !canNext) return;
		currentExerciseIndex += direction === 'next' ? 1 : -1;
		code = exercises[currentExerciseIndex].starterCode;
		editor?.setCode(code);
		output = [];
		isValid = false;
		hasReflected = false;
	}

	function reset() {
		code = exercise.starterCode;
		editor?.setCode(code);
		output = [];
		isValid = false;
		hasReflected = false;
	}

	function confirmReflection() {
		hasReflected = true;
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault();
			runCode();
		}
	}
</script>

<svelte:head>
	<title>Integration Praxis | CREATE SOMETHING</title>
	<meta
		name="description"
		content="Learn WORKWAY patterns through practice. A compressed hermeneutic circle."
	/>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="praxis">
	<header class="header">
		<div>
			<h1>Integration Praxis</h1>
			<p>Understanding through practice</p>
		</div>
		<span class="progress">{progress}</span>
	</header>

	<div class="content">
		<section class="panel">
			<div class="panel-header">
				<span class="label">Code</span>
				<span class="title">{exercise.title}</span>
			</div>
			<div class="editor">
				<CodeEditor
					bind:this={editor}
					initialCode={code}
					onChange={handleCodeChange}
					height="100%"
				/>
			</div>
			<div class="controls">
				<button class="btn-primary" onclick={runCode} disabled={isRunning}>
					{isRunning ? 'Running...' : 'Run'}
				</button>
				<button class="btn-secondary" onclick={reset}>Reset</button>
				<div class="nav">
					<button class="btn-nav" onclick={() => navigate('prev')} disabled={!canPrev}>←</button>
					<button class="btn-nav" onclick={() => navigate('next')} disabled={!canNext}>→</button>
				</div>
			</div>
		</section>

		<section class="panel info">
			<div class="section">
				<div class="section-header">
					<span class="label">Context</span>
					<span class="pattern">{exercise.pattern}</span>
				</div>
				<div class="section-content">
					<p><strong>Situation:</strong> {exercise.context.situation}</p>
					<p><strong>Task:</strong> {exercise.context.task}</p>
					<p class="notice">{exercise.context.notice}</p>
				</div>
			</div>

			<div class="section">
				<div class="section-header">
					<span class="label">Output</span>
				</div>
				<pre class="output">{output.length > 0 ? output.join('\n') : 'Run code to see output'}</pre>
			</div>

			{#if isValid && !hasReflected}
				<div class="section reflection">
					<div class="section-header">
						<span class="label">Apply the Subtractive Triad</span>
					</div>
					<div class="section-content">
						<p class="triad-intro">Before the pattern reveals, consider your solution:</p>
						<div class="triad-questions">
							<p><strong>DRY:</strong> Is there duplication to unify?</p>
							<p><strong>Rams:</strong> Is there anything to remove?</p>
							<p><strong>Heidegger:</strong> Does this serve the whole?</p>
						</div>
						<p class="triad-note">If you used AI, apply these questions to its output.</p>
						<button class="btn-continue" onclick={confirmReflection}>
							Continue to Pattern
						</button>
					</div>
				</div>
			{:else if showPattern}
				<div class="section pattern-reveal">
					<div class="section-header">
						<span class="label">Pattern Earned</span>
					</div>
					<div class="section-content">
						<p class="discovery">{exercise.patternReveal.discovery}</p>
						<pre class="canonical">{exercise.patternReveal.canonicalSolution}</pre>
						<p>{exercise.patternReveal.whyItMatters}</p>
						<p class="rams">{exercise.patternReveal.ramsConnection}</p>
						<p class="reference">{exercise.patternReveal.reference}</p>
					</div>
				</div>
			{/if}
		</section>
	</div>

	{#if isLastExercise && showPattern}
		<footer class="completion">
			<h2>Praxis Complete</h2>
			<p>You've encountered the patterns that emerge through building with WORKWAY.</p>
			<ul>
				<li>Structured errors over strings</li>
				<li>Explicit timeouts over implicit trust</li>
				<li>Exponential backoff over naive retry</li>
				<li>Signature verification over payload trust</li>
				<li>Honest capabilities over optimistic claims</li>
			</ul>
			<div class="actions">
				<a href="https://github.com/WORKWAYCO/WORKWAY" class="btn-primary" target="_blank"
					>DEVELOPERS.md</a
				>
				<a href="/experiments" class="btn-secondary">Experiments</a>
			</div>
		</footer>
	{/if}
</div>

<style>
	.praxis {
		min-height: 100vh;
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
		padding: var(--space-md);
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: var(--space-md);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}

	.header h1 {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		margin: 0 0 var(--space-xs) 0;
		letter-spacing: var(--tracking-tight);
	}

	.header p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0;
	}

	.progress {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.content {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-md);
		min-height: calc(100vh - 12rem);
	}

	.panel {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		background: var(--color-bg-elevated);
		overflow: hidden;
	}

	.panel-header,
	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
		background: var(--color-bg-pure);
	}

	.label {
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider);
		color: var(--color-fg-muted);
	}

	.title,
	.pattern {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
	}

	.editor {
		flex: 1;
		min-height: 400px;
	}

	.controls {
		display: flex;
		gap: var(--space-xs);
		padding: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
		background: var(--color-bg-pure);
	}

	.nav {
		margin-left: auto;
		display: flex;
		gap: 4px;
	}

	.btn-primary,
	.btn-secondary,
	.btn-nav,
	.btn-reveal {
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
		border: none;
		font-family: var(--font-sans);
	}

	.btn-primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.btn-primary:hover:not(:disabled) {
		opacity: 0.9;
	}

	.btn-secondary,
	.btn-nav {
		background: var(--color-hover);
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-default);
	}

	.btn-secondary:hover:not(:disabled),
	.btn-nav:hover:not(:disabled) {
		background: var(--color-active);
		border-color: var(--color-border-emphasis);
	}

	button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.info {
		gap: 0;
	}

	.section {
		border-bottom: 1px solid var(--color-border-default);
	}

	.section-content {
		padding: var(--space-sm);
	}

	.section-content p {
		margin: 0 0 var(--space-xs) 0;
		font-size: var(--text-body-sm);
		line-height: var(--leading-relaxed);
		color: var(--color-fg-secondary);
	}

	.section-content p:last-child {
		margin-bottom: 0;
	}

	.section-content strong {
		color: var(--color-fg-primary);
	}

	.notice {
		font-style: italic;
		color: var(--color-fg-muted) !important;
	}

	.output {
		margin: 0;
		padding: var(--space-sm);
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		line-height: var(--leading-relaxed);
		color: var(--color-fg-secondary);
		background: var(--color-bg-pure);
		min-height: 100px;
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	.reflection .section-content,
	.pattern-reveal .section-content {
		background: var(--color-bg-surface);
	}

	.triad-intro {
		color: var(--color-fg-secondary) !important;
		margin-bottom: var(--space-sm) !important;
	}

	.triad-questions {
		padding: var(--space-sm);
		background: var(--color-bg-pure);
		border-radius: var(--radius-sm);
		margin-bottom: var(--space-sm);
	}

	.triad-questions p {
		margin: var(--space-xs) 0 !important;
		font-size: var(--text-body-sm);
	}

	.triad-questions strong {
		color: var(--color-fg-primary);
		font-weight: var(--font-semibold);
	}

	.triad-note {
		font-size: var(--text-caption) !important;
		color: var(--color-fg-muted) !important;
		font-style: italic;
		margin-bottom: var(--space-sm) !important;
	}

	.btn-continue {
		width: 100%;
		padding: var(--space-sm);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		font-family: var(--font-sans);
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.btn-continue:hover {
		opacity: 0.9;
	}

	.discovery {
		font-weight: var(--font-medium);
		color: var(--color-fg-primary) !important;
	}

	.canonical {
		margin: var(--space-xs) 0 var(--space-sm) 0;
		padding: var(--space-sm);
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		line-height: var(--leading-normal);
		background: var(--color-bg-pure);
		border-radius: var(--radius-sm);
		overflow-x: auto;
	}

	.rams {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted) !important;
		font-style: italic;
	}

	.reference {
		font-size: var(--text-caption);
		color: var(--color-fg-subtle) !important;
		font-family: var(--font-mono);
	}

	.completion {
		margin-top: var(--space-lg);
		padding: var(--space-lg);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		background: var(--color-bg-elevated);
		text-align: center;
	}

	.completion h2 {
		font-size: var(--text-h2);
		margin: 0 0 var(--space-sm) 0;
	}

	.completion p {
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-sm) 0;
	}

	.completion ul {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--space-md) 0;
	}

	.completion li {
		color: var(--color-fg-tertiary);
		padding: var(--space-xs) 0;
	}

	.completion li::before {
		content: '✓ ';
		color: var(--color-success);
	}

	.actions {
		display: flex;
		gap: var(--space-sm);
		justify-content: center;
	}

	.actions a {
		text-decoration: none;
	}

	@media (max-width: 1024px) {
		.content {
			grid-template-columns: 1fr;
		}

		.editor {
			min-height: 300px;
		}
	}
</style>
