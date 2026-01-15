<script lang="ts">
	import { goto } from '$app/navigation';
	import { SEO } from '@create-something/components';
	import SavvyCalButton from '$lib/components/SavvyCalButton.svelte';
	import { verticals, getExampleOutcomes, countAgents } from '$lib/agents';

	// Offering types
	type OfferingType = 'template' | 'service' | 'product';

	interface MatchedOffering {
		type: OfferingType;
		name: string;
		reason: string;
		redirect: string;
	}

	// Spec intake state
	let specInput = $state('');
	let isLoading = $state(false);
	let errorMessage = $state('');
	let clarifyingQuestions = $state<string[]>([]);
	let matchedOffering = $state<MatchedOffering | null>(null);

	// Handle spec submission
	async function handleSubmit() {
		if (!specInput.trim() || isLoading) return;

		isLoading = true;
		errorMessage = '';
		clarifyingQuestions = [];
		matchedOffering = null;

		try {
			const response = await fetch('/api/spec-intake', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ spec: specInput }),
			});

			if (!response.ok) {
				const data = (await response.json()) as { message?: string };
				throw new Error(data.message || 'Failed to process request');
			}

			const result = (await response.json()) as {
				action: 'show_offering' | 'clarify' | 'consultation';
				offering_type?: OfferingType;
				offering_name?: string;
				reason?: string;
				redirect?: string;
				questions?: string[];
			};

			switch (result.action) {
				case 'show_offering':
					matchedOffering = {
						type: result.offering_type || 'template',
						name: result.offering_name || '',
						reason: result.reason || '',
						redirect: result.redirect || '',
					};
					// No auto-redirect - let user click to proceed
					break;

				case 'clarify':
					clarifyingQuestions = result.questions || [];
					break;

				case 'consultation':
					goto(`/book?context=${encodeURIComponent(specInput.slice(0, 200))}`);
					break;
			}
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			isLoading = false;
		}
	}

	function useExample(prompt: string) {
		specInput = prompt;
	}

	// Get CTA text based on offering type
	function getCtaText(type: OfferingType): string {
		switch (type) {
			case 'service':
				return 'Learn more →';
			case 'product':
				return 'See details →';
			case 'template':
			default:
				return 'View template →';
		}
	}

	// Examples as data - Tufte: let the content speak
	// Covers templates, consulting, and products
	const examples = [
		{ prompt: 'Dental practice with online booking', result: 'dental-practice', type: 'template' },
		{ prompt: 'Automate our 10+ hours/week of manual data entry', result: 'automation', type: 'consulting' },
		{ prompt: 'Law firm with client intake', result: 'law-firm', type: 'template' },
		{ prompt: 'Train my team to build AI systems', result: 'transformation', type: 'consulting' },
	];

	const outcomes = getExampleOutcomes();
	const totalAgents = countAgents();
</script>

<SEO
	title="Software that works while you sleep"
	description="We build apps with agents, automate workflows, and train teams on AI. From ready-to-deploy templates to custom automation systems."
	keywords="AI agents, workflow automation, AI consulting, team AI training, dental practice website, law firm website, business automation"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<!-- Hero -->
<section class="hero">
	<div class="hero-content">
		<p class="hero-eyebrow">Apps + Agents</p>
		<h1 class="hero-title">We build software that keeps working after launch</h1>
		<p class="hero-subtitle">
			Not just a website. An app with automated workflows that recover missed appointments, follow up with leads, and handle the tasks you forget.
		</p>

		<form class="spec-input-container" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
			<label class="input-label" for="spec-input">What do you need built?</label>
			<textarea
				id="spec-input"
				class="spec-input"
				placeholder="A dental practice website... Automate our manual workflows... Train my team on AI..."
				rows="2"
				bind:value={specInput}
				disabled={isLoading}
				onkeydown={(e) => {
					if (e.key === 'Enter' && !e.shiftKey) {
						e.preventDefault();
						if (specInput.trim() && !isLoading) handleSubmit();
					}
				}}
			></textarea>
			<div class="input-footer">
				<span class="examples-hint">Try: Dental practice · Automate manual work · Train my team</span>
				<div class="submit-group">
					<button class="build-button" type="submit" disabled={isLoading || !specInput.trim()}>
						{#if isLoading}
							<span class="button-spinner"></span>
						{:else}
							Find a match
						{/if}
					</button>
					<span class="keyboard-hint">↵ Enter</span>
				</div>
			</div>
		</form>

		{#if errorMessage}
			<p class="error-message">{errorMessage}</p>
		{/if}

		{#if matchedOffering}
			<div class="match-result" data-type={matchedOffering.type}>
				<p class="match-text">
					{#if matchedOffering.type === 'service'}
						Recommended: <strong>{matchedOffering.name}</strong>
					{:else if matchedOffering.type === 'product'}
						Try: <strong>{matchedOffering.name}</strong>
					{:else}
						Found: <strong>{matchedOffering.name}</strong>
					{/if}
				</p>
				<p class="match-reason">{matchedOffering.reason}</p>
				<a href={matchedOffering.redirect} class="match-link">{getCtaText(matchedOffering.type)}</a>
			</div>
		{/if}

		{#if clarifyingQuestions.length > 0}
			<div class="clarify-container">
				<p class="clarify-heading">A few questions:</p>
				<ul class="clarify-questions">
					{#each clarifyingQuestions as question}
						<li>{question}</li>
					{/each}
				</ul>
				<p class="clarify-hint">Or <a href="/book">talk to us directly</a>.</p>
			</div>
		{/if}
	</div>
</section>

<!-- Value - Rams: state the outcome -->
<section class="value-section">
	<p class="value-statement">
		You get a production-ready app in days, not months.<br />
		Behind it, agents work around the clock—<br />
		<strong>so you hear "Your agents recovered $3,200 this month" instead of silence.</strong>
	</p>
</section>

<!-- Outcomes - Rams: the data is the design -->
<section class="outcomes-section">
	<h2 class="outcomes-heading">What agents actually do</h2>
	<div class="outcomes-list">
		{#each outcomes as outcome}
			<div class="outcome-item">
				<span class="outcome-what">{outcome.agent}</span>
				{#if outcome.metric}
					<span class="outcome-value">{outcome.metric}</span>
				{/if}
			</div>
		{/each}
	</div>
</section>

<!-- Templates - Rams: just show them -->
<section class="templates-section">
	<header class="section-header">
		<h2 class="section-heading">Pick your industry, we'll handle the rest</h2>
		<a href="/templates" class="section-link">See all templates →</a>
	</header>

	<div class="templates-grid">
		{#each verticals.slice(0, 6) as vertical}
			<a href="/templates/{vertical.slug}" class="template-card">
				<div class="template-header">
					<span class="template-name">{vertical.name}</span>
					<span class="template-agents">{vertical.agents.length} agents</span>
				</div>
				<p class="template-tagline">{vertical.tagline}</p>
			</a>
		{/each}
	</div>
</section>

<!-- CTA - Rams: one ask, Nicely Said: warm -->
<section class="cta-section">
	<h2 class="cta-heading">Ready when you are.</h2>
	<SavvyCalButton variant="primary" size="lg" />
</section>

<style>
	/* Tufte: Let typography and whitespace do the work */
	
	/* Hero - clean, focused */
	.hero {
		padding: var(--space-2xl) var(--space-xl);
		max-width: 800px;
		margin: 0 auto;
	}

	.hero-content {
		text-align: center;
	}

	.hero-eyebrow {
		font-size: var(--text-body-sm);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.hero-title {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
		line-height: var(--leading-tight);
		letter-spacing: -0.02em;
	}

	.hero-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-lg);
		line-height: var(--leading-relaxed);
		max-width: 42rem;
		margin-left: auto;
		margin-right: auto;
	}

	/* Input - functional, not decorative */
	.spec-input-container {
		margin-bottom: var(--space-lg);
		text-align: left;
	}

	.input-label {
		display: block;
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-xs);
	}

	.spec-input {
		width: 100%;
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		font-family: inherit;
		resize: none;
		outline: none;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.spec-input:focus {
		border-color: var(--color-fg-secondary);
	}

	.spec-input::placeholder {
		color: var(--color-fg-muted);
	}

	.input-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: var(--space-sm);
		gap: var(--space-md);
	}

	.examples-hint {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.build-button {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		white-space: nowrap;
	}

	.build-button:hover:not(:disabled) {
		opacity: 0.85;
	}

	.build-button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.submit-group {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.keyboard-hint {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		opacity: 0.6;
	}

	@media (max-width: 768px) {
		.keyboard-hint {
			display: none;
		}
	}

	.button-spinner {
		width: 14px;
		height: 14px;
		border: 2px solid currentColor;
		border-top-color: transparent;
		border-radius: var(--radius-full);
		animation: spin var(--duration-standard) linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Feedback states */
	.error-message {
		color: var(--color-error);
		font-size: var(--text-body-sm);
		margin-top: var(--space-sm);
	}

	.match-result {
		margin-top: var(--space-md);
		padding: var(--space-sm);
		background: var(--color-success-muted);
		border-left: 2px solid var(--color-success);
	}

	.match-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		text-transform: capitalize;
	}

	.match-reason {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		margin-top: var(--space-xs);
	}

	.match-link {
		display: inline-block;
		margin-top: var(--space-sm);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-success);
	}

	.match-link:hover {
		text-decoration: underline;
	}

	.clarify-container {
		margin-top: var(--space-md);
		padding: var(--space-sm);
		border-left: 2px solid var(--color-border-emphasis);
	}

	.clarify-heading {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.clarify-questions {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--space-xs);
	}

	.clarify-questions li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		padding-left: 1em;
		position: relative;
	}

	.clarify-questions li::before {
		content: '·';
		position: absolute;
		left: 0;
	}

	.clarify-hint {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.clarify-hint a {
		color: var(--color-fg-secondary);
	}

	/* Value - Rams: statement only */
	.value-section {
		padding: var(--space-2xl) var(--space-xl);
		text-align: center;
		border-top: 1px solid var(--color-border-default);
	}

	.value-statement {
		font-size: var(--text-h2);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		max-width: 600px;
		margin: 0 auto;
	}

	.value-statement strong {
		color: var(--color-fg-primary);
		display: block;
		margin-top: var(--space-sm);
	}

	/* Outcomes - Rams: data is design */
	.outcomes-section {
		padding: var(--space-2xl) var(--space-xl);
		border-top: 1px solid var(--color-border-default);
	}

	.outcomes-heading {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.outcomes-list {
		max-width: 600px;
		margin: 0 auto;
	}

	.outcome-item {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.outcome-item:last-child {
		border-bottom: none;
	}

	.outcome-what {
		font-size: var(--text-body-lg);
		color: var(--color-fg-primary);
	}

	.outcome-value {
		font-size: var(--text-body);
		font-family: var(--font-mono, monospace);
		color: var(--color-fg-secondary);
	}

	/* Section header (for templates) */
	.section-header {
		max-width: 900px;
		margin: 0 auto var(--space-xl);
		text-align: center;
	}

	.section-heading {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.section-link {
		display: inline-block;
		margin-top: var(--space-sm);
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.section-link:hover {
		color: var(--color-fg-primary);
	}

	/* Templates - compact grid */
	.templates-section {
		padding: var(--space-xl) var(--space-xl);
		border-top: 1px solid var(--color-border-default);
	}

	.templates-grid {
		max-width: 900px;
		margin: 0 auto;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1px;
		background: var(--color-border-default);
	}

	.template-card {
		padding: var(--space-md);
		background: var(--color-bg-pure);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.template-card:hover {
		background: var(--color-bg-surface);
	}

	.template-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: var(--space-xs);
	}

	.template-name {
		font-size: var(--text-h3);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.template-agents {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.template-tagline {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.5;
	}

	/* CTA - Rams: one ask */
	.cta-section {
		padding: var(--space-2xl) var(--space-xl);
		text-align: center;
		border-top: 1px solid var(--color-border-default);
	}

	.cta-heading {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-lg);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.hero {
			padding: var(--space-xl) var(--space-lg);
		}

		.value-statement {
			font-size: var(--text-h3);
		}

		.outcome-item {
			flex-direction: column;
			gap: var(--space-xs);
			align-items: flex-start;
		}

		.templates-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
