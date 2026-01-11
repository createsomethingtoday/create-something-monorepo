<script lang="ts">
	/**
	 * Motion Ontology Experiment
	 *
	 * Die Frage nach dem Sein der Animation
	 * (The Question of the Being of Animation)
	 *
	 * Analyze UI motion through Heidegger's phenomenological framework.
	 */

	import type { PageData } from './$types';
	import type {
		TriggerType,
		MotionAnalysisResult,
		OntologicalMode,
		MotionJudgment
	} from '$lib/motion-analysis';

	let { data }: { data: PageData } = $props();

	// Experiment tracking
	const PAPER_ID = 'file-motion-ontology';
	const sessionId = crypto.randomUUID();

	async function trackExperiment(action: 'start' | 'complete' | 'error', extra?: Record<string, unknown>) {
		try {
			await fetch('/api/experiments/track', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action,
					paper_id: PAPER_ID,
					session_id: sessionId,
					...extra
				})
			});
		} catch {
			// Silent fail - tracking shouldn't break the experiment
		}
	}

	// Form state
	let url = $state('');
	let triggerType: TriggerType = $state('load');
	let triggerSelector = $state('');
	let isAnalyzing = $state(false);
	let error = $state<string | null>(null);

	// Results state
	let result = $state<MotionAnalysisResult | null>(null);

	// Trigger options
	const triggerOptions: { value: TriggerType; label: string; needsSelector: boolean }[] = [
		{ value: 'load', label: 'On Page Load', needsSelector: false },
		{ value: 'click', label: 'On Click', needsSelector: true },
		{ value: 'hover', label: 'On Hover', needsSelector: true },
		{ value: 'scroll', label: 'On Scroll', needsSelector: false },
		{ value: 'focus', label: 'On Focus', needsSelector: true }
	];

	const needsSelector = $derived(
		triggerOptions.find((t) => t.value === triggerType)?.needsSelector ?? false
	);

	// Mode styling
	function getModeClass(mode: OntologicalMode): string {
		return mode === 'zuhandenheit' ? 'mode-zuhandenheit' : 'mode-vorhandenheit';
	}

	function getModeLabel(mode: OntologicalMode): string {
		return mode === 'zuhandenheit' ? 'Ready-to-hand (recedes)' : 'Present-at-hand (obstructs)';
	}

	// Judgment styling
	function getJudgmentClass(judgment: MotionJudgment): string {
		switch (judgment) {
			case 'functional':
				return 'judgment-functional';
			case 'decorative':
				return 'judgment-decorative';
			case 'ambiguous':
				return 'judgment-ambiguous';
		}
	}

	// Analysis function
	async function analyzeMotion() {
		if (!url) {
			error = 'Please enter a URL';
			return;
		}

		try {
			new URL(url);
		} catch {
			error = 'Please enter a valid URL';
			return;
		}

		isAnalyzing = true;
		error = null;
		result = null;

		// Track experiment start
		await trackExperiment('start');

		try {
			const response = await fetch('/api/motion/analyze', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					url,
					trigger: {
						type: triggerType,
						selector: needsSelector ? triggerSelector : undefined
					}
				})
			});

			const data = (await response.json()) as MotionAnalysisResult & {
				success: boolean;
				error?: string;
			};

			if (!data.success) {
				error = data.error || 'Analysis failed';
				await trackExperiment('error', { error_message: error });
				return;
			}

			result = data;

			// Track successful completion
			await trackExperiment('complete', {
				metrics: {
					url,
					triggerType,
					judgment: data.phenomenological?.judgment,
					disclosure: data.phenomenological?.disclosure,
					animationsFound: data.technical?.animations?.length || 0,
					transitionsFound: data.technical?.transitions?.length || 0,
					duration: data.metadata?.duration
				}
			});
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error occurred';
			await trackExperiment('error', { error_message: error });
		} finally {
			isAnalyzing = false;
		}
	}
</script>

<svelte:head>
	<title>Motion Ontology | CREATE SOMETHING SPACE</title>
	<meta name="description" content="Analyze UI motion through Heidegger's phenomenological framework. Does motion disclose or decorate?" />
</svelte:head>

<!-- ASCII Art Hero -->
<section class="relative pt-24 pb-8 px-6">
	<div class="max-w-4xl mx-auto">
		<div class="ascii-container overflow-hidden">
			<div class="aspect-[21/9] flex items-center justify-center p-8">
				<pre class="ascii-art leading-[1.3] font-mono select-none">{`
    +-------------------------------------------------+
    |   MOTION ONTOLOGY                               |
    |                                                 |
    |   Zuhandenheit        Vorhandenheit             |
    |   (ready-to-hand)     (present-at-hand)         |
    |                                                 |
    |      [hover]              [inspect]             |
    |        |                      |                 |
    |        v                      v                 |
    |   Transparent           Analyzed                |
    |   engagement            breakdown               |
    |                                                 |
    |   The being of animation revealed               |
    +-------------------------------------------------+
`}</pre>
			</div>
		</div>
	</div>
</section>

<!-- Hero -->
<section class="relative pb-12 px-6">
	<div class="max-w-4xl mx-auto text-center space-y-4">
		<h1 class="hero-title">Motion Ontology</h1>
		<p class="hero-subtitle italic">
			Die Frage nach dem Sein der Animation
		</p>
		<p class="hero-description max-w-2xl mx-auto">
			Analyze UI motion through Heidegger's phenomenological framework. Does the animation serve
			<span class="highlight-text">disclosure</span> (revealing meaning) or mere
			<span class="highlight-text">decoration</span> (visual noise)?
		</p>
	</div>
</section>

<!-- Analysis Tool -->
<section class="px-6 pb-16">
	<div class="max-w-4xl mx-auto">
		<!-- Input Form -->
		<div class="form-card p-6 space-y-4">
			<div class="space-y-2">
				<label for="url" class="form-label block">URL to Analyze</label>
				<input
					id="url"
					type="url"
					bind:value={url}
					placeholder="https://example.com"
					class="form-input w-full px-4 py-3"
				/>
			</div>

			<div class="grid md:grid-cols-2 gap-4">
				<div class="space-y-2">
					<label for="trigger" class="form-label block">Trigger Event</label>
					<select
						id="trigger"
						bind:value={triggerType}
						class="form-select w-full px-4 py-3"
					>
						{#each triggerOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>

				{#if needsSelector}
					<div class="space-y-2">
						<label for="selector" class="form-label block"
							>CSS Selector</label
						>
						<input
							id="selector"
							type="text"
							bind:value={triggerSelector}
							placeholder="button, .btn, #submit"
							class="form-input w-full px-4 py-3"
						/>
					</div>
				{/if}
			</div>

			{#if error}
				<p class="error-text">{error}</p>
			{/if}

			<button
				onclick={analyzeMotion}
				disabled={isAnalyzing}
				class="submit-button w-full px-6 py-3 font-medium"
			>
				{isAnalyzing ? 'Analyzing...' : 'Analyze Motion'}
			</button>
		</div>

		<!-- Results -->
		{#if result}
			<div class="mt-8 space-y-6">
				<!-- Phenomenological Analysis -->
				<div class="result-card p-6 space-y-6">
					<div class="flex items-center justify-between">
						<h2 class="card-title">Phenomenological Analysis</h2>
						<span class="label-text">ALETHEIA</span>
					</div>

					<!-- Judgment Badge -->
					<div class="flex items-center gap-4">
						<span class="judgment-badge {getJudgmentClass(result.phenomenological.judgment)}">
							{result.phenomenological.judgment}
						</span>
						<span class="mode-label {getModeClass(result.phenomenological.mode)}">
							{getModeLabel(result.phenomenological.mode)}
						</span>
					</div>

					<!-- Disclosure -->
					<div class="space-y-2">
						<h3 class="section-label">Disclosure</h3>
						<p class="emphasis-text">
							<span class="highlight-text">{result.phenomenological.disclosure}:</span>
							{result.phenomenological.disclosureDescription}
						</p>
					</div>

					<!-- Mode Rationale -->
					<div class="space-y-2">
						<h3 class="section-label">
							Ontological Mode
						</h3>
						<p class="body-text-light">{result.phenomenological.modeRationale}</p>
					</div>

					<!-- Justification -->
					<div class="space-y-2">
						<h3 class="section-label">Justification</h3>
						<p class="body-text-light">{result.phenomenological.justification}</p>
					</div>

					<!-- Recommendation -->
					<div class="recommendation-box p-4 space-y-2">
						<h3 class="section-label">
							Recommendation
						</h3>
						<p class="emphasis-text">
							<span
								class="font-medium {result.phenomenological.recommendation.action === 'keep'
									? 'action-keep'
									: result.phenomenological.recommendation.action === 'remove'
										? 'action-remove'
										: 'action-modify'}"
							>
								{result.phenomenological.recommendation.action.toUpperCase()}
							</span>
							— {result.phenomenological.recommendation.reasoning}
						</p>
						{#if result.phenomenological.recommendation.modification}
							<p class="modification-text">
								Modification: {result.phenomenological.recommendation.modification}
							</p>
						{/if}
					</div>

					<!-- Confidence -->
					<div class="confidence-row flex items-center gap-2">
						<span>Confidence:</span>
						<div class="confidence-track flex-1 h-2 overflow-hidden">
							<div
								class="confidence-fill h-full"
								style="width: {result.phenomenological.confidence * 100}%"
							></div>
						</div>
						<span>{Math.round(result.phenomenological.confidence * 100)}%</span>
					</div>
				</div>

				<!-- Technical Analysis -->
				<div class="form-card p-6 space-y-4">
					<div class="flex items-center justify-between">
						<h2 class="card-title">Technical Analysis</h2>
						<div class="flex items-center gap-2">
							{#if result.technical.debug?.puppeteerUsed}
								<span class="puppeteer-badge">Puppeteer</span>
							{/if}
							<span class="label-text">SEIN</span>
						</div>
					</div>

					<!-- Puppeteer Debug Info -->
					{#if result.technical.debug?.puppeteerUsed}
						<div class="debug-box p-3 space-y-2">
							<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
								<div>
									<div class="metric-label">Element Found</div>
									<div class="metric-value-lg {result.technical.debug.elementFound ? 'status-success' : 'status-error'}">
										{result.technical.debug.elementFound ? 'Yes' : 'No'}
									</div>
								</div>
								<div>
									<div class="metric-label">Hover Triggered</div>
									<div class="metric-value-lg {result.technical.debug.realHoverTriggered ? 'status-success' : 'status-warning'}">
										{result.technical.debug.realHoverTriggered ? 'Yes' : 'No'}
									</div>
								</div>
								<div>
									<div class="metric-label">Animations Before</div>
									<div class="metric-value-lg">
										{result.technical.debug.animationsBeforeHover ?? 0}
									</div>
								</div>
								<div>
									<div class="metric-label">Animations After</div>
									<div class="metric-value-lg">
										{result.technical.debug.animationsAfterHover ?? 0}
									</div>
								</div>
							</div>
							{#if result.technical.debug.captureTime}
								<div class="capture-time">Captured in {result.technical.debug.captureTime}ms</div>
							{/if}
						</div>
					{/if}

					<div class="grid md:grid-cols-3 gap-4">
						<div class="metric-box p-3">
							<div class="code-secondary">Running Animations</div>
							<div class="metric-value-xl">
								{result.technical.animations.length}
							</div>
						</div>
						<div class="metric-box p-3">
							<div class="code-secondary">CSS Transitions</div>
							<div class="metric-value-xl">
								{result.technical.transitions.length}
							</div>
						</div>
						<div class="metric-box p-3">
							<div class="code-secondary">Total Duration</div>
							<div class="metric-value-xl">
								{result.technical.timing.totalDuration}ms
							</div>
						</div>
					</div>

					<!-- Transitions List -->
					{#if result.technical.transitions.length > 0}
						<div class="space-y-2">
							<h3 class="list-heading">CSS Transitions</h3>
							<div class="grid md:grid-cols-2 gap-2">
								{#each result.technical.transitions.slice(0, 10) as trans}
									<div class="code-block p-3 font-mono">
										<div class="emphasis-text">{trans.property}</div>
										<div class="code-secondary">
											{trans.duration}ms • {trans.easing}
										</div>
									</div>
								{/each}
							</div>
							{#if result.technical.transitions.length > 10}
								<div class="caption-text">+ {result.technical.transitions.length - 10} more transitions</div>
							{/if}
						</div>
					{/if}

					<!-- Running Animations List -->
					{#if result.technical.animations.length > 0}
						<div class="space-y-2">
							<h3 class="list-heading">Running Animations</h3>
							<div class="space-y-2">
								{#each result.technical.animations as anim}
									<div class="code-block p-3 font-mono">
										<div class="emphasis-text">{anim.name || 'unnamed'}</div>
										<div class="code-secondary">
											{anim.duration}ms • {anim.easing} • {anim.iterations === Infinity
												? 'infinite'
												: anim.iterations}
											iterations
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- CSS Definitions -->
					{#if result.technical.cssDefinitions && result.technical.cssDefinitions.length > 0}
						<div class="space-y-2">
							<h3 class="list-heading">CSS Animation/Transition Definitions</h3>
							<div class="space-y-2 max-h-64 overflow-y-auto">
								{#each result.technical.cssDefinitions.slice(0, 20) as def}
									<div class="code-block p-3 font-mono">
										{#if def.type === 'keyframes'}
											<div class="code-keyword">@keyframes {def.name}</div>
											<div class="code-secondary">{def.keyframes?.length || 0} keyframes</div>
										{:else}
											<div class="code-selector truncate">{def.selector}</div>
											{#if def.transition}
												<div class="code-secondary">transition: {def.transition}</div>
											{/if}
											{#if def.animation}
												<div class="code-secondary">animation: {def.animation}</div>
											{/if}
										{/if}
									</div>
								{/each}
							</div>
							{#if result.technical.cssDefinitions.length > 20}
								<div class="caption-text">+ {result.technical.cssDefinitions.length - 20} more definitions</div>
							{/if}
						</div>
					{/if}

					<!-- Properties -->
					{#if result.technical.propertiesAnimated.length > 0}
						<div class="space-y-2">
							<h3 class="list-heading">Properties Animated</h3>
							<div class="flex flex-wrap gap-2">
								{#each result.technical.propertiesAnimated as prop}
									<span class="property-tag px-2 py-1 font-mono">
										{prop}
									</span>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- Metadata -->
				<div class="metadata-text text-center">
					Analyzed {result.metadata.url} in {result.metadata.duration}ms
				</div>
			</div>
		{/if}

		<!-- Framework Reference -->
		<div class="framework-card mt-12 p-6">
			<h2 class="card-title mb-4">Heideggerian Framework</h2>
			<div class="grid md:grid-cols-2 gap-6">
				<div class="space-y-3">
					<h3 class="subsection-title">Ontological Modes</h3>
					<div class="framework-text space-y-2">
						<p>
							<span class="term-zuhandenheit font-medium">Zuhandenheit</span> — Ready-to-hand. Motion
							recedes into the background, supporting intention without demanding attention.
						</p>
						<p>
							<span class="term-vorhandenheit font-medium">Vorhandenheit</span> — Present-at-hand.
							Motion obstructs, forcing awareness of the interface itself.
						</p>
					</div>
				</div>
				<div class="space-y-3">
					<h3 class="subsection-title">Disclosure Types</h3>
					<ul class="framework-text space-y-1">
						<li><span class="term-label">state_transition</span> — Loading, expanding, toggling</li>
						<li><span class="term-label">spatial_relationship</span> — Belonging, source/target</li>
						<li><span class="term-label">user_confirmation</span> — Input acknowledged</li>
						<li><span class="term-label">hierarchy_reveal</span> — Primary, secondary, tertiary</li>
						<li><span class="term-label">temporal_sequence</span> — Order of operations</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
  .ascii-container {
    background: var(--color-bg-pure);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
  }

  .ascii-art {
    color: var(--color-fg-secondary);
    font-size: clamp(0.6rem, 1.5vw, 0.9rem);
  }

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

  .highlight-text {
    color: var(--color-fg-secondary);
  }

  .form-card {
    background: var(--color-hover);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
  }

  .form-label {
    font-size: var(--text-body-sm);
    font-weight: 500;
    color: var(--color-fg-tertiary);
  }

  .form-input,
  .form-select {
    background: var(--color-overlay);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    color: var(--color-fg-primary);
  }

  .form-input::placeholder {
    color: var(--color-fg-subtle);
  }

  .form-input:focus {
    outline: none;
    border-color: var(--color-border-emphasis);
  }

  .error-text {
    color: var(--color-error);
    font-size: var(--text-body-sm);
  }

  .submit-button {
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
    border-radius: var(--radius-md);
    border: none;
    cursor: pointer;
    transition: opacity var(--duration-micro) var(--ease-standard);
  }

  .submit-button:hover:not(:disabled) {
    opacity: 0.9;
  }

  .submit-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .result-card {
    background: var(--color-hover);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
  }

  .card-title {
    font-size: var(--text-h3);
    font-weight: 700;
    color: var(--color-fg-primary);
  }

  .label-text {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .section-label {
    font-size: var(--text-body-sm);
    font-weight: 500;
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .emphasis-text {
    color: var(--color-fg-primary);
  }

  .body-text {
    color: var(--color-fg-secondary);
  }

  .body-text-light {
    color: var(--color-fg-secondary);
  }

  .judgment-badge {
    padding: 0.5rem 1rem;
    border-radius: var(--radius-md);
    border: 1px solid;
    font-size: var(--text-body-sm);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .judgment-functional {
    color: var(--color-success);
    background: var(--color-success-muted);
    border-color: var(--color-success-border);
  }

  .judgment-decorative {
    color: var(--color-error);
    background: var(--color-error-muted);
    border-color: var(--color-error-border);
  }

  .judgment-ambiguous {
    color: var(--color-warning);
    background: var(--color-warning-muted);
    border-color: var(--color-warning-border);
  }

  .mode-label {
    font-size: var(--text-body-sm);
  }

  .mode-zuhandenheit {
    color: var(--color-success);
  }

  .mode-vorhandenheit {
    color: var(--color-warning);
  }

  .puppeteer-badge {
    font-size: var(--text-caption);
    padding: 0.25rem 0.5rem;
    background: var(--color-success-muted);
    color: var(--color-success);
    border-radius: var(--radius-sm);
  }

  .metric-card {
    background: var(--color-bg-surface);
    border-radius: var(--radius-md);
    font-size: var(--text-body-sm);
  }

  .metric-label {
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
  }

  .metric-value-lg {
    font-size: var(--text-body-lg);
    font-weight: 500;
    color: var(--color-fg-primary);
  }

  .metric-value-xl {
    font-size: var(--text-h2);
    font-weight: 700;
    color: var(--color-fg-primary);
  }

  .code-block {
    background: var(--color-bg-surface);
    border-radius: var(--radius-md);
    font-size: var(--text-body-sm);
  }

  .code-primary {
    color: var(--color-fg-primary);
  }

  .code-secondary {
    color: var(--color-fg-muted);
  }

  .code-keyword {
    color: var(--color-data-3);
  }

  .code-selector {
    color: var(--color-info);
  }

  .caption-text {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
  }

  .subsection-title {
    color: var(--color-fg-tertiary);
    font-weight: 500;
  }

  .reference-text {
    color: var(--color-fg-muted);
  }

  .term-zuhandenheit {
    color: var(--color-success);
  }

  .term-vorhandenheit {
    color: var(--color-warning);
  }

  .term-label {
    color: var(--color-fg-tertiary);
  }

  /* Missing class definitions - migrated to Canon */
  .recommendation-box {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
  }

  .debug-box {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
  }

  .metric-box {
    background: var(--color-bg-surface);
    border-radius: var(--radius-md);
  }

  .framework-card {
    background: var(--color-hover);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
  }

  .framework-text {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
  }

  .list-heading {
    font-size: var(--text-body-sm);
    font-weight: 500;
    color: var(--color-fg-tertiary);
  }

  .property-tag {
    background: var(--color-bg-surface);
    border-radius: var(--radius-sm);
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .metadata-text {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
  }

  .capture-time {
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
  }

  .confidence-row {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
  }

  .confidence-track {
    background: var(--color-bg-surface);
    border-radius: var(--radius-full);
  }

  .confidence-fill {
    background: var(--color-success);
    border-radius: var(--radius-full);
    transition: width var(--duration-standard) var(--ease-standard);
  }

  .action-keep {
    color: var(--color-success);
  }

  .action-remove {
    color: var(--color-error);
  }

  .action-modify {
    color: var(--color-warning);
  }

  .modification-text {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
    font-style: italic;
  }

  .status-success {
    color: var(--color-success);
  }

  .status-error {
    color: var(--color-error);
  }

  .status-warning {
    color: var(--color-warning);
  }
</style>
