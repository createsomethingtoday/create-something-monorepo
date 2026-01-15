<script lang="ts">
	import { goto } from '$app/navigation';
	import { SEO } from '@create-something/components';
	import SavvyCalButton from '$lib/components/SavvyCalButton.svelte';
	import { verticals, getExampleOutcomes, countAgents } from '$lib/agents';

	// Spec intake state
	let specInput = $state('');
	let isLoading = $state(false);
	let errorMessage = $state('');
	let clarifyingQuestions = $state<string[]>([]);
	let matchedTemplate = $state<{ template: string; reason: string; redirect: string } | null>(null);

	// Handle spec submission
	async function handleSubmit() {
		if (!specInput.trim() || isLoading) return;

		isLoading = true;
		errorMessage = '';
		clarifyingQuestions = [];
		matchedTemplate = null;

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
				action: 'show_template' | 'clarify' | 'consultation';
				template?: string;
				reason?: string;
				redirect?: string;
				questions?: string[];
			};

			switch (result.action) {
				case 'show_template':
					matchedTemplate = {
						template: result.template || '',
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

	// Examples as data - Tufte: let the content speak
	const examples = [
		{ prompt: 'Dental practice with online booking', result: 'dental-practice', agents: 4 },
		{ prompt: 'Law firm with client intake', result: 'law-firm', agents: 4 },
		{ prompt: 'Restaurant with reservations', result: 'restaurant', agents: 2 },
		{ prompt: 'Sales CRM with lead tracking', result: 'crm', agents: 3 },
	];

	const outcomes = getExampleOutcomes();
	const totalAgents = countAgents();
</script>

<SEO
	title="Software that works while you sleep"
	description="We build apps with agents that recover revenue, qualify leads, and automate follow-ups. Not just a website—ongoing value."
	keywords="AI agents, workflow automation, dental practice website, law firm website, business automation"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<!-- Hero -->
<section class="hero">
	<div class="hero-content">
		<h1 class="hero-title">Software that works while you sleep</h1>
		<p class="hero-subtitle">
			Tell us what you need. We'll match you with an app and the agents to run it.
		</p>

		<form class="spec-input-container" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
			<label class="input-label" for="spec-input">What do you need built?</label>
			<textarea
				id="spec-input"
				class="spec-input"
				placeholder="A dental practice website with online booking..."
				rows="2"
				bind:value={specInput}
				disabled={isLoading}
			></textarea>
			<div class="input-footer">
				<span class="examples-hint">Try: {examples.map(e => e.prompt).slice(0, 2).join(' · ')}</span>
				<button class="build-button" type="submit" disabled={isLoading || !specInput.trim()}>
					{#if isLoading}
						<span class="button-spinner"></span>
					{:else}
						Find a match
					{/if}
				</button>
			</div>
		</form>

		{#if errorMessage}
			<p class="error-message">{errorMessage}</p>
		{/if}

		{#if matchedTemplate}
			<div class="match-result">
				<p class="match-text">Found: <strong>{matchedTemplate.template.replace(/-/g, ' ')}</strong></p>
				<p class="match-reason">{matchedTemplate.reason}</p>
				<a href={matchedTemplate.redirect} class="match-link">View template →</a>
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

<!-- Value proposition - Tufte: small multiples, data density -->
<section class="value-section">
	<div class="value-content">
		<div class="value-column">
			<h2 class="value-heading">The app</h2>
			<p class="value-text">Production-ready in days. Your brand, your domain, your data.</p>
		</div>
		<div class="value-divider">+</div>
		<div class="value-column">
			<h2 class="value-heading">The agents</h2>
			<p class="value-text">Automated workflows that recover revenue, follow up, and never forget.</p>
		</div>
		<div class="value-divider">=</div>
		<div class="value-column">
			<h2 class="value-heading">Ongoing value</h2>
			<p class="value-text">"Your agents recovered $3,200 this month." Real numbers, not vanity metrics.</p>
		</div>
	</div>
</section>

<!-- Outcomes - Tufte: let the data speak -->
<section class="outcomes-section">
	<header class="section-header">
		<h2 class="section-heading">What the agents do</h2>
		<p class="section-meta">{totalAgents} agents · {verticals.length} industries</p>
	</header>

	<div class="outcomes-table">
		{#each outcomes as outcome}
			<div class="outcome-row">
				<span class="outcome-vertical">{outcome.vertical}</span>
				<span class="outcome-agent">{outcome.agent}</span>
				<span class="outcome-result">{outcome.outcome}</span>
				{#if outcome.metric}
					<span class="outcome-metric">{outcome.metric}</span>
				{/if}
			</div>
		{/each}
	</div>
</section>

<!-- Templates - Tufte: information-rich, minimal decoration -->
<section class="templates-section">
	<header class="section-header">
		<h2 class="section-heading">Starting points</h2>
		<a href="/templates" class="section-link">View all →</a>
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

<!-- CTA - Tufte: clear, direct -->
<section class="cta-section">
	<p class="cta-text">Ready to see what agents can do for your business?</p>
	<div class="cta-actions">
		<SavvyCalButton variant="primary" size="md" />
		<span class="cta-divider">or</span>
		<a href="/templates" class="cta-link">browse templates</a>
	</div>
</section>

<!-- Attribution - subtle -->
<footer class="attribution">
	<p>Agents powered by <a href="https://workway.co" target="_blank" rel="noopener">WORKWAY</a></p>
</footer>

<style>
	/* Tufte: Let typography and whitespace do the work */
	
	/* Hero - clean, focused */
	.hero {
		padding: var(--space-2xl) var(--space-xl);
		max-width: 800px;
		margin: 0 auto;
	}

	.hero-content {
		text-align: left;
	}

	.hero-title {
		font-size: var(--text-display);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
		line-height: 1.1;
		letter-spacing: -0.02em;
	}

	.hero-subtitle {
		font-size: var(--text-h3);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-lg);
		line-height: 1.4;
	}

	/* Input - functional, not decorative */
	.spec-input-container {
		margin-bottom: var(--space-lg);
	}

	.input-label {
		display: block;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
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

	/* Value section - Tufte small multiples */
	.value-section {
		padding: var(--space-xl) var(--space-xl);
		border-top: 1px solid var(--color-border-default);
	}

	.value-content {
		max-width: 900px;
		margin: 0 auto;
		display: flex;
		align-items: flex-start;
		gap: var(--space-md);
	}

	.value-column {
		flex: 1;
	}

	.value-divider {
		color: var(--color-fg-muted);
		font-size: var(--text-h2);
		padding-top: var(--space-sm);
	}

	.value-heading {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.value-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.5;
	}

	/* Outcomes - Tufte table thinking */
	.outcomes-section {
		padding: var(--space-xl) var(--space-xl);
	}

	.section-header {
		max-width: 900px;
		margin: 0 auto var(--space-lg);
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.section-heading {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.section-meta {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
	}

	.section-link {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.section-link:hover {
		color: var(--color-fg-primary);
	}

	.outcomes-table {
		max-width: 900px;
		margin: 0 auto;
	}

	.outcome-row {
		display: grid;
		grid-template-columns: 120px 1fr 1fr auto;
		gap: var(--space-md);
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--color-border-default);
		align-items: baseline;
	}

	.outcome-row:last-child {
		border-bottom: none;
	}

	.outcome-vertical {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.outcome-agent {
		font-size: var(--text-h3);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.outcome-result {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.outcome-metric {
		font-size: var(--text-body-sm);
		font-family: var(--font-mono, monospace);
		color: var(--color-fg-secondary);
		background: var(--color-bg-surface);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
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

	/* CTA - quiet confidence */
	.cta-section {
		padding: var(--space-xl) var(--space-xl);
		text-align: center;
		border-top: 1px solid var(--color-border-default);
	}

	.cta-text {
		font-size: var(--text-h2);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-lg);
	}

	.cta-actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-md);
	}

	.cta-divider {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
	}

	.cta-link {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.cta-link:hover {
		color: var(--color-fg-primary);
	}

	/* Attribution */
	.attribution {
		padding: var(--space-lg) var(--space-xl);
		text-align: center;
	}

	.attribution p {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.attribution a {
		color: var(--color-fg-secondary);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.hero {
			padding: var(--space-xl) var(--space-lg);
		}

		.value-content {
			flex-direction: column;
			gap: var(--space-lg);
		}

		.value-divider {
			display: none;
		}

		.outcome-row {
			grid-template-columns: 1fr;
			gap: var(--space-xs);
		}

		.templates-grid {
			grid-template-columns: 1fr;
		}

		.section-header {
			flex-direction: column;
			gap: var(--space-xs);
		}
	}
</style>
