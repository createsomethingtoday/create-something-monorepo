<script lang="ts">
	/**
	 * Integration Praxis
	 *
	 * A tool for understanding WORKWAY through practice.
	 * Now with graded validation via the Subtractive Triad.
	 *
	 * "Weniger, aber besser"
	 */

	import { exercises, type ValidationGrade } from '$lib/praxis/exercises';
	import { CodeEditor } from '@create-something/canon/domains/space';
	import { SEO } from '@create-something/canon';

	interface TriadFeedback {
		level: 'dry' | 'rams' | 'heidegger';
		feedback: string;
	}

	let currentExerciseIndex = $state(0);
	let code = $state(exercises[0].starterCode);
	let output = $state<string[]>([]);
	let isRunning = $state(false);
	let isValid = $state(false);
	let hasReflected = $state(false);
	let grade = $state<ValidationGrade>('bug');
	let triadFeedback = $state<TriadFeedback | undefined>(undefined);

	let exercise = $derived(exercises[currentExerciseIndex]);
	let showPattern = $derived(isValid && hasReflected);
	let progress = $derived(`Exercise ${currentExerciseIndex + 1} of ${exercises.length}`);
	let canNext = $derived(currentExerciseIndex < exercises.length - 1);
	let canPrev = $derived(currentExerciseIndex > 0);
	let isLastExercise = $derived(currentExerciseIndex === exercises.length - 1);

	// Graded UI states
	let isCanonical = $derived(grade === 'canonical');

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
			const result = await response.json() as { success: boolean; output?: string[]; error?: string; valid?: boolean; grade?: ValidationGrade; triadFeedback?: any };
			output = result.success ? result.output || [] : [`Error: ${result.error || 'Unknown error'}`];
			isValid = result.valid === true;
			grade = result.grade || 'bug';
			triadFeedback = result.triadFeedback;
		} catch (err) {
			output = [`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`];
			isValid = false;
			grade = 'bug';
			triadFeedback = undefined;
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
		grade = 'bug';
		triadFeedback = undefined;
	}

	function reset() {
		code = exercise.starterCode;
		editor?.setCode(code);
		output = [];
		isValid = false;
		hasReflected = false;
		grade = 'bug';
		triadFeedback = undefined;
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

	function getTriadLabel(level: 'dry' | 'rams' | 'heidegger'): string {
		switch (level) {
			case 'dry':
				return 'DRY — unify repeated code';
			case 'rams':
				return 'Rams — remove what does not help';
			case 'heidegger':
				return 'Heidegger — reconnect the code to the whole task';
		}
	}
</script>

<SEO
	title="Integration Praxis | The Automation Layer"
	description="Learn automation infrastructure patterns through practice. Build the layer that works while you sleep."
	keywords="automation infrastructure, WORKWAY, the automation layer, integration patterns, Subtractive Triad, code exercises"
	propertyName="space"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.space' },
		{ name: 'Praxis', url: 'https://createsomething.space/praxis' }
	]}
/>

<svelte:window onkeydown={handleKeydown} />

<div class="praxis">
	<header class="header">
		<div>
			<span class="eyebrow">Integration Praxis</span>
			<h1>Practice one integration failure at a time.</h1>
			<p>Each exercise starts with broken code. Fix it, run it, and use the feedback before moving on.</p>
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
					<button class="btn-nav" onclick={() => navigate('prev')} disabled={!canPrev}>Previous exercise</button>
					<button class="btn-nav" onclick={() => navigate('next')} disabled={!canNext}>Next exercise</button>
				</div>
			</div>
		</section>

		<section class="panel info">
			<div class="section">
				<div class="section-header">
					<span class="label">What to Try</span>
					<span class="pattern">{exercise.pattern}</span>
				</div>
				<div class="section-content">
					<p><strong>The situation:</strong> {exercise.context.situation}</p>
					<p><strong>Your task:</strong> {exercise.context.task}</p>
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
						<span class="label">{isCanonical ? 'Nice work' : 'Before you continue'}</span>
						{#if grade !== 'bug'}
							<span class="grade grade-{grade}">{grade.replace('_', ' ')}</span>
						{/if}
					</div>
					<div class="section-content">
						{#if isCanonical}
							<p class="triad-success">You found the canonical pattern.</p>
							<p class="triad-note">Nothing to simplify—this is the approach that works.</p>
						{:else if triadFeedback}
							<div class="triad-audit">
								<p class="audit-label">{getTriadLabel(triadFeedback.level)}</p>
								<p class="audit-feedback">{triadFeedback.feedback}</p>
							</div>
							<p class="triad-note">You can try again, or continue to see the canonical pattern.</p>
						{:else}
							<p class="triad-intro">Take a moment to look at what you wrote:</p>
							<div class="triad-questions">
								<p><strong>DRY — unify:</strong> Is any code repeated?</p>
								<p><strong>Rams — remove:</strong> Does anything fail to help?</p>
								<p><strong>Heidegger — reconnect:</strong> Does the code serve the whole task?</p>
							</div>
							<p class="triad-note">If you used AI, apply these questions to its output too.</p>
						{/if}
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
			<h2>Nice work</h2>
			<p>You've practiced the patterns that come up again and again when building with WORKWAY. Here's what you covered:</p>
			<ul>
				<li>Structured errors over strings</li>
				<li>Explicit timeouts over implicit trust</li>
				<li>Exponential backoff over naive retry</li>
				<li>Signature verification over payload trust</li>
				<li>Honest capabilities over optimistic claims</li>
			</ul>
			<p class="next-step">Next step: Try these patterns in a real project. You'll notice when they apply.</p>
			<div class="actions">
				<a href="https://github.com/WORKWAYCO/WORKWAY" class="btn-primary" target="_blank"
					>Read DEVELOPERS.md</a
				>
				<a href="/" class="btn-secondary">Back to Workbench</a>
			</div>
		</footer>
	{/if}
</div>

<style>
	.praxis {
		min-height: 100vh;
		background: var(--color-performance-bg-pure);
		color: var(--color-performance-fg-primary);
		padding: var(--space-performance-md);
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: var(--space-performance-md);
		padding-bottom: var(--space-performance-sm);
	}

	.header h1 {
		font-size: var(--text-performance-h2);
		font-weight: var(--font-performance-semibold);
		margin: 0 0 var(--space-performance-xs) 0;
		letter-spacing: var(--tracking-performance-tight);
	}

	.eyebrow {
		display: block;
		margin-bottom: var(--space-performance-xs);
		font-size: var(--text-performance-caption);
		font-weight: var(--font-performance-semibold);
		letter-spacing: var(--tracking-performance-wider);
		text-transform: uppercase;
		color: var(--color-performance-fg-muted);
	}

	.header p {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		margin: 0;
	}

	.progress {
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
	}

	.content {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-performance-md);
		min-height: calc(100vh - 12rem);
	}

	.panel {
		display: flex;
		flex-direction: column;
		padding: 0;
		border-radius: var(--radius-performance-scale-md);
		overflow: hidden;
	}

	.panel-header,
	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-performance-sm);
		background: var(--color-performance-bg-pure);
	}

	.label {
		font-size: var(--text-performance-caption);
		font-weight: var(--font-performance-semibold);
		text-transform: uppercase;
		letter-spacing: var(--tracking-performance-wider);
		color: var(--color-performance-fg-muted);
	}

	.title,
	.pattern {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-tertiary);
	}

	.grade {
		font-size: var(--text-performance-caption);
		font-weight: var(--font-performance-medium);
		padding: 2px 8px;
		border-radius: var(--radius-performance-scale-sm);
		text-transform: capitalize;
	}

	.grade-canonical {
		background: var(--color-performance-success-muted, rgba(68, 170, 68, 0.2));
		color: var(--color-performance-success, #44aa44);
	}

	.grade-valid {
		background: var(--color-performance-warning-subtle, #fff3cd);
		color: var(--color-performance-warning, #856404);
	}

	.grade-over_engineered {
		background: var(--color-performance-info-subtle, #cce5ff);
		color: var(--color-performance-info, #004085);
	}

	.editor {
		flex: 1;
		min-height: 400px;
	}

	.controls {
		display: flex;
		gap: var(--space-performance-xs);
		padding: var(--space-performance-sm);
		background: var(--color-performance-bg-pure);
	}

	.nav {
		margin-left: auto;
		display: flex;
		gap: 4px;
	}

	.btn-primary,
	.btn-secondary,
	.btn-nav {
		padding: var(--space-performance-xs) var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-body-sm);
		font-weight: var(--font-performance-medium);
		cursor: pointer;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
		border: none;
		font-family: var(--font-performance-sans);
	}

	.btn-primary {
		background: var(--color-performance-fg-primary);
		color: var(--color-performance-bg-pure);
	}

	.btn-primary:hover:not(:disabled) {
		opacity: 0.9;
	}

	.btn-secondary,
	.btn-nav {
		background: var(--color-performance-hover);
		color: var(--color-performance-fg-primary);
	}

	.btn-secondary:hover:not(:disabled),
	.btn-nav:hover:not(:disabled) {
		background: var(--color-performance-active);
		border-color: var(--color-performance-border-emphasis);
	}

	button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.info {
		gap: 0;
	}

	.section-content {
		padding: var(--space-performance-sm);
	}

	.section-content p {
		margin: 0 0 var(--space-performance-xs) 0;
		font-size: var(--text-performance-body-sm);
		line-height: var(--leading-performance-relaxed);
		color: var(--color-performance-fg-secondary);
	}

	.section-content p:last-child {
		margin-bottom: 0;
	}

	.section-content strong {
		color: var(--color-performance-fg-primary);
	}

	.notice {
		font-style: italic;
		color: var(--color-performance-fg-muted) !important;
	}

	.output {
		margin: 0;
		padding: var(--space-performance-sm);
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-body-sm);
		line-height: var(--leading-performance-relaxed);
		color: var(--color-performance-fg-secondary);
		background: var(--color-performance-bg-pure);
		min-height: 100px;
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	.reflection .section-content,
	.pattern-reveal .section-content {
		background: var(--color-performance-bg-surface);
	}

	.triad-intro {
		color: var(--color-performance-fg-secondary) !important;
		margin-bottom: var(--space-performance-sm) !important;
	}

	.triad-success {
		font-weight: var(--font-performance-medium);
		color: var(--color-performance-success, #44aa44) !important;
	}

	.triad-audit {
		padding: var(--space-performance-sm);
		background: var(--color-performance-bg-pure);
		border-radius: var(--radius-performance-scale-sm);
		margin-bottom: var(--space-performance-sm);
		border-left: 3px solid var(--color-performance-warning, #ffc107);
	}

	.audit-label {
		font-weight: var(--font-performance-semibold);
		color: var(--color-performance-fg-primary) !important;
		margin-bottom: var(--space-performance-xs) !important;
	}

	.audit-feedback {
		color: var(--color-performance-fg-secondary) !important;
	}

	.triad-questions {
		padding: var(--space-performance-sm);
		background: var(--color-performance-bg-pure);
		border-radius: var(--radius-performance-scale-sm);
		margin-bottom: var(--space-performance-sm);
	}

	.triad-questions p {
		margin: var(--space-performance-xs) 0 !important;
		font-size: var(--text-performance-body-sm);
	}

	.triad-questions strong {
		color: var(--color-performance-fg-primary);
		font-weight: var(--font-performance-semibold);
	}

	.triad-note {
		font-size: var(--text-performance-caption) !important;
		color: var(--color-performance-fg-muted) !important;
		font-style: italic;
		margin-bottom: var(--space-performance-sm) !important;
	}

	.btn-continue {
		width: 100%;
		padding: var(--space-performance-sm);
		background: var(--color-performance-fg-primary);
		color: var(--color-performance-bg-pure);
		border: none;
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-body-sm);
		font-weight: var(--font-performance-medium);
		font-family: var(--font-performance-sans);
		cursor: pointer;
		transition: opacity var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.btn-continue:hover {
		opacity: 0.9;
	}

	.discovery {
		font-weight: var(--font-performance-medium);
		color: var(--color-performance-fg-primary) !important;
	}

	.canonical {
		margin: var(--space-performance-xs) 0 var(--space-performance-sm) 0;
		padding: var(--space-performance-sm);
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-body-sm);
		line-height: var(--leading-performance-normal);
		background: var(--color-performance-bg-pure);
		border-radius: var(--radius-performance-scale-sm);
		overflow-x: auto;
	}

	.rams {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted) !important;
		font-style: italic;
	}

	.reference {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-subtle) !important;
		font-family: var(--font-performance-mono);
	}

	.completion {
		margin-top: var(--space-performance-lg);
		padding: var(--space-performance-lg);
		border-radius: var(--radius-performance-scale-md);
		text-align: center;
	}

	.completion h2 {
		font-size: var(--text-performance-h2);
		margin: 0 0 var(--space-performance-sm) 0;
	}

	.completion p {
		color: var(--color-performance-fg-secondary);
		margin: 0 0 var(--space-performance-sm) 0;
	}

	.completion ul {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--space-performance-md) 0;
	}

	.completion li {
		color: var(--color-performance-fg-tertiary);
		padding: var(--space-performance-xs) 0;
	}

	.completion li::before {
		content: '✓ ';
		color: var(--color-performance-success);
	}

	.actions {
		display: flex;
		gap: var(--space-performance-sm);
		justify-content: center;
	}

	.actions a {
		text-decoration: none;
	}

	@media (max-width: 1024px) {
		.content {
			grid-template-columns: 1fr;
			min-height: 0;
		}

		.editor {
			min-height: 300px;
		}
	}

	@media (max-width: 640px) {
		.header {
			gap: var(--space-performance-sm);
		}

		.controls {
			flex-wrap: wrap;
		}

		.nav {
			width: 100%;
			margin-left: 0;
		}

		.btn-nav {
			flex: 1;
		}
	}
</style>
