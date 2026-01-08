<script lang="ts">
	/**
	 * Subtractive Form Design Experiment
	 *
	 * Let users EXPERIENCE the "absence is clearer than instruction" principle.
	 * Interactive form builder demonstrating hermeneutic form architecture.
	 */

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Experiment tracking
	const PAPER_ID = 'file-subtractive-form';
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
	type AppCapability = 'Data Client v2' | 'Designer Extension' | 'Hybrid';
	let appCapability = $state<AppCapability>('Data Client v2');
	let installUrl = $state('');

	// Approach toggle
	type Approach = 'instructional' | 'subtractive';
	let approach = $state<Approach>('instructional');

	// Error simulation
	let showError = $state(false);
	let errorMessage = $state('');

	// Simulated error rates based on approach
	const errorRates: {
		instructional: { [key: string]: number };
		subtractive: { [key: string]: number };
	} = {
		instructional: {
			'Data Client v2': 5,
			'Designer Extension': 68, // High error rate when field visible but shouldn't be filled
			'Hybrid': 8
		},
		subtractive: {
			'Data Client v2': 5,
			'Designer Extension': 0, // Zero errors when field is hidden
			'Hybrid': 8
		}
	};

	// Whether field should be visible in subtractive mode
	const shouldShowField = $derived(
		appCapability === 'Data Client v2' || appCapability === 'Hybrid'
	);

	// When switching to Designer Extension in subtractive mode, clear the URL
	$effect(() => {
		if (approach === 'subtractive' && appCapability === 'Designer Extension') {
			installUrl = '';
		}
	});

	// Get current error rate
	const currentErrorRate = $derived(errorRates[approach][appCapability]);

	// Simulate submission
	function simulateSubmit() {
		showError = false;
		errorMessage = '';

		// In instructional mode with Designer Extension, simulate common errors
		if (approach === 'instructional' && appCapability === 'Designer Extension' && installUrl) {
			const errorMessages = [
				'Error: Install URL should not be provided for Designer Extensions. Please leave blank.',
				'Review required: Incorrect Install URL format for Designer Extension.',
				'Error: webflow-ext.com URLs are not OAuth endpoints. Leave blank for Designer Extensions.'
			];
			errorMessage = errorMessages[Math.floor(Math.random() * errorMessages.length)];
			showError = true;
			trackExperiment('error', { approach, appCapability, hasInstallUrl: !!installUrl });
		} else {
			trackExperiment('complete', { approach, appCapability, hasInstallUrl: !!installUrl });
		}
	}

	// Track when users change approach
	function toggleApproach() {
		approach = approach === 'instructional' ? 'subtractive' : 'instructional';
		trackExperiment('start', { approach });
	}
</script>

<svelte:head>
	<title>Subtractive Form Design | CREATE SOMETHING SPACE</title>
	<meta
		name="description"
		content="Experience the 'absence is clearer than instruction' principle firsthand through interactive form design."
	/>
</svelte:head>

<!-- ASCII Art Hero -->
<section class="relative pt-24 pb-8 px-6">
	<div class="max-w-4xl mx-auto">
		<div class="ascii-container overflow-hidden">
			<div class="aspect-[21/9] flex items-center justify-center p-8">
				<pre class="ascii-art leading-[1.3] font-mono select-none">{`
    +-------------------------------------------------+
    |   SUBTRACTIVE FORM DESIGN                       |
    |                                                 |
    |   Before                  After                 |
    |                                                 |
    |   [Field] ───────►       (Hidden)               |
    |   "leave blank"           Nothing               |
    |                                                 |
    |   68% error rate          0% error rate         |
    |                                                 |
    |   Absence is clearer than instruction           |
    +-------------------------------------------------+
`}</pre>
			</div>
		</div>
	</div>
</section>

<!-- Hero -->
<section class="relative pb-12 px-6">
	<div class="max-w-4xl mx-auto space-y-4">
		<h1 class="hero-title">Subtractive Form Design</h1>
		<p class="hero-subtitle italic">
			Try this: Watch what happens when you hide the field
		</p>
		<p class="hero-description max-w-2xl mx-auto">
			A form field with "leave blank for Designer Extensions" got filled out 68% of the time anyway. The fix wasn't better instructions—it was removing the field entirely. Try it yourself below.
		</p>
	</div>
</section>

<!-- Approach Toggle -->
<section class="px-6 pb-8">
	<div class="max-w-4xl mx-auto">
		<div class="approach-toggle p-6">
			<div class="flex items-center justify-between mb-6">
				<div>
					<h2 class="card-title">Try Both Approaches</h2>
					<p class="body-text-light mt-1">
						Switch between them and notice how it feels to fill out the form
					</p>
				</div>
				<button
					onclick={toggleApproach}
					class="toggle-button px-4 py-2"
				>
					Switch to {approach === 'instructional' ? 'Subtractive' : 'Instructional'}
				</button>
			</div>

			<div class="grid md:grid-cols-2 gap-4">
				<div
					class="approach-card {approach === 'instructional' ? 'active' : ''}"
				>
					<h3 class="approach-heading">Instructional</h3>
					<p class="approach-description">
						Show field with "leave blank for Designer Extensions" instruction
					</p>
				</div>
				<div
					class="approach-card {approach === 'subtractive' ? 'active' : ''}"
				>
					<h3 class="approach-heading">Subtractive</h3>
					<p class="approach-description">
						Hide field when it doesn't apply
					</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Interactive Form -->
<section class="px-6 pb-12">
	<div class="max-w-4xl mx-auto">
		<div class="form-card p-6 space-y-6">
			<div>
				<h2 class="card-title mb-2">App Submission Form</h2>
				<p class="body-text-light">
					{approach === 'instructional' ? 'Traditional approach with instructions' : 'Subtractive approach with conditional rendering'}
				</p>
			</div>

			<!-- App Capability Select -->
			<div class="space-y-2">
				<label for="capability" class="form-label block">App Capabilities</label>
				<select
					id="capability"
					bind:value={appCapability}
					class="select-input w-full px-4 py-3"
				>
					<option value="Data Client v2">Data Client v2</option>
					<option value="Designer Extension">Designer Extension</option>
					<option value="Hybrid">Hybrid</option>
				</select>
				<p class="field-hint">
					{#if appCapability === 'Data Client v2'}
						API-based apps requiring OAuth for installation
					{:else if appCapability === 'Designer Extension'}
						Extensions running inside the Webflow Designer
					{:else}
						Apps combining both capabilities
					{/if}
				</p>
			</div>

			<!-- Install URL Field - Conditional Rendering Based on Approach -->
			{#if approach === 'instructional'}
				<!-- Instructional: Always show field -->
				<div class="space-y-2">
					<label for="install-url" class="form-label block">
						App Install URL
						{#if appCapability === 'Designer Extension'}
							<span class="instruction-text">(leave blank for Designer Extensions)</span>
						{/if}
					</label>
					<input
						id="install-url"
						type="url"
						bind:value={installUrl}
						placeholder="https://your-app.com/install"
						class="form-input w-full px-4 py-3"
					/>
					<p class="field-hint">
						The OAuth Authorization URL used to install the app in Webflow.
						{#if appCapability === 'Designer Extension'}
							<strong>Leave blank for Designer Extensions.</strong>
						{:else}
							Required for {appCapability}.
						{/if}
					</p>
				</div>
			{:else}
				<!-- Subtractive: Only show field when applicable -->
				{#if shouldShowField}
					<div class="space-y-2 field-enter">
						<label for="install-url" class="form-label block">App Install URL</label>
						<input
							id="install-url"
							type="url"
							bind:value={installUrl}
							placeholder="https://your-app.com/install"
							class="form-input w-full px-4 py-3"
						/>
						<p class="field-hint">
							The URL users are directed to when installing your app. Webflow will redirect here with site_id and state parameters.
						</p>
					</div>
				{:else}
					<div class="field-absent p-4">
						<p class="absent-text">
							Install URL field hidden (not applicable for Designer Extensions)
						</p>
					</div>
				{/if}
			{/if}

			{#if showError}
				<div class="error-box p-4">
					<p class="error-text">{errorMessage}</p>
				</div>
			{/if}

			<button
				onclick={simulateSubmit}
				class="submit-button w-full px-6 py-3 font-medium"
			>
				Submit Application
			</button>
		</div>
	</div>
</section>

<!-- Error Rate Comparison -->
<section class="px-6 pb-12">
	<div class="max-w-4xl mx-auto">
		<div class="metrics-card p-6">
			<h2 class="card-title mb-6">What Actually Happened</h2>

			<div class="grid md:grid-cols-3 gap-4">
				{#each ['Data Client v2', 'Designer Extension', 'Hybrid'] as capability}
					<div class="metric-item p-4">
						<div class="metric-label">{capability}</div>
						<div class="metric-comparison">
							<div class="metric-row">
								<span class="approach-label">Instructional:</span>
								<span class="metric-value {errorRates.instructional[capability] > 50 ? 'error' : 'neutral'}">
									{errorRates.instructional[capability]}%
								</span>
							</div>
							<div class="metric-row">
								<span class="approach-label">Subtractive:</span>
								<span class="metric-value {errorRates.subtractive[capability] === 0 ? 'success' : 'neutral'}">
									{errorRates.subtractive[capability]}%
								</span>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<div class="insight-box p-4 mt-6">
				<h3 class="insight-heading">Notice What Happened</h3>
				<p class="insight-text">
					A visible field implies it should be filled—no amount of "leave blank" instructions changes that.
					For Designer Extensions, errors dropped from <strong>68% to 0%</strong> by simply hiding the field.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- What This Reveals -->
<section class="px-6 pb-12">
	<div class="max-w-4xl mx-auto">
		<div class="principle-card p-8">
			<div class="space-y-6">
				<div>
					<h2 class="principle-heading">What This Reveals</h2>
					<p class="principle-quote">Sometimes the fix isn't better instructions—it's removing the field entirely.</p>
				</div>

				<div class="space-y-4 body-text-light">
					<p>
						When the Install URL field appeared for Designer Extensions, problems cascaded:
					</p>
					<ul class="list-disc list-inside space-y-2 pl-4">
						<li><strong>Developers</strong>: Confused about what to enter</li>
						<li><strong>Review Team</strong>: Spent time clearing incorrect values</li>
						<li><strong>Submissions</strong>: Delayed by rejection/re-submission cycles</li>
					</ul>
					<p>
						The field didn't belong there. Removing it fixed all three problems at once.
					</p>
				</div>

				<div class="principle-box p-6">
					<p class="principle-statement">
						Absence is clearer than instruction.
					</p>
					<p class="principle-next">
						<strong>Try this pattern:</strong> Next time you add a "leave blank if..." instruction, ask whether hiding the field would work better.
					</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Link to Full Paper -->
<section class="px-6 pb-16">
	<div class="max-w-4xl mx-auto">
		<div class="paper-link-card p-6">
			<div class="flex items-center justify-between">
				<div>
					<h3 class="card-title mb-2">Want the Deeper Explanation?</h3>
					<p class="body-text-light">
						The full paper covers the philosophy behind "subtractive form design" and when to apply it
					</p>
				</div>
				<a
					href="https://createsomething.io/papers/subtractive-form-design"
					class="paper-link-button px-6 py-3"
					target="_blank"
					rel="noopener noreferrer"
				>
					View Paper →
				</a>
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
		text-align: center;
	}

	.hero-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		text-align: center;
	}

	.hero-description {
		color: var(--color-fg-muted);
		text-align: center;
	}

	.approach-toggle {
		background: var(--color-hover);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
	}

	.toggle-button {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-radius: var(--radius-md);
		border: none;
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.toggle-button:hover {
		opacity: 0.9;
	}

	.approach-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.approach-card.active {
		border-color: var(--color-fg-secondary);
		background: var(--color-bg-subtle);
	}

	.approach-heading {
		font-size: var(--text-h4);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.approach-description {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	.form-card {
		background: var(--color-hover);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
	}

	.card-title {
		font-size: var(--text-h3);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.body-text-light {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
	}

	.form-label {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-tertiary);
	}

	.instruction-text {
		color: var(--color-warning);
		font-weight: normal;
		font-style: italic;
	}

	.select-input {
		background: var(--color-overlay);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
	}

	.select-input:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
	}

	.form-input {
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

	.field-hint {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.field-enter {
		animation: slideIn var(--duration-standard) var(--ease-standard);
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.field-absent {
		background: var(--color-bg-surface);
		border: 1px dashed var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.absent-text {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		font-style: italic;
		text-align: center;
	}

	.error-box {
		background: var(--color-error-muted);
		border: 1px solid var(--color-error);
		border-radius: var(--radius-md);
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

	.submit-button:hover {
		opacity: 0.9;
	}

	.metrics-card {
		background: var(--color-hover);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
	}

	.metric-item {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.metric-label {
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.metric-comparison {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.metric-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.approach-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.metric-value {
		font-size: var(--text-body-lg);
		font-weight: 700;
	}

	.metric-value.neutral {
		color: var(--color-fg-primary);
	}

	.metric-value.error {
		color: var(--color-error);
	}

	.metric-value.success {
		color: var(--color-success);
	}

	.insight-box {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-lg);
	}

	.insight-heading {
		font-size: var(--text-h4);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.insight-text {
		color: var(--color-fg-secondary);
		font-size: var(--text-body);
	}

	.principle-card {
		background: var(--color-hover);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
	}

	.principle-heading {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.principle-quote {
		font-size: var(--text-h3);
		font-style: italic;
		color: var(--color-fg-secondary);
		margin-top: var(--space-sm);
	}

	.principle-box {
		background: var(--color-bg-subtle);
		border: 2px solid var(--color-border-strong);
		border-radius: var(--radius-lg);
	}

	.principle-statement {
		font-size: var(--text-h3);
		font-weight: 600;
		text-align: center;
		color: var(--color-fg-primary);
	}

	.principle-next {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		text-align: center;
		margin-top: var(--space-sm);
	}

	.paper-link-card {
		background: var(--color-hover);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
	}

	.paper-link-button {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-radius: var(--radius-md);
		text-decoration: none;
		transition: opacity var(--duration-micro) var(--ease-standard);
		display: inline-block;
	}

	.paper-link-button:hover {
		opacity: 0.9;
	}
</style>
