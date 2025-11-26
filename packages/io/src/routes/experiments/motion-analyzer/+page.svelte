<script lang="ts">
	/**
	 * Motion Analyzer Tool
	 *
	 * Extract and analyze CSS animations and transitions from any website.
	 * Uses real Puppeteer-based browser automation for accurate capture.
	 */

	import type {
		TriggerType,
		MotionAnalysisResult,
		MotionJudgment
	} from '$lib/motion-analysis/types';

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

	// Judgment styling
	function getJudgmentColor(judgment: MotionJudgment): string {
		switch (judgment) {
			case 'functional':
				return 'text-green-600 bg-green-100 border-green-300';
			case 'decorative':
				return 'text-red-600 bg-red-100 border-red-300';
			case 'ambiguous':
				return 'text-yellow-600 bg-yellow-100 border-yellow-300';
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

			const data = await response.json();

			if (!data.success) {
				error = data.error || 'Analysis failed';
				return;
			}

			result = data as MotionAnalysisResult;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error occurred';
		} finally {
			isAnalyzing = false;
		}
	}
</script>

<svelte:head>
	<title>Motion Analyzer | CREATE SOMETHING IO</title>
	<meta
		name="description"
		content="Extract and analyze CSS animations and transitions from any website using real browser automation."
	/>
</svelte:head>

<!-- Hero -->
<section class="relative pt-24 pb-8 px-6">
	<div class="max-w-4xl mx-auto text-center space-y-3">
		<h1 class="text-3xl md:text-4xl font-bold text-neutral-900">Motion Analyzer</h1>
		<p class="text-neutral-600 max-w-2xl mx-auto">
			Extract CSS animations and transitions from any website. Powered by Puppeteer for real hover
			state capture.
		</p>
	</div>
</section>

<!-- Analysis Tool -->
<section class="px-6 pb-16">
	<div class="max-w-4xl mx-auto">
		<!-- Input Form -->
		<div class="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-4">
			<div class="space-y-2">
				<label for="url" class="block text-sm font-medium text-neutral-700">URL to Analyze</label>
				<input
					id="url"
					type="url"
					bind:value={url}
					placeholder="https://example.com"
					class="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
				/>
			</div>

			<div class="grid md:grid-cols-2 gap-4">
				<div class="space-y-2">
					<label for="trigger" class="block text-sm font-medium text-neutral-700"
						>Trigger Event</label
					>
					<select
						id="trigger"
						bind:value={triggerType}
						class="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
					>
						{#each triggerOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>

				{#if needsSelector}
					<div class="space-y-2">
						<label for="selector" class="block text-sm font-medium text-neutral-700"
							>CSS Selector</label
						>
						<input
							id="selector"
							type="text"
							bind:value={triggerSelector}
							placeholder="button, .btn, #submit"
							class="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
						/>
					</div>
				{/if}
			</div>

			{#if error}
				<p class="text-red-600 text-sm">{error}</p>
			{/if}

			<button
				onclick={analyzeMotion}
				disabled={isAnalyzing}
				class="w-full px-6 py-3 bg-neutral-900 text-white font-medium rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{isAnalyzing ? 'Analyzing...' : 'Analyze Motion'}
			</button>
		</div>

		<!-- Results -->
		{#if result}
			<div class="mt-8 space-y-6">
				<!-- Technical Extraction -->
				<div class="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-4">
					<div class="flex items-center justify-between">
						<h2 class="text-xl font-bold text-neutral-900">Technical Extraction</h2>
						<span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Puppeteer</span>
					</div>

					<!-- Debug Info -->
					{#if result.technical.debug}
						<div class="p-3 bg-neutral-50 rounded-lg text-sm">
							<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
								<div>
									<div class="text-neutral-500 text-xs">Element Found</div>
									<div
										class="text-lg font-medium {result.technical.debug.elementFound
											? 'text-green-600'
											: 'text-red-600'}"
									>
										{result.technical.debug.elementFound ? 'Yes' : 'No'}
									</div>
								</div>
								<div>
									<div class="text-neutral-500 text-xs">Hover Triggered</div>
									<div
										class="text-lg font-medium {result.technical.debug.hoverTriggered
											? 'text-green-600'
											: 'text-amber-600'}"
									>
										{result.technical.debug.hoverTriggered ? 'Yes' : 'No'}
									</div>
								</div>
								<div>
									<div class="text-neutral-500 text-xs">Before Trigger</div>
									<div class="text-lg font-medium text-neutral-900">
										{result.technical.debug.animationsBeforeHover ?? 0} animations
									</div>
								</div>
								<div>
									<div class="text-neutral-500 text-xs">After Trigger</div>
									<div class="text-lg font-medium text-neutral-900">
										{result.technical.debug.animationsAfterHover ?? 0} animations
									</div>
								</div>
							</div>
						</div>
					{/if}

					<!-- Stats -->
					<div class="grid md:grid-cols-3 gap-4 text-sm">
						<div class="p-4 bg-neutral-50 rounded-lg">
							<div class="text-neutral-500">Animations</div>
							<div class="text-2xl font-bold text-neutral-900">
								{result.technical.animations.length}
							</div>
						</div>
						<div class="p-4 bg-neutral-50 rounded-lg">
							<div class="text-neutral-500">Transitions</div>
							<div class="text-2xl font-bold text-neutral-900">
								{result.technical.transitions.length}
							</div>
						</div>
						<div class="p-4 bg-neutral-50 rounded-lg">
							<div class="text-neutral-500">Total Duration</div>
							<div class="text-2xl font-bold text-neutral-900">
								{result.technical.timing.totalDuration}ms
							</div>
						</div>
					</div>

					<!-- Transitions List -->
					{#if result.technical.transitions.length > 0}
						<div class="space-y-2">
							<h3 class="text-sm font-medium text-neutral-500">CSS Transitions</h3>
							<div class="grid md:grid-cols-2 gap-2">
								{#each result.technical.transitions.slice(0, 8) as trans}
									<div class="p-3 bg-neutral-50 rounded-lg text-sm font-mono">
										<div class="text-neutral-900">{trans.property}</div>
										<div class="text-neutral-500">
											{trans.duration}ms / {trans.easing}
										</div>
									</div>
								{/each}
							</div>
							{#if result.technical.transitions.length > 8}
								<div class="text-neutral-400 text-sm">
									+ {result.technical.transitions.length - 8} more
								</div>
							{/if}
						</div>
					{/if}

					<!-- Animations List -->
					{#if result.technical.animations.length > 0}
						<div class="space-y-2">
							<h3 class="text-sm font-medium text-neutral-500">Running Animations</h3>
							<div class="space-y-2">
								{#each result.technical.animations as anim}
									<div class="p-3 bg-neutral-50 rounded-lg text-sm font-mono">
										<div class="text-neutral-900">{anim.name || 'unnamed'}</div>
										<div class="text-neutral-500">
											{anim.duration}ms / {anim.easing} / {anim.iterations === Infinity
												? 'infinite'
												: anim.iterations}
											iterations
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Properties -->
					{#if result.technical.propertiesAnimated.length > 0}
						<div class="space-y-2">
							<h3 class="text-sm font-medium text-neutral-500">Animated Properties</h3>
							<div class="flex flex-wrap gap-2">
								{#each result.technical.propertiesAnimated as prop}
									<span class="px-2 py-1 bg-neutral-100 rounded text-xs text-neutral-700 font-mono">
										{prop}
									</span>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- AI Analysis -->
				{#if result.phenomenological}
					<div class="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-4">
						<div class="flex items-center justify-between">
							<h2 class="text-xl font-bold text-neutral-900">AI Analysis</h2>
							<span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Workers AI</span>
						</div>

						<!-- Judgment Badge -->
						<div class="flex items-center gap-4">
							<span
								class="px-4 py-2 rounded-lg border text-sm font-medium uppercase tracking-wide {getJudgmentColor(
									result.phenomenological.judgment
								)}"
							>
								{result.phenomenological.judgment}
							</span>
							<span class="text-sm text-neutral-600">
								{result.phenomenological.mode === 'zuhandenheit'
									? 'Supports user flow'
									: 'Demands attention'}
							</span>
						</div>

						<!-- Analysis -->
						<div class="space-y-4">
							<div>
								<h3 class="text-sm font-medium text-neutral-500 mb-1">Purpose</h3>
								<p class="text-neutral-900">{result.phenomenological.disclosureDescription}</p>
							</div>

							<div>
								<h3 class="text-sm font-medium text-neutral-500 mb-1">Rationale</h3>
								<p class="text-neutral-700">{result.phenomenological.justification}</p>
							</div>

							<div class="p-4 bg-neutral-50 rounded-lg">
								<h3 class="text-sm font-medium text-neutral-500 mb-1">Recommendation</h3>
								<p class="text-neutral-900">
									<span
										class="font-medium {result.phenomenological.recommendation.action === 'keep'
											? 'text-green-600'
											: result.phenomenological.recommendation.action === 'remove'
												? 'text-red-600'
												: 'text-yellow-600'}"
									>
										{result.phenomenological.recommendation.action.toUpperCase()}
									</span>
									- {result.phenomenological.recommendation.reasoning}
								</p>
							</div>

							<!-- Confidence -->
							<div class="flex items-center gap-2 text-sm text-neutral-500">
								<span>Confidence:</span>
								<div class="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
									<div
										class="h-full bg-neutral-400 rounded-full"
										style="width: {result.phenomenological.confidence * 100}%"
									></div>
								</div>
								<span>{Math.round(result.phenomenological.confidence * 100)}%</span>
							</div>
						</div>
					</div>
				{/if}

				<!-- Metadata -->
				<div class="text-center text-sm text-neutral-400">
					Analyzed {result.metadata.url} in {result.metadata.duration}ms
				</div>
			</div>
		{/if}

		<!-- How it Works -->
		<div class="mt-12 p-6 bg-neutral-50 border border-neutral-200 rounded-xl">
			<h2 class="text-lg font-bold text-neutral-900 mb-4">How It Works</h2>
			<div class="grid md:grid-cols-3 gap-6 text-sm">
				<div class="space-y-2">
					<h3 class="font-medium text-neutral-700">1. Browser Automation</h3>
					<p class="text-neutral-500">
						Uses Cloudflare Browser Rendering with real Puppeteer to visit the URL and trigger
						interactions.
					</p>
				</div>
				<div class="space-y-2">
					<h3 class="font-medium text-neutral-700">2. Animation Capture</h3>
					<p class="text-neutral-500">
						Extracts running CSS animations and transitions via the Web Animations API after
						triggering the event.
					</p>
				</div>
				<div class="space-y-2">
					<h3 class="font-medium text-neutral-700">3. AI Analysis</h3>
					<p class="text-neutral-500">
						Workers AI evaluates whether the motion serves a functional purpose or is purely
						decorative.
					</p>
				</div>
			</div>
		</div>
	</div>
</section>
