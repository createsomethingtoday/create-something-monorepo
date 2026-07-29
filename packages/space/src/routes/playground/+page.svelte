<script lang="ts">
	/**
	 * Code Mode: The Zuhandenheit Experiment
	 *
	 * Experience Heidegger's tool-transparency distinction firsthand.
	 * Which mode lets the tool recede? Which forces tool-attention?
	 */

	import { SEO } from '@create-something/canon';

	// Experiment state
	let currentTask = $state(0);
	let toolCallStartTime = $state<number | null>(null);
	let toolCallEndTime = $state<number | null>(null);
	let codeStartTime = $state<number | null>(null);
	let codeEndTime = $state<number | null>(null);
	let completed = $state(false);
	let showReflection = $state(false);

	// User inputs
	let toolCallAnswer = $state('');
	let codeAnswer = $state('');

	// Attention tracking
	let toolCallAttention = $state<'task' | 'tool' | null>(null);
	let codeModeAttention = $state<'task' | 'tool' | null>(null);

	// Tasks for comparison
	const tasks = [
		{
			description: 'Read a file and count how many functions it contains',
			hint: 'Think about how you would accomplish this goal'
		},
		{
			description: 'List all TypeScript files in the src directory',
			hint: 'Consider the pattern matching and filtering needed'
		},
		{
			description: 'Find files containing the word "export" and show file names',
			hint: 'Think about searching across files'
		}
	];

	const currentTaskData = $derived(tasks[currentTask]);
	const experimentStep = $derived(!toolCallEndTime ? 1 : !codeEndTime ? 2 : 3);

	// Timing calculations
	const toolCallDuration = $derived(
		toolCallStartTime && toolCallEndTime ? toolCallEndTime - toolCallStartTime : null
	);
	const codeDuration = $derived(
		codeStartTime && codeEndTime ? codeEndTime - codeStartTime : null
	);

	function startToolCall() {
		toolCallStartTime = Date.now();
		toolCallEndTime = null;
	}

	function completeToolCall() {
		if (toolCallStartTime && toolCallAnswer.trim() && toolCallAttention) {
			toolCallEndTime = Date.now();
		}
	}

	function startCodeMode() {
		codeStartTime = Date.now();
		codeEndTime = null;
	}

	function completeCodeMode() {
		if (codeStartTime && codeAnswer.trim() && codeModeAttention) {
			codeEndTime = Date.now();
			completed = true;
		}
	}

	function recordAttention(mode: 'tool' | 'code', focus: 'task' | 'tool') {
		if (mode === 'tool') {
			toolCallAttention = focus;
		} else {
			codeModeAttention = focus;
		}
	}

	function reset() {
		toolCallStartTime = null;
		toolCallEndTime = null;
		codeStartTime = null;
		codeEndTime = null;
		toolCallAnswer = '';
		codeAnswer = '';
		toolCallAttention = null;
		codeModeAttention = null;
		completed = false;
		showReflection = false;
	}

	function nextTask() {
		if (currentTask < tasks.length - 1) {
			currentTask++;
			reset();
		}
	}

	// Example solutions (shown after completion)
	const toolCallExample = `<invoke name="Read">
  <parameter name="file_path">/src/index.ts</parameter>
</invoke>

<!-- Wait for response... -->
<!-- Then process the content -->

<invoke name="Grep">
  <parameter name="pattern">function\\s+\\w+</parameter>
  <parameter name="path">/src/index.ts</parameter>
  <parameter name="output_mode">count</parameter>
</invoke>`;

	const codeExample = `const content = await fs.readFile('/src/index.ts', 'utf-8');
const lines = content.split('\\n');
const functions = lines.filter(line =>
  /function\\s+\\w+/.test(line)
);
console.log(\`Found \${functions.length} functions\`);`;
</script>

<SEO
	title="Code Mode: The Zuhandenheit Experiment"
	description="Experience Heidegger's tool-transparency distinction. Which mode lets tools recede into use?"
	keywords="Heidegger, Zuhandenheit, Vorhandenheit, tool transparency, code mode, tool calling, phenomenology"
	propertyName="space"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.space' },
		{ name: 'Playground', url: 'https://createsomething.space/playground' }
	]}
/>

<main class="experiment-page">
	<section data-page-chapter="orientation" class="tool-opening">
		<div class="max-w-6xl mx-auto opening-inner">
			<p class="eyebrow">Code Mode experiment · three short steps</p>
			<h1>Compare where your attention goes.</h1>
			<p class="opening-copy">
				Complete the same small task with tool calls—structured requests to named tools—and then
				with familiar code. Record whether you were thinking about the task or the tool; the
				comparison is the evidence.
			</p>
			<ol class="opening-steps" aria-label="Experiment sequence">
				<li><span>1</span>Try tool calling</li>
				<li><span>2</span>Try familiar code</li>
				<li><span>3</span>Compare your attention</li>
			</ol>
		</div>
	</section>

	<section data-page-chapter="workspace" class="workspace-section">
		<div class="max-w-6xl mx-auto workspace-inner space-y-8">
			<noscript>
				<p class="noscript-note">
					This experiment needs JavaScript to record and compare your two attempts.
				</p>
			</noscript>
			<header class="workspace-heading">
				<p class="eyebrow">Step {experimentStep} of 3</p>
				<h2>
					{experimentStep === 1
						? 'Try the task with tool calls'
						: experimentStep === 2
							? 'Try the same task with code'
							: 'Review what changed'}
				</h2>
				<p>Draft an answer and choose where your attention was before completing each mode.</p>
			</header>

			<!-- Context -->
			<details class="content-card p-6">
				<summary>Terms used in this experiment</summary>
				<div class="context-content grid md:grid-cols-2 gap-4 mt-4">
					<div class="mode-card mode-ready-to-hand">
						<h3 class="mode-title">Ready-to-hand (Zuhandenheit)</h3>
						<p class="mode-description">
							The tool recedes. Your attention stays on the task you are completing.
						</p>
					</div>
					<div class="mode-card mode-present-at-hand">
						<h3 class="mode-title">Present-at-hand (Vorhandenheit)</h3>
						<p class="mode-description">
							The tool demands attention. You stop to think about how it works.
						</p>
					</div>
				</div>
			</details>

			<!-- Task Description -->
			<div class="task-card p-6">
				<div class="flex items-center justify-between mb-4">
					<h2 class="section-title">Task {currentTask + 1} of {tasks.length}</h2>
					<span class="task-badge">EXPERIMENT</span>
				</div>
				<p class="task-description">{currentTaskData.description}</p>
				<p class="task-hint">{currentTaskData.hint}</p>
			</div>

			<!-- Side-by-Side Comparison -->
			<div class="comparison-workspace grid lg:grid-cols-2 gap-6">
				<!-- Tool Calling Mode -->
				<div class="editor-card">
					<div class="editor-header">
						<h3 class="editor-title">Step 1 · Tool calling</h3>
						<span class="mode-label mode-label-vorhanden">Tool may stay visible</span>
					</div>

					<div class="editor-description">
						<p class="body-copy-sm">
							Write the tool invocations needed to complete the task. Use XML-like syntax:
						</p>
						<pre class="example-code">{`<invoke name="Read">
  <parameter name="file_path">...</parameter>
</invoke>`}</pre>
					</div>

					<div class="editor-controls">
						{#if !toolCallStartTime}
							<button onclick={startToolCall} class="start-button"> Start Tool Calling </button>
						{:else if toolCallStartTime && !toolCallEndTime}
							<div class="space-y-4">
								<textarea
									bind:value={toolCallAnswer}
									placeholder="Write your tool invocations here..."
									class="code-textarea"
									rows="12"
								></textarea>

								<!-- Attention Tracker -->
								<div class="attention-tracker">
									<p class="caption-text mb-2">Where is your attention right now?</p>
									<div class="flex gap-2">
										<button
											onclick={() => recordAttention('tool', 'task')}
											class="attention-button"
											class:active={toolCallAttention === 'task'}
											aria-pressed={toolCallAttention === 'task'}
										>
											On the task
										</button>
										<button
											onclick={() => recordAttention('tool', 'tool')}
											class="attention-button"
											class:active={toolCallAttention === 'tool'}
											aria-pressed={toolCallAttention === 'tool'}
										>
											On the tools
										</button>
									</div>
								</div>

								<button
									onclick={completeToolCall}
									disabled={!toolCallAnswer.trim() || !toolCallAttention}
									class="complete-button"
								>
									Save step 1
								</button>
							</div>
						{:else}
							<div class="completed-state">
								<div class="completion-time">
									Completed in <span class="time-value">{toolCallDuration}ms</span>
								</div>
								<div class="attention-result">
									Attention was on: <span class="attention-value"
										>{toolCallAttention === 'task' ? 'the task' : 'the tools'}</span
									>
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Code Mode -->
				<div class="editor-card">
					<div class="editor-header">
						<h3 class="editor-title">Step 2 · Familiar code</h3>
						<span class="mode-label mode-label-zuhanden">Tool may recede</span>
					</div>

					<div class="editor-description">
						<p class="body-copy-sm">Write familiar code using standard library patterns:</p>
						<pre class="example-code">{`const content = await fs.readFile(...);
const result = content.filter(...);`}</pre>
					</div>

					<div class="editor-controls">
						{#if !codeStartTime}
							<button
								onclick={startCodeMode}
								disabled={!toolCallEndTime}
								class="start-button"
								class:disabled={!toolCallEndTime}
							>
								{toolCallEndTime ? 'Start Code Mode' : 'Complete Tool Calling First'}
							</button>
						{:else if codeStartTime && !codeEndTime}
							<div class="space-y-4">
								<textarea
									bind:value={codeAnswer}
									placeholder="Write your code here..."
									class="code-textarea"
									rows="12"
								></textarea>

								<!-- Attention Tracker -->
								<div class="attention-tracker">
									<p class="caption-text mb-2">Where is your attention right now?</p>
									<div class="flex gap-2">
										<button
											onclick={() => recordAttention('code', 'task')}
											class="attention-button"
											class:active={codeModeAttention === 'task'}
											aria-pressed={codeModeAttention === 'task'}
										>
											On the task
										</button>
										<button
											onclick={() => recordAttention('code', 'tool')}
											class="attention-button"
											class:active={codeModeAttention === 'tool'}
											aria-pressed={codeModeAttention === 'tool'}
										>
											On the tools
										</button>
									</div>
								</div>

								<button
									onclick={completeCodeMode}
									disabled={!codeAnswer.trim() || !codeModeAttention}
									class="complete-button"
								>
									Save step 2 and compare
								</button>
							</div>
						{:else}
							<div class="completed-state">
								<div class="completion-time">
									Completed in <span class="time-value">{codeDuration}ms</span>
								</div>
								<div class="attention-result">
									Attention was on: <span class="attention-value"
										>{codeModeAttention === 'task' ? 'the task' : 'the tools'}</span
									>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Results -->
			{#if completed}
				<div class="results-card p-6 space-y-6" aria-live="polite">
					<div class="result-heading">
						<p class="eyebrow">Step 3 of 3</p>
						<h2 class="section-title">Compare your result</h2>
						<p>Attention is the main evidence. Timing is context, not a quality score.</p>
					</div>

					<!-- Timing Comparison -->
					<div class="comparison-grid">
						<div class="metric-card">
							<div class="metric-label">Tool Calling Time</div>
							<div class="metric-value metric-value-warning">{toolCallDuration}ms</div>
						</div>
						<div class="metric-card">
							<div class="metric-label">Code Mode Time</div>
							<div class="metric-value metric-value-success">{codeDuration}ms</div>
						</div>
						<div class="metric-card">
							<div class="metric-label">Difference</div>
							<div
								class="metric-value"
								class:metric-value-success={toolCallDuration &&
									codeDuration &&
									codeDuration < toolCallDuration}
							>
								{toolCallDuration && codeDuration
									? `${Math.abs(codeDuration - toolCallDuration)}ms ${codeDuration < toolCallDuration ? 'faster' : 'slower'}`
									: '—'}
							</div>
						</div>
					</div>

					<!-- Attention Analysis -->
					<div class="attention-analysis">
						<h3 class="subsection-title">Attention Flow</h3>
						<div class="grid md:grid-cols-2 gap-4">
							<div class="attention-summary">
								<div class="attention-mode">Tool Calling:</div>
								<div class="attention-focus attention-focus-warning">
									{toolCallAttention === 'task' ? 'Task-focused' : 'Tool-focused'}
								</div>
							</div>
							<div class="attention-summary">
								<div class="attention-mode">Code Mode:</div>
								<div class="attention-focus attention-focus-success">
									{codeModeAttention === 'task' ? 'Task-focused' : 'Tool-focused'}
								</div>
							</div>
						</div>
					</div>

					<!-- Reflection Prompts -->
					<div class="reflection-section">
						<button onclick={() => (showReflection = !showReflection)} class="reflection-toggle">
							{showReflection ? 'Hide' : 'Show'} Reflection Prompts
						</button>

						{#if showReflection}
							<div class="reflection-content">
								<h3 class="subsection-title">Questions to Consider</h3>
								<ul class="reflection-list">
									<li>
										Did you have to stop and think about <em>how to invoke the tool</em> in Tool Calling
										mode?
									</li>
									<li>
										In Code Mode, did the file reading mechanism <em>disappear</em> into familiar patterns?
									</li>
									<li>
										Which mode made you think more about <em>what you're doing</em> vs.
										<em>how to do it</em>?
									</li>
									<li>
										Where did the tool become <em>transparent</em>? Where was it
										<em>conspicuous</em>?
									</li>
									<li>
										If you had to compose multiple operations (read, filter, transform), which mode
										would feel more natural?
									</li>
								</ul>

								<div class="heidegger-quote">
									<p class="quote-text">
										"The less we just stare at the hammer-Thing, and the more we seize hold of it
										and use it, the more primordial does our relationship to it become."
									</p>
									<p class="quote-attribution">— Heidegger, Being and Time</p>
								</div>
							</div>
						{/if}
					</div>

					<!-- Example Solutions -->
					<div class="examples-section">
						<h3 class="subsection-title">Example Solutions</h3>
						<div class="grid md:grid-cols-2 gap-4">
							<div class="example-box">
								<div class="example-label">Tool Calling Approach</div>
								<pre class="example-code-block">{toolCallExample}</pre>
							</div>
							<div class="example-box">
								<div class="example-label">Code Mode Approach</div>
								<pre class="example-code-block">{codeExample}</pre>
							</div>
						</div>
					</div>

					<!-- Actions -->
					<div class="actions-row">
						<button onclick={reset} class="action-button action-button-secondary">
							Try Again
						</button>
						{#if currentTask < tasks.length - 1}
							<button onclick={nextTask} class="action-button action-button-primary">
								Next Task →
							</button>
						{/if}
					</div>

					<div class="paper-link-card p-6">
						<div
							class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
						>
							<div class="space-y-2">
								<h3 class="paper-link-title">Continue with the explanation</h3>
								<p class="paper-link-description">
									The full paper explains why tool transparency matters for AI tool design.
								</p>
							</div>
							<a
								href="https://createsomething.io/papers/code-mode-hermeneutic-analysis"
								target="_blank"
								rel="noopener noreferrer"
								class="paper-cta"
							>
								Read the full paper →
							</a>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</section>
</main>

<style>
	.experiment-page,
	.opening-inner,
	.workspace-inner,
	.comparison-workspace,
	.editor-card,
	.results-card,
	.example-box {
		min-width: 0;
		max-width: 100%;
	}

	.tool-opening {
		padding: clamp(6rem, 12vw, 9rem) var(--space-performance-md) clamp(2.5rem, 6vw, 4.5rem);
	}

	.opening-inner {
		display: grid;
		gap: var(--space-performance-md);
	}

	.eyebrow {
		margin: 0;
		color: var(--color-performance-fg-muted);
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-caption);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.tool-opening h1 {
		max-width: 15ch;
		margin: 0;
		color: var(--color-performance-fg-primary);
		font-size: clamp(2.5rem, 7vw, var(--text-performance-h1));
		font-weight: 700;
		line-height: 1;
	}

	.opening-copy {
		max-width: 44rem;
		margin: 0;
		color: var(--color-performance-fg-secondary);
		font-size: var(--text-performance-body-lg);
		line-height: 1.6;
	}

	.opening-steps {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-performance-sm) var(--space-performance-lg);
		margin: 0;
		padding: 0;
		color: var(--color-performance-fg-tertiary);
		font-size: var(--text-performance-body-sm);
		list-style: none;
	}

	.opening-steps li {
		display: flex;
		align-items: center;
		gap: var(--space-performance-xs);
	}

	.opening-steps span {
		display: grid;
		width: 1.75rem;
		height: 1.75rem;
		place-items: center;
		border: 1px solid var(--color-performance-border-emphasis);
		border-radius: var(--radius-performance-scale-full);
		font-family: var(--font-performance-mono);
	}

	.workspace-section {
		padding: clamp(2rem, 5vw, 4rem) var(--space-performance-md) clamp(4rem, 8vw, 7rem);
		border-top: 1px solid var(--color-performance-border-default);
	}

	.noscript-note {
		margin: 0;
		padding: var(--space-performance-sm) var(--space-performance-md);
		background: var(--color-performance-warning-muted);
		border-radius: var(--radius-performance-scale-md);
		color: var(--color-performance-fg-secondary);
	}

	.workspace-heading,
	.result-heading {
		display: grid;
		gap: var(--space-performance-xs);
	}

	.workspace-heading h2,
	.workspace-heading p,
	.result-heading h2,
	.result-heading p {
		margin: 0;
	}

	.workspace-heading h2 {
		max-width: 24ch;
		color: var(--color-performance-fg-primary);
		font-size: var(--text-performance-h2);
	}

	.workspace-heading > p:last-child,
	.result-heading > p:last-child {
		color: var(--color-performance-fg-secondary);
	}

	/* Cards */
	.content-card {
		background: var(--color-performance-hover);
		border-radius: var(--radius-performance-scale-xl);
	}

	.content-card summary {
		cursor: pointer;
		color: var(--color-performance-fg-primary);
		font-weight: 600;
	}

	.task-card {
		background: var(--color-performance-info-muted);
		border: 1px solid var(--color-performance-info-border);
		border-radius: var(--radius-performance-scale-xl);
	}

	.editor-card {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-xl);
		padding: var(--space-performance-md);
	}

	.results-card {
		background: var(--color-performance-hover);
		border: 1px solid var(--color-performance-border-emphasis);
		border-radius: var(--radius-performance-scale-xl);
	}

	.paper-link-card {
		background: var(--color-performance-bg-surface);
		border: 1px solid var(--color-performance-border-emphasis);
		border-radius: var(--radius-performance-scale-xl);
	}

	/* Typography */
	.section-title {
		font-size: var(--text-performance-h2);
		font-weight: 700;
		color: var(--color-performance-fg-primary);
	}

	.subsection-title {
		font-size: var(--text-performance-h3);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
	}

	.body-copy-sm {
		color: var(--color-performance-fg-secondary);
		font-size: var(--text-performance-body-sm);
	}

	.caption-text {
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-body-sm);
	}

	/* Mode Cards */
	.mode-card {
		padding: var(--space-performance-md);
		border-radius: var(--radius-performance-scale-lg);
		border: 1px solid;
	}

	.mode-ready-to-hand {
		background: var(--color-performance-success-muted);
		border-color: var(--color-performance-success-border);
	}

	.mode-present-at-hand {
		background: var(--color-performance-warning-muted);
		border-color: var(--color-performance-warning-border);
	}

	.mode-title {
		font-size: var(--text-performance-body-lg);
		font-weight: 600;
		margin-bottom: var(--space-performance-sm);
	}

	.mode-ready-to-hand .mode-title {
		color: var(--color-performance-success);
	}

	.mode-present-at-hand .mode-title {
		color: var(--color-performance-warning);
	}

	.mode-description {
		color: var(--color-performance-fg-secondary);
		font-size: var(--text-performance-body-sm);
	}

	/* Task */
	.task-badge {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-info);
		background: var(--color-performance-info-muted);
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-performance-scale-sm);
	}

	.task-description {
		font-size: var(--text-performance-body-lg);
		color: var(--color-performance-fg-primary);
		font-weight: 500;
		margin-bottom: var(--space-performance-sm);
	}

	.task-hint {
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-body-sm);
		font-style: italic;
	}

	/* Editor */
	.editor-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-performance-md);
		padding-bottom: var(--space-performance-sm);
	}

	.editor-title {
		font-size: var(--text-performance-h3);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
	}

	.mode-label {
		font-size: var(--text-performance-caption);
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-performance-scale-sm);
		font-weight: 500;
	}

	.mode-label-vorhanden {
		background: var(--color-performance-warning-muted);
		color: var(--color-performance-warning);
	}

	.mode-label-zuhanden {
		background: var(--color-performance-success-muted);
		color: var(--color-performance-success);
	}

	.editor-description {
		margin-bottom: var(--space-performance-md);
	}

	.example-code {
		width: 100%;
		max-width: 100%;
		background: var(--color-performance-bg-pure);
		color: var(--color-performance-fg-tertiary);
		padding: var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-body-sm);
		font-family: 'IBM Plex Mono', 'Courier New', monospace;
		margin-top: var(--space-performance-sm);
		overflow-x: auto;
	}

	.editor-controls {
		margin-top: var(--space-performance-md);
	}

	/* Buttons */
	.start-button {
		width: 100%;
		padding: var(--space-performance-sm) var(--space-performance-md);
		background: var(--color-performance-fg-primary);
		color: var(--color-performance-bg-pure);
		border: none;
		border-radius: var(--radius-performance-scale-md);
		font-weight: 500;
		cursor: pointer;
		transition: opacity var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.start-button:hover:not(:disabled) {
		opacity: 0.9;
	}

	.start-button:disabled,
	.complete-button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.complete-button {
		width: 100%;
		padding: var(--space-performance-sm) var(--space-performance-md);
		background: var(--color-performance-success-muted);
		color: var(--color-performance-success);
		border: 1px solid var(--color-performance-success-border);
		border-radius: var(--radius-performance-scale-md);
		font-weight: 500;
		cursor: pointer;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.complete-button:hover:not(:disabled) {
		background: var(--color-performance-success-border);
	}

	/* Code Textarea */
	.code-textarea {
		width: 100%;
		padding: var(--space-performance-sm);
		background: var(--color-performance-bg-pure);
		border-radius: var(--radius-performance-scale-md);
		color: var(--color-performance-fg-primary);
		font-family: 'IBM Plex Mono', 'Courier New', monospace;
		font-size: var(--text-performance-body-sm);
		resize: vertical;
	}

	.code-textarea::placeholder {
		color: var(--color-performance-fg-subtle);
	}

	.code-textarea:focus {
		outline: none;
		border-color: var(--color-performance-border-emphasis);
	}

	/* Attention Tracker */
	.attention-tracker {
		padding: var(--space-performance-sm);
		background: var(--color-performance-bg-pure);
		border-radius: var(--radius-performance-scale-md);
	}

	.attention-button {
		padding: 0.5rem 1rem;
		background: var(--color-performance-hover);
		color: var(--color-performance-fg-secondary);
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-body-sm);
		cursor: pointer;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.attention-button:hover {
		border-color: var(--color-performance-border-emphasis);
	}

	.attention-button.active {
		background: var(--color-performance-info-muted);
		border-color: var(--color-performance-info-border);
		color: var(--color-performance-info);
	}

	/* Completed State */
	.completed-state {
		padding: var(--space-performance-md);
		background: var(--color-performance-bg-pure);
		border-radius: var(--radius-performance-scale-md);
		text-align: center;
	}

	.completion-time {
		font-size: var(--text-performance-body-lg);
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-sm);
	}

	.time-value {
		font-weight: 700;
		color: var(--color-performance-info);
	}

	.attention-result {
		color: var(--color-performance-fg-secondary);
		font-size: var(--text-performance-body-sm);
	}

	.attention-value {
		font-weight: 600;
		color: var(--color-performance-fg-primary);
	}

	/* Results */
	.comparison-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-performance-md);
	}

	.metric-card {
		padding: var(--space-performance-md);
		background: var(--color-performance-bg-pure);
		border-radius: var(--radius-performance-scale-md);
		text-align: center;
	}

	.metric-label {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		margin-bottom: var(--space-performance-xs);
	}

	.metric-value {
		font-size: var(--text-performance-h2);
		font-weight: 700;
		color: var(--color-performance-fg-primary);
	}

	.metric-value-success {
		color: var(--color-performance-success);
	}

	.metric-value-warning {
		color: var(--color-performance-warning);
	}

	/* Attention Analysis */
	.attention-analysis {
		padding: var(--space-performance-md);
		background: var(--color-performance-bg-pure);
		border-radius: var(--radius-performance-scale-md);
	}

	.attention-summary {
		padding: var(--space-performance-sm);
		background: var(--color-performance-hover);
		border-radius: var(--radius-performance-scale-sm);
	}

	.attention-mode {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		margin-bottom: 0.25rem;
	}

	.attention-focus {
		font-weight: 600;
	}

	.attention-focus-success {
		color: var(--color-performance-success);
	}

	.attention-focus-warning {
		color: var(--color-performance-warning);
	}

	/* Reflection */
	.reflection-section {
		padding: var(--space-performance-md);
		background: var(--color-performance-bg-pure);
		border-radius: var(--radius-performance-scale-md);
	}

	.reflection-toggle {
		padding: var(--space-performance-sm) var(--space-performance-md);
		background: var(--color-performance-hover);
		border-radius: var(--radius-performance-scale-md);
		color: var(--color-performance-fg-primary);
		cursor: pointer;
		font-weight: 500;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.reflection-toggle:hover {
		border-color: var(--color-performance-border-emphasis);
	}

	.reflection-content {
		margin-top: var(--space-performance-md);
		padding-top: var(--space-performance-md);
	}

	.reflection-list {
		list-style: disc;
		padding-left: var(--space-performance-lg);
		color: var(--color-performance-fg-secondary);
		font-size: var(--text-performance-body-sm);
	}

	.reflection-list li {
		margin-bottom: var(--space-performance-sm);
	}

	.heidegger-quote {
		margin-top: var(--space-performance-lg);
		padding: var(--space-performance-md);
		background: var(--color-performance-hover);
		border-left: 4px solid var(--color-performance-border-emphasis);
		border-radius: var(--radius-performance-scale-sm);
	}

	.quote-text {
		font-style: italic;
		color: var(--color-performance-fg-secondary);
		margin-bottom: var(--space-performance-sm);
	}

	.quote-attribution {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
	}

	/* Examples */
	.examples-section {
		padding: var(--space-performance-md);
		background: var(--color-performance-bg-pure);
		border-radius: var(--radius-performance-scale-md);
	}

	.example-box {
		background: var(--color-performance-hover);
		padding: var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-md);
	}

	.example-label {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		margin-bottom: var(--space-performance-xs);
	}

	.example-code-block {
		width: 100%;
		max-width: 100%;
		background: var(--color-performance-bg-pure);
		color: var(--color-performance-fg-secondary);
		padding: var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-body-sm);
		font-family: 'IBM Plex Mono', 'Courier New', monospace;
		overflow-x: auto;
	}

	/* Actions */
	.actions-row {
		display: flex;
		gap: var(--space-performance-sm);
		justify-content: flex-end;
	}

	.action-button {
		padding: var(--space-performance-sm) var(--space-performance-lg);
		border-radius: var(--radius-performance-scale-md);
		font-weight: 500;
		cursor: pointer;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.action-button-primary {
		background: var(--color-performance-fg-primary);
		color: var(--color-performance-bg-pure);
		border: none;
	}

	.action-button-primary:hover {
		opacity: 0.9;
	}

	.action-button-secondary {
		background: var(--color-performance-hover);
		color: var(--color-performance-fg-primary);
	}

	.action-button-secondary:hover {
		border-color: var(--color-performance-border-emphasis);
	}

	/* Paper Link */
	.paper-link-title {
		font-size: var(--text-performance-h3);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
	}

	.paper-link-description {
		color: var(--color-performance-fg-secondary);
		font-size: var(--text-performance-body-sm);
	}

	.paper-cta {
		padding: var(--space-performance-sm) var(--space-performance-lg);
		background: var(--color-performance-info-muted);
		color: var(--color-performance-info);
		border: 1px solid var(--color-performance-info-border);
		border-radius: var(--radius-performance-scale-md);
		font-weight: 500;
		text-decoration: none;
		white-space: nowrap;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.paper-cta:hover {
		background: var(--color-performance-info-border);
	}

	@media (max-width: 640px) {
		.opening-steps {
			display: grid;
		}

		.editor-header,
		.actions-row {
			align-items: stretch;
			flex-direction: column;
		}

		.mode-label {
			align-self: flex-start;
		}

		.action-button,
		.paper-cta {
			width: 100%;
			text-align: center;
		}
	}
</style>
