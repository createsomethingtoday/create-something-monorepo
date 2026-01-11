<script lang="ts">
	/**
	 * Code Mode: The Zuhandenheit Experiment
	 *
	 * Experience Heidegger's tool-transparency distinction firsthand.
	 * Which mode lets the tool recede? Which forces tool-attention?
	 */

	import { onMount } from 'svelte';

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
		if (toolCallStartTime) {
			toolCallEndTime = Date.now();
		}
	}

	function startCodeMode() {
		codeStartTime = Date.now();
		codeEndTime = null;
	}

	function completeCodeMode() {
		if (codeStartTime) {
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

<svelte:head>
	<title>Code Mode: The Zuhandenheit Experiment | CREATE SOMETHING SPACE</title>
	<meta name="description" content="Experience Heidegger's tool-transparency distinction. Which mode lets tools recede into use?" />
</svelte:head>

<!-- ASCII Art Hero -->
<section class="relative pt-24 pb-8 px-6">
	<div class="max-w-6xl mx-auto">
		<div class="ascii-container overflow-hidden">
			<div class="aspect-[21/9] flex items-center justify-center p-8">
				<pre class="ascii-art select-none">{`
    +-------------------------------------------------+
    |   CODE MODE: THE ZUHANDENHEIT EXPERIMENT        |
    |                                                 |
    |   Tool Calling          Code Mode               |
    |   (Vorhandenheit)       (Zuhandenheit)          |
    |                                                 |
    |   <invoke...>           const x = await ...     |
    |     Attention           Attention               |
    |     ↓                   ↓                       |
    |   [THE TOOL]            [THE TASK]              |
    |                                                 |
    |   Where does your attention go?                 |
    +-------------------------------------------------+
`}</pre>
			</div>
		</div>
	</div>
</section>

<!-- Hero -->
<section class="relative pb-12 px-6">
	<div class="max-w-6xl mx-auto text-center space-y-4">
		<h1 class="hero-title">Code Mode</h1>
		<p class="hero-subtitle italic">Try this: The Zuhandenheit Experiment</p>
		<p class="hero-description max-w-3xl mx-auto">
			Complete the same task twice—once with tool calling, once with familiar code. Notice where your attention goes. That's the point of this experiment.
		</p>
	</div>
</section>

<!-- The Experiment -->
<section class="px-6 pb-16">
	<div class="max-w-6xl mx-auto space-y-8">
		<!-- Context -->
		<div class="content-card p-6 space-y-4">
			<h2 class="section-title">What to watch for</h2>
			<p class="body-text leading-relaxed">
				There are two modes of using tools. You'll feel both in this experiment:
			</p>
			<div class="grid md:grid-cols-2 gap-4 mt-4">
				<div class="mode-card mode-ready-to-hand">
					<h3 class="mode-title">Ready-to-hand (Zuhandenheit)</h3>
					<p class="mode-description">
						The hammer disappears when hammering. You think about the nail, not the tool. This is what you're aiming for.
					</p>
				</div>
				<div class="mode-card mode-present-at-hand">
					<h3 class="mode-title">Present-at-hand (Vorhandenheit)</h3>
					<p class="mode-description">
						You stop to think about the tool itself—how to hold it, how it works. The tool demands attention instead of receding.
					</p>
				</div>
			</div>
		</div>

		<!-- Task Description -->
		<div class="task-card p-6">
			<div class="flex items-center justify-between mb-4">
				<h2 class="section-title">Your Task (#{currentTask + 1} of {tasks.length})</h2>
				<span class="task-badge">EXPERIMENT</span>
			</div>
			<p class="task-description">{currentTaskData.description}</p>
			<p class="task-hint">{currentTaskData.hint}</p>
		</div>

		<!-- Side-by-Side Comparison -->
		<div class="grid lg:grid-cols-2 gap-6">
			<!-- Tool Calling Mode -->
			<div class="editor-card">
				<div class="editor-header">
					<h3 class="editor-title">Tool Calling Mode</h3>
					<span class="mode-label mode-label-vorhanden">Vorhandenheit</span>
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
									>
										On the task
									</button>
									<button
										onclick={() => recordAttention('tool', 'tool')}
										class="attention-button"
										class:active={toolCallAttention === 'tool'}
									>
										On the tools
									</button>
								</div>
							</div>

							<button onclick={completeToolCall} class="complete-button">
								Complete Tool Calling
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
					<h3 class="editor-title">Code Mode</h3>
					<span class="mode-label mode-label-zuhanden">Zuhandenheit</span>
				</div>

				<div class="editor-description">
					<p class="body-copy-sm">
						Write familiar code using standard library patterns:
					</p>
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
									>
										On the task
									</button>
									<button
										onclick={() => recordAttention('code', 'tool')}
										class="attention-button"
										class:active={codeModeAttention === 'tool'}
									>
										On the tools
									</button>
								</div>
							</div>

							<button onclick={completeCodeMode} class="complete-button"> Complete Code Mode </button>
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
			<div class="results-card p-6 space-y-6">
				<h2 class="section-title">Results: What Did You Notice?</h2>

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
							class:metric-value-success={toolCallDuration && codeDuration && codeDuration < toolCallDuration}
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
								{toolCallAttention === 'task'
									? 'Task-focused (rare!)'
									: 'Tool-focused (typical Vorhandenheit)'}
							</div>
						</div>
						<div class="attention-summary">
							<div class="attention-mode">Code Mode:</div>
							<div class="attention-focus attention-focus-success">
								{codeModeAttention === 'task'
									? 'Task-focused (Zuhandenheit achieved!)'
									: 'Tool-focused (still learning the pattern)'}
							</div>
						</div>
					</div>
				</div>

				<!-- Reflection Prompts -->
				<div class="reflection-section">
					<button
						onclick={() => (showReflection = !showReflection)}
						class="reflection-toggle"
					>
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
									In Code Mode, did the file reading mechanism <em>disappear</em> into familiar
									patterns?
								</li>
								<li>
									Which mode made you think more about <em>what you're doing</em> vs.
									<em>how to do it</em>?
								</li>
								<li>Where did the tool become <em>transparent</em>? Where was it <em>conspicuous</em>?</li>
								<li>
									If you had to compose multiple operations (read, filter, transform), which mode would
									feel more natural?
								</li>
							</ul>

							<div class="heidegger-quote">
								<p class="quote-text">
									"The less we just stare at the hammer-Thing, and the more we seize hold of it and
									use it, the more primordial does our relationship to it become."
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
					<button onclick={reset} class="action-button action-button-secondary"> Try Again </button>
					{#if currentTask < tasks.length - 1}
						<button onclick={nextTask} class="action-button action-button-primary">
							Next Task →
						</button>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Paper Link -->
		<div class="paper-link-card p-6">
			<div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
				<div class="space-y-2">
					<h3 class="paper-link-title">Want the deeper explanation?</h3>
					<p class="paper-link-description">
						The philosophical framework behind this experiment is documented in the full paper—including why this matters for AI tool design.
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
</section>

<style>
	/* ASCII Container */
	.ascii-container {
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.ascii-art {
		color: var(--color-fg-secondary);
		font-size: clamp(0.6rem, 1.5vw, 0.9rem);
		font-family: 'IBM Plex Mono', 'Courier New', monospace;
		line-height: 1.3;
	}

	/* Hero */
	.hero-title {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.hero-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.hero-description {
		color: var(--color-fg-muted);
	}

	/* Cards */
	.content-card {
		background: var(--color-hover);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
	}

	.task-card {
		background: var(--color-info-muted);
		border: 1px solid var(--color-info-border);
		border-radius: var(--radius-xl);
	}

	.editor-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
		padding: var(--space-md);
	}

	.results-card {
		background: var(--color-hover);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-xl);
	}

	.paper-link-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-xl);
	}

	/* Typography */
	.section-title {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.subsection-title {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.body-text {
		color: var(--color-fg-secondary);
	}

	.body-copy-sm {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
	}

	.caption-text {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	/* Mode Cards */
	.mode-card {
		padding: var(--space-md);
		border-radius: var(--radius-lg);
		border: 1px solid;
	}

	.mode-ready-to-hand {
		background: var(--color-success-muted);
		border-color: var(--color-success-border);
	}

	.mode-present-at-hand {
		background: var(--color-warning-muted);
		border-color: var(--color-warning-border);
	}

	.mode-title {
		font-size: var(--text-body-lg);
		font-weight: 600;
		margin-bottom: var(--space-sm);
	}

	.mode-ready-to-hand .mode-title {
		color: var(--color-success);
	}

	.mode-present-at-hand .mode-title {
		color: var(--color-warning);
	}

	.mode-description {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
	}

	/* Task */
	.task-badge {
		font-size: var(--text-caption);
		color: var(--color-info);
		background: var(--color-info-muted);
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
	}

	.task-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-primary);
		font-weight: 500;
		margin-bottom: var(--space-sm);
	}

	.task-hint {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		font-style: italic;
	}

	/* Editor */
	.editor-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-md);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}

	.editor-title {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.mode-label {
		font-size: var(--text-caption);
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		font-weight: 500;
	}

	.mode-label-vorhanden {
		background: var(--color-warning-muted);
		color: var(--color-warning);
	}

	.mode-label-zuhanden {
		background: var(--color-success-muted);
		color: var(--color-success);
	}

	.editor-description {
		margin-bottom: var(--space-md);
	}

	.example-code {
		background: var(--color-bg-pure);
		color: var(--color-fg-tertiary);
		padding: var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
		font-family: 'IBM Plex Mono', 'Courier New', monospace;
		margin-top: var(--space-sm);
		overflow-x: auto;
	}

	.editor-controls {
		margin-top: var(--space-md);
	}

	/* Buttons */
	.start-button {
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
		border-radius: var(--radius-md);
		font-weight: 500;
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.start-button:hover:not(.disabled) {
		opacity: 0.9;
	}

	.start-button.disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.complete-button {
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-success-muted);
		color: var(--color-success);
		border: 1px solid var(--color-success-border);
		border-radius: var(--radius-md);
		font-weight: 500;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.complete-button:hover {
		background: var(--color-success-border);
	}

	/* Code Textarea */
	.code-textarea {
		width: 100%;
		padding: var(--space-sm);
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-family: 'IBM Plex Mono', 'Courier New', monospace;
		font-size: var(--text-body-sm);
		resize: vertical;
	}

	.code-textarea::placeholder {
		color: var(--color-fg-subtle);
	}

	.code-textarea:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
	}

	/* Attention Tracker */
	.attention-tracker {
		padding: var(--space-sm);
		background: var(--color-bg-pure);
		border-radius: var(--radius-md);
	}

	.attention-button {
		padding: 0.5rem 1rem;
		background: var(--color-hover);
		color: var(--color-fg-secondary);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.attention-button:hover {
		border-color: var(--color-border-emphasis);
	}

	.attention-button.active {
		background: var(--color-info-muted);
		border-color: var(--color-info-border);
		color: var(--color-info);
	}

	/* Completed State */
	.completed-state {
		padding: var(--space-md);
		background: var(--color-bg-pure);
		border-radius: var(--radius-md);
		text-align: center;
	}

	.completion-time {
		font-size: var(--text-body-lg);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.time-value {
		font-weight: 700;
		color: var(--color-info);
	}

	.attention-result {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
	}

	.attention-value {
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	/* Results */
	.comparison-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	.metric-card {
		padding: var(--space-md);
		background: var(--color-bg-pure);
		border-radius: var(--radius-md);
		text-align: center;
	}

	.metric-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
	}

	.metric-value {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.metric-value-success {
		color: var(--color-success);
	}

	.metric-value-warning {
		color: var(--color-warning);
	}

	/* Attention Analysis */
	.attention-analysis {
		padding: var(--space-md);
		background: var(--color-bg-pure);
		border-radius: var(--radius-md);
	}

	.attention-summary {
		padding: var(--space-sm);
		background: var(--color-hover);
		border-radius: var(--radius-sm);
	}

	.attention-mode {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: 0.25rem;
	}

	.attention-focus {
		font-weight: 600;
	}

	.attention-focus-success {
		color: var(--color-success);
	}

	.attention-focus-warning {
		color: var(--color-warning);
	}

	/* Reflection */
	.reflection-section {
		padding: var(--space-md);
		background: var(--color-bg-pure);
		border-radius: var(--radius-md);
	}

	.reflection-toggle {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-hover);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		cursor: pointer;
		font-weight: 500;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.reflection-toggle:hover {
		border-color: var(--color-border-emphasis);
	}

	.reflection-content {
		margin-top: var(--space-md);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.reflection-list {
		list-style: disc;
		padding-left: var(--space-lg);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
	}

	.reflection-list li {
		margin-bottom: var(--space-sm);
	}

	.heidegger-quote {
		margin-top: var(--space-lg);
		padding: var(--space-md);
		background: var(--color-hover);
		border-left: 4px solid var(--color-border-emphasis);
		border-radius: var(--radius-sm);
	}

	.quote-text {
		font-style: italic;
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
	}

	.quote-attribution {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Examples */
	.examples-section {
		padding: var(--space-md);
		background: var(--color-bg-pure);
		border-radius: var(--radius-md);
	}

	.example-box {
		background: var(--color-hover);
		padding: var(--space-sm);
		border-radius: var(--radius-md);
	}

	.example-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
	}

	.example-code-block {
		background: var(--color-bg-pure);
		color: var(--color-fg-secondary);
		padding: var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
		font-family: 'IBM Plex Mono', 'Courier New', monospace;
		overflow-x: auto;
	}

	/* Actions */
	.actions-row {
		display: flex;
		gap: var(--space-sm);
		justify-content: flex-end;
	}

	.action-button {
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--radius-md);
		font-weight: 500;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.action-button-primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
	}

	.action-button-primary:hover {
		opacity: 0.9;
	}

	.action-button-secondary {
		background: var(--color-hover);
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-default);
	}

	.action-button-secondary:hover {
		border-color: var(--color-border-emphasis);
	}

	/* Paper Link */
	.paper-link-title {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.paper-link-description {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
	}

	.paper-cta {
		padding: var(--space-sm) var(--space-lg);
		background: var(--color-info-muted);
		color: var(--color-info);
		border: 1px solid var(--color-info-border);
		border-radius: var(--radius-md);
		font-weight: 500;
		text-decoration: none;
		white-space: nowrap;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.paper-cta:hover {
		background: var(--color-info-border);
	}
</style>
