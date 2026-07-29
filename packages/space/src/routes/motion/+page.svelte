<script lang="ts">
	/**
	 * Motion Ontology Experiment
	 *
	 * Die Frage nach dem Sein der Animation
	 * (The Question of the Being of Animation)
	 *
	 * Analyze UI motion through Heidegger's phenomenological framework.
	 */

	import type {
		TriggerType,
		MotionAnalysisResult,
		OntologicalMode,
		MotionJudgment
	} from '$lib/motion-analysis';
	import { SEO } from '@create-something/canon';

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
	async function analyzeMotion(event?: SubmitEvent) {
		event?.preventDefault();
		const requestedUrl = url.trim();

		if (!requestedUrl) {
			error = 'Enter the public page URL you want to inspect.';
			return;
		}

		try {
			new URL(requestedUrl);
		} catch {
			error = 'Enter a complete URL, including https://.';
			return;
		}

		if (needsSelector && !triggerSelector.trim()) {
			error = 'Enter the CSS selector that receives this interaction.';
			return;
		}

		isAnalyzing = true;
		error = null;
		result = null;

		try {
			const response = await fetch('/api/motion/analyze', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					url: requestedUrl,
					trigger: {
						type: triggerType,
						selector: needsSelector ? triggerSelector.trim() : undefined
					}
				})
			});

			const data = (await response.json()) as MotionAnalysisResult & {
				success: boolean;
				error?: string;
			};

			if (!response.ok || !data.success) {
				error = data.error || 'The page could not be analyzed. Check the URL and try again.';
				return;
			}

			result = data;
		} catch (e) {
			error =
				e instanceof Error
					? `The analysis stopped: ${e.message}. Check the URL and try again.`
					: 'The analysis stopped. Check the URL and try again.';
		} finally {
			isAnalyzing = false;
		}
	}
</script>

<SEO
	title="Motion Lab"
	description="Analyze CSS animations from any URL. Puppeteer-based extraction with timing, easing, and phenomenological analysis."
	keywords="motion analysis, CSS animations, Puppeteer, UI animation, timing analysis, easing"
	propertyName="space"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.space' },
		{ name: 'Motion Lab', url: 'https://createsomething.space/motion' }
	]}
/>

<main class="experiment-page">
	<section data-page-chapter="orientation" class="tool-opening">
		<div class="max-w-4xl mx-auto opening-inner">
			<p class="eyebrow">Motion Lab · one page, one trigger</p>
			<h1>Decide whether one motion helps or distracts.</h1>
			<p class="opening-copy">
				Enter a public page and choose the interaction to inspect. The lab returns the motion it
				finds, what that motion communicates, and a keep, modify, or remove recommendation.
			</p>
			<ol class="opening-steps" aria-label="How the analysis works">
				<li><span>1</span>Add a page URL</li>
				<li><span>2</span>Choose its trigger</li>
				<li><span>3</span>Review the recommendation</li>
			</ol>
		</div>
	</section>

	<section data-page-chapter="workspace" class="workspace-section">
		<div class="max-w-4xl mx-auto workspace-inner">
			<noscript>
				<p class="noscript-note">
					Motion analysis needs JavaScript to submit the page and return a result.
				</p>
			</noscript>
			<form class="form-card p-6 space-y-4" onsubmit={analyzeMotion} aria-busy={isAnalyzing}>
				<header class="form-intro">
					<p class="eyebrow">Start here</p>
					<h2>Analyze one interaction</h2>
					<p>Use page load for the default view. Choose click, hover, or focus for one element.</p>
				</header>
				<div class="space-y-2">
					<label for="url" class="form-label block">Public page URL</label>
					<input
						id="url"
						type="url"
						bind:value={url}
						placeholder="https://example.com"
						class="form-input w-full px-4 py-3"
						aria-invalid={error ? 'true' : undefined}
						aria-describedby={error ? 'analysis-error' : undefined}
					/>
				</div>

				<div class="grid md:grid-cols-2 gap-4">
					<div class="space-y-2">
						<label for="trigger" class="form-label block">Interaction to inspect</label>
						<select id="trigger" bind:value={triggerType} class="form-select w-full px-4 py-3">
							{#each triggerOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>

					{#if needsSelector}
						<div class="space-y-2">
							<label for="selector" class="form-label block">Element selector</label>
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
					<p id="analysis-error" class="error-text" role="alert">{error}</p>
				{/if}

				<button
					type="submit"
					disabled={isAnalyzing}
					class="submit-button w-full px-6 py-3 font-medium"
				>
					{isAnalyzing ? 'Analyzing the page…' : 'Analyze this motion'}
				</button>
			</form>

			<!-- Results -->
			{#if result}
				<div class="mt-8 space-y-6" aria-live="polite">
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
							<h3 class="section-label">Ontological Mode</h3>
							<p class="body-text-light">{result.phenomenological.modeRationale}</p>
						</div>

						<!-- Justification -->
						<div class="space-y-2">
							<h3 class="section-label">Justification</h3>
							<p class="body-text-light">{result.phenomenological.justification}</p>
						</div>

						<!-- Recommendation -->
						<div class="recommendation-box p-4 space-y-2">
							<h3 class="section-label">Recommendation</h3>
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
										<div
											class="metric-value-lg {result.technical.debug.elementFound
												? 'status-success'
												: 'status-error'}"
										>
											{result.technical.debug.elementFound ? 'Yes' : 'No'}
										</div>
									</div>
									<div>
										<div class="metric-label">Hover Triggered</div>
										<div
											class="metric-value-lg {result.technical.debug.realHoverTriggered
												? 'status-success'
												: 'status-warning'}"
										>
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
									<div class="caption-text">
										+ {result.technical.transitions.length - 10} more transitions
									</div>
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
									<div class="caption-text">
										+ {result.technical.cssDefinitions.length - 20} more definitions
									</div>
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
			<details class="framework-card mt-12 p-6">
				<summary>How the recommendation is framed</summary>
				<div class="framework-content grid md:grid-cols-2 gap-6">
					<div class="space-y-3">
						<h2 class="subsection-title">Two motion modes</h2>
						<div class="framework-text space-y-2">
							<p>
								<span class="term-zuhandenheit font-medium">Ready-to-hand (Zuhandenheit)</span> — motion
								recedes while it supports the person's intent.
							</p>
							<p>
								<span class="term-vorhandenheit font-medium">Present-at-hand (Vorhandenheit)</span> —
								motion demands attention and obstructs the task.
							</p>
						</div>
					</div>
					<div class="space-y-3">
						<h2 class="subsection-title">What motion can reveal</h2>
						<ul class="framework-text space-y-1">
							<li>
								<span class="term-label">State change</span> — loading, expanding, or toggling
							</li>
							<li>
								<span class="term-label">Spatial relationship</span> — source, target, or belonging
							</li>
							<li>
								<span class="term-label">Confirmation</span> — the interface received an input
							</li>
							<li><span class="term-label">Hierarchy</span> — what is primary or secondary</li>
							<li><span class="term-label">Sequence</span> — the order of operations</li>
						</ul>
					</div>
				</div>
			</details>
		</div>
	</section>
</main>

<style>
  .experiment-page,
  .opening-inner,
  .workspace-inner,
  .form-card,
  .result-card,
  .framework-card {
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
    max-width: 42rem;
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
    margin: 0 0 var(--space-performance-md);
    padding: var(--space-performance-sm) var(--space-performance-md);
    background: var(--color-performance-warning-muted);
    border-radius: var(--radius-performance-scale-md);
    color: var(--color-performance-fg-secondary);
  }

  .form-intro {
    display: grid;
    gap: var(--space-performance-xs);
  }

  .form-intro h2,
  .form-intro p {
    margin: 0;
  }

  .form-intro h2 {
    color: var(--color-performance-fg-primary);
    font-size: var(--text-performance-h3);
  }

  .form-intro > p:last-child {
    color: var(--color-performance-fg-secondary);
  }

  .highlight-text {
    color: var(--color-performance-fg-secondary);
  }

  .form-card {
    background: var(--color-performance-hover);
    border-radius: var(--radius-performance-scale-xl);
  }

  .form-label {
    font-size: var(--text-performance-body-sm);
    font-weight: 500;
    color: var(--color-performance-fg-tertiary);
  }

  .form-input,
  .form-select {
    background: var(--color-performance-overlay);
    border-radius: var(--radius-performance-scale-md);
    color: var(--color-performance-fg-primary);
  }

  .form-input::placeholder {
    color: var(--color-performance-fg-subtle);
  }

  .form-input:focus {
    outline: none;
    border-color: var(--color-performance-border-emphasis);
  }

  .error-text {
    color: var(--color-performance-error);
    font-size: var(--text-performance-body-sm);
  }

  .submit-button {
    background: var(--color-performance-fg-primary);
    color: var(--color-performance-bg-pure);
    border-radius: var(--radius-performance-scale-md);
    border: none;
    cursor: pointer;
    transition: opacity var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .submit-button:hover:not(:disabled) {
    opacity: 0.9;
  }

  .submit-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .result-card {
    background: var(--color-performance-hover);
    border-radius: var(--radius-performance-scale-xl);
  }

  .card-title {
    font-size: var(--text-performance-h3);
    font-weight: 700;
    color: var(--color-performance-fg-primary);
  }

  .label-text {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-muted);
  }

  .section-label {
    font-size: var(--text-performance-body-sm);
    font-weight: 500;
    color: var(--color-performance-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .emphasis-text {
    color: var(--color-performance-fg-primary);
  }

  .body-text {
    color: var(--color-performance-fg-secondary);
  }

  .body-text-light {
    color: var(--color-performance-fg-secondary);
  }

  .judgment-badge {
    padding: 0.5rem 1rem;
    border-radius: var(--radius-performance-scale-md);
    border: 1px solid;
    font-size: var(--text-performance-body-sm);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .judgment-functional {
    color: var(--color-performance-success);
    background: var(--color-performance-success-muted);
    border-color: var(--color-performance-success-border);
  }

  .judgment-decorative {
    color: var(--color-performance-error);
    background: var(--color-performance-error-muted);
    border-color: var(--color-performance-error-border);
  }

  .judgment-ambiguous {
    color: var(--color-performance-warning);
    background: var(--color-performance-warning-muted);
    border-color: var(--color-performance-warning-border);
  }

  .mode-label {
    font-size: var(--text-performance-body-sm);
  }

  .mode-zuhandenheit {
    color: var(--color-performance-success);
  }

  .mode-vorhandenheit {
    color: var(--color-performance-warning);
  }

  .puppeteer-badge {
    font-size: var(--text-performance-caption);
    padding: 0.25rem 0.5rem;
    background: var(--color-performance-success-muted);
    color: var(--color-performance-success);
    border-radius: var(--radius-performance-scale-sm);
  }

  .metric-card {
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-md);
    font-size: var(--text-performance-body-sm);
  }

  .metric-label {
    color: var(--color-performance-fg-muted);
    font-size: var(--text-performance-caption);
  }

  .metric-value-lg {
    font-size: var(--text-performance-body-lg);
    font-weight: 500;
    color: var(--color-performance-fg-primary);
  }

  .metric-value-xl {
    font-size: var(--text-performance-h2);
    font-weight: 700;
    color: var(--color-performance-fg-primary);
  }

  .code-block {
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-md);
    font-size: var(--text-performance-body-sm);
  }

  .code-primary {
    color: var(--color-performance-fg-primary);
  }

  .code-secondary {
    color: var(--color-performance-fg-muted);
  }

  .code-keyword {
    color: var(--color-performance-data-3);
  }

  .code-selector {
    color: var(--color-performance-info);
  }

  .caption-text {
    color: var(--color-performance-fg-muted);
    font-size: var(--text-performance-body-sm);
  }

  .subsection-title {
    color: var(--color-performance-fg-tertiary);
    font-weight: 500;
  }

  .reference-text {
    color: var(--color-performance-fg-muted);
  }

  .term-zuhandenheit {
    color: var(--color-performance-success);
  }

  .term-vorhandenheit {
    color: var(--color-performance-warning);
  }

  .term-label {
    color: var(--color-performance-fg-tertiary);
  }

  /* Missing class definitions - migrated to Canon */
  .recommendation-box {
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-md);
  }

  .debug-box {
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-md);
  }

  .metric-box {
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-md);
  }

  .framework-card {
    background: var(--color-performance-hover);
    border-radius: var(--radius-performance-scale-xl);
  }

  .framework-card summary {
    cursor: pointer;
    color: var(--color-performance-fg-primary);
    font-size: var(--text-performance-body-lg);
    font-weight: 600;
  }

  .framework-content {
    margin-top: var(--space-performance-md);
  }

  .code-block,
  .code-selector,
  .metadata-text,
  .framework-text {
    max-width: 100%;
    overflow-wrap: anywhere;
  }

  .framework-text {
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-body-sm);
  }

  .list-heading {
    font-size: var(--text-performance-body-sm);
    font-weight: 500;
    color: var(--color-performance-fg-tertiary);
  }

  .property-tag {
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-sm);
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-secondary);
  }

  .metadata-text {
    color: var(--color-performance-fg-muted);
    font-size: var(--text-performance-body-sm);
  }

  .capture-time {
    color: var(--color-performance-fg-muted);
    font-size: var(--text-performance-caption);
  }

  .confidence-row {
    color: var(--color-performance-fg-muted);
    font-size: var(--text-performance-body-sm);
  }

  .confidence-track {
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-full);
  }

  .confidence-fill {
    background: var(--color-performance-success);
    border-radius: var(--radius-performance-scale-full);
    transition: width var(--duration-performance-standard) var(--ease-performance-standard);
  }

  .action-keep {
    color: var(--color-performance-success);
  }

  .action-remove {
    color: var(--color-performance-error);
  }

  .action-modify {
    color: var(--color-performance-warning);
  }

  .modification-text {
    color: var(--color-performance-fg-muted);
    font-size: var(--text-performance-body-sm);
    font-style: italic;
  }

  .status-success {
    color: var(--color-performance-success);
  }

  .status-error {
    color: var(--color-performance-error);
  }

  .status-warning {
    color: var(--color-performance-warning);
  }
</style>
