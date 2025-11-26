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
	function getModeColor(mode: OntologicalMode): string {
		return mode === 'zuhandenheit' ? 'text-green-400' : 'text-amber-400';
	}

	function getModeLabel(mode: OntologicalMode): string {
		return mode === 'zuhandenheit' ? 'Ready-to-hand (recedes)' : 'Present-at-hand (obstructs)';
	}

	// Judgment styling
	function getJudgmentColor(judgment: MotionJudgment): string {
		switch (judgment) {
			case 'functional':
				return 'text-green-400 bg-green-400/10 border-green-400/30';
			case 'decorative':
				return 'text-red-400 bg-red-400/10 border-red-400/30';
			case 'ambiguous':
				return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
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
	<title>Motion Ontology | CREATE SOMETHING SPACE</title>
	<meta
		name="description"
		content="Analyze UI motion through Heidegger's phenomenological framework. Does motion disclose or decorate?"
	/>
</svelte:head>

<!-- Hero -->
<section class="relative pt-32 pb-12 px-6">
	<div class="max-w-4xl mx-auto text-center space-y-4">
		<h1 class="text-4xl md:text-5xl font-bold text-white">Motion Ontology</h1>
		<p class="text-lg text-white/60 italic">
			Die Frage nach dem Sein der Animation
		</p>
		<p class="text-white/40 max-w-2xl mx-auto">
			Analyze UI motion through Heidegger's phenomenological framework. Does the animation serve
			<span class="text-white/60">disclosure</span> (revealing meaning) or mere
			<span class="text-white/60">decoration</span> (visual noise)?
		</p>
	</div>
</section>

<!-- Analysis Tool -->
<section class="px-6 pb-16">
	<div class="max-w-4xl mx-auto">
		<!-- Input Form -->
		<div class="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
			<div class="space-y-2">
				<label for="url" class="block text-sm font-medium text-white/70">URL to Analyze</label>
				<input
					id="url"
					type="url"
					bind:value={url}
					placeholder="https://example.com"
					class="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/30"
				/>
			</div>

			<div class="grid md:grid-cols-2 gap-4">
				<div class="space-y-2">
					<label for="trigger" class="block text-sm font-medium text-white/70">Trigger Event</label>
					<select
						id="trigger"
						bind:value={triggerType}
						class="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
					>
						{#each triggerOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>

				{#if needsSelector}
					<div class="space-y-2">
						<label for="selector" class="block text-sm font-medium text-white/70"
							>CSS Selector</label
						>
						<input
							id="selector"
							type="text"
							bind:value={triggerSelector}
							placeholder="button, .btn, #submit"
							class="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/30"
						/>
					</div>
				{/if}
			</div>

			{#if error}
				<p class="text-red-400 text-sm">{error}</p>
			{/if}

			<button
				onclick={analyzeMotion}
				disabled={isAnalyzing}
				class="w-full px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{isAnalyzing ? 'Analyzing...' : 'Analyze Motion'}
			</button>
		</div>

		<!-- Results -->
		{#if result}
			<div class="mt-8 space-y-6">
				<!-- Phenomenological Analysis -->
				<div class="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
					<div class="flex items-center justify-between">
						<h2 class="text-xl font-bold text-white">Phenomenological Analysis</h2>
						<span class="text-sm text-white/40">ALETHEIA</span>
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
						<span class="text-sm {getModeColor(result.phenomenological.mode)}">
							{getModeLabel(result.phenomenological.mode)}
						</span>
					</div>

					<!-- Disclosure -->
					<div class="space-y-2">
						<h3 class="text-sm font-medium text-white/50 uppercase tracking-wide">Disclosure</h3>
						<p class="text-white">
							<span class="text-white/60">{result.phenomenological.disclosure}:</span>
							{result.phenomenological.disclosureDescription}
						</p>
					</div>

					<!-- Mode Rationale -->
					<div class="space-y-2">
						<h3 class="text-sm font-medium text-white/50 uppercase tracking-wide">
							Ontological Mode
						</h3>
						<p class="text-white/80">{result.phenomenological.modeRationale}</p>
					</div>

					<!-- Justification -->
					<div class="space-y-2">
						<h3 class="text-sm font-medium text-white/50 uppercase tracking-wide">Justification</h3>
						<p class="text-white/80">{result.phenomenological.justification}</p>
					</div>

					<!-- Recommendation -->
					<div class="p-4 bg-black/30 rounded-lg space-y-2">
						<h3 class="text-sm font-medium text-white/50 uppercase tracking-wide">
							Recommendation
						</h3>
						<p class="text-white">
							<span
								class="font-medium {result.phenomenological.recommendation.action === 'keep'
									? 'text-green-400'
									: result.phenomenological.recommendation.action === 'remove'
										? 'text-red-400'
										: 'text-yellow-400'}"
							>
								{result.phenomenological.recommendation.action.toUpperCase()}
							</span>
							— {result.phenomenological.recommendation.reasoning}
						</p>
						{#if result.phenomenological.recommendation.modification}
							<p class="text-white/60 text-sm">
								Modification: {result.phenomenological.recommendation.modification}
							</p>
						{/if}
					</div>

					<!-- Confidence -->
					<div class="flex items-center gap-2 text-sm text-white/40">
						<span>Confidence:</span>
						<div class="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
							<div
								class="h-full bg-white/50 rounded-full"
								style="width: {result.phenomenological.confidence * 100}%"
							></div>
						</div>
						<span>{Math.round(result.phenomenological.confidence * 100)}%</span>
					</div>
				</div>

				<!-- Technical Analysis -->
				<div class="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
					<div class="flex items-center justify-between">
						<h2 class="text-xl font-bold text-white">Technical Analysis</h2>
						<span class="text-sm text-white/40">SEIN</span>
					</div>

					<div class="grid md:grid-cols-3 gap-4 text-sm">
						<div class="p-3 bg-black/30 rounded-lg">
							<div class="text-white/50">Animations</div>
							<div class="text-2xl font-bold text-white">
								{result.technical.animations.length}
							</div>
						</div>
						<div class="p-3 bg-black/30 rounded-lg">
							<div class="text-white/50">Total Duration</div>
							<div class="text-2xl font-bold text-white">
								{result.technical.timing.totalDuration}ms
							</div>
						</div>
						<div class="p-3 bg-black/30 rounded-lg">
							<div class="text-white/50">Properties</div>
							<div class="text-2xl font-bold text-white">
								{result.technical.propertiesAnimated.length}
							</div>
						</div>
					</div>

					<!-- Animations List -->
					{#if result.technical.animations.length > 0}
						<div class="space-y-2">
							<h3 class="text-sm font-medium text-white/50">Animations Detected</h3>
							<div class="space-y-2">
								{#each result.technical.animations as anim}
									<div class="p-3 bg-black/30 rounded-lg text-sm font-mono">
										<div class="text-white">{anim.name || 'unnamed'}</div>
										<div class="text-white/50">
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

					<!-- Properties -->
					{#if result.technical.propertiesAnimated.length > 0}
						<div class="space-y-2">
							<h3 class="text-sm font-medium text-white/50">Properties Animated</h3>
							<div class="flex flex-wrap gap-2">
								{#each result.technical.propertiesAnimated as prop}
									<span class="px-2 py-1 bg-black/30 rounded text-xs text-white/70 font-mono">
										{prop}
									</span>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- Metadata -->
				<div class="text-center text-sm text-white/30">
					Analyzed {result.metadata.url} in {result.metadata.duration}ms
				</div>
			</div>
		{/if}

		<!-- Framework Reference -->
		<div class="mt-12 p-6 bg-white/5 border border-white/10 rounded-xl">
			<h2 class="text-lg font-bold text-white mb-4">Heideggerian Framework</h2>
			<div class="grid md:grid-cols-2 gap-6 text-sm">
				<div class="space-y-3">
					<h3 class="text-white/70 font-medium">Ontological Modes</h3>
					<div class="space-y-2 text-white/50">
						<p>
							<span class="text-green-400 font-medium">Zuhandenheit</span> — Ready-to-hand. Motion
							recedes into the background, supporting intention without demanding attention.
						</p>
						<p>
							<span class="text-amber-400 font-medium">Vorhandenheit</span> — Present-at-hand.
							Motion obstructs, forcing awareness of the interface itself.
						</p>
					</div>
				</div>
				<div class="space-y-3">
					<h3 class="text-white/70 font-medium">Disclosure Types</h3>
					<ul class="text-white/50 space-y-1">
						<li><span class="text-white/70">state_transition</span> — Loading, expanding, toggling</li>
						<li><span class="text-white/70">spatial_relationship</span> — Belonging, source/target</li>
						<li><span class="text-white/70">user_confirmation</span> — Input acknowledged</li>
						<li><span class="text-white/70">hierarchy_reveal</span> — Primary, secondary, tertiary</li>
						<li><span class="text-white/70">temporal_sequence</span> — Order of operations</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</section>
