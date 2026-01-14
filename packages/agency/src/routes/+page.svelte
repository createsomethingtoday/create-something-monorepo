<script lang="ts">
	import { SEO } from '@create-something/components';
	import SavvyCalButton from '$lib/components/SavvyCalButton.svelte';
	import { verticals, getExampleOutcomes, countAgents } from '$lib/agents';

	// Scrolling examples - mix of verticals showing both app AND agents
	const examples = [
		{
			prompt: 'I need a website for my dental practice with appointment booking',
			vertical: 'Dental Practice',
			agents: ['No-show recovery', 'Insurance verification', 'Recall automation'],
		},
		{
			prompt: 'My law firm needs a site with client intake and consultation scheduling',
			vertical: 'Law Firm',
			agents: ['Lead qualification', 'Deadline tracking', 'Client follow-up'],
		},
		{
			prompt: 'I need a CRM to manage leads and follow-ups for my sales team',
			vertical: 'CRM',
			agents: ['Lead scoring', 'Follow-up automation', 'Pipeline alerts'],
		},
		{
			prompt: 'My restaurant needs a website with online reservations',
			vertical: 'Restaurant',
			agents: ['Reservation reminders', 'Review requests'],
		},
		{
			prompt: 'I need inventory management for my warehouse',
			vertical: 'Inventory',
			agents: ['Auto-reorder', 'Demand forecasting'],
		},
	];

	const outcomes = getExampleOutcomes();
	const totalAgents = countAgents();

	// Subtractive Triad
	const triad = [
		{ question: 'Have I built this before?', answer: 'DRY', action: 'Unify' },
		{ question: 'Does this earn its existence?', answer: 'Rams', action: 'Remove' },
		{ question: 'Does this serve the whole?', answer: 'Heidegger', action: 'Reconnect' },
	];
</script>

<SEO
	title="Apps + Agents That Keep Working"
	description="We don't just build your app. We deploy agents that keep delivering value—recovering revenue, qualifying leads, and automating follow-ups. Powered by WORKWAY."
	keywords="AI agents, workflow automation, WORKWAY, dental practice website, law firm website, CRM automation, agentic systems"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<!-- Hero: Apps + Agents -->
<section class="hero">
	<div class="hero-content">
		<h1 class="hero-title">Apps that keep working</h1>
		<p class="hero-subtitle">
			We don't just build your app. We deploy agents that keep delivering value.
		</p>

		<div class="spec-input-container">
			<textarea
				class="spec-input"
				placeholder="I need a dental practice website with appointment booking and patient reminders..."
				rows="3"
			></textarea>
			<button class="build-button">Build it</button>
		</div>

		<p class="hero-note">
			Every build includes agents powered by <a href="https://workway.co" target="_blank" rel="noopener">WORKWAY</a>
		</p>
	</div>
</section>

<!-- Scrolling Examples (Aboard-style) -->
<section class="examples-section">
	<div class="examples-track">
		{#each [...examples, ...examples] as example, i}
			<div class="example-card">
				<p class="example-prompt">"{example.prompt}"</p>
				<div class="example-result">
					<span class="result-vertical">{example.vertical}</span>
					<span class="result-plus">+</span>
					<span class="result-agents">{example.agents.length} agents</span>
				</div>
			</div>
		{/each}
	</div>
</section>

<!-- What You Get -->
<section class="what-you-get">
	<h2 class="section-heading">What you get</h2>
	<p class="section-subtext">App + Agents that keep working after launch</p>

	<div class="benefits-grid">
		<div class="benefit-card app-benefit">
			<span class="benefit-icon">🌐</span>
			<h3 class="benefit-title">Beautiful App</h3>
			<p class="benefit-description">
				Production-ready website or ops tool. Launches in days, not months. Canon design system.
			</p>
		</div>

		<div class="benefit-card agents-benefit">
			<span class="benefit-icon">🤖</span>
			<h3 class="benefit-title">Agents That Keep Working</h3>
			<p class="benefit-description">
				Workflows that run 24/7. Recover no-shows. Qualify leads. Send reminders. Verify insurance.
			</p>
		</div>

		<div class="benefit-card analytics-benefit">
			<span class="benefit-icon">📊</span>
			<h3 class="benefit-title">Measurable Value</h3>
			<p class="benefit-description">
				"Your agents recovered $3,200 this month." Not vanity metrics—actual revenue impact.
			</p>
		</div>
	</div>
</section>

<!-- Outcomes Showcase -->
<section class="outcomes-section">
	<h2 class="section-heading">Real outcomes</h2>
	<p class="section-subtext">{totalAgents} agents across {verticals.length} verticals</p>

	<div class="outcomes-grid">
		{#each outcomes as outcome}
			<div class="outcome-card">
				<span class="outcome-vertical">{outcome.vertical}</span>
				<p class="outcome-agent">{outcome.agent}</p>
				<p class="outcome-result">{outcome.outcome}</p>
				{#if outcome.metric}
					<span class="outcome-metric">{outcome.metric}</span>
				{/if}
			</div>
		{/each}
	</div>
</section>

<!-- Methodology Differentiator -->
<section class="methodology-section">
	<div class="methodology-container">
		<h2 class="section-heading">Not just code, not just vibes</h2>
		<p class="section-subtext">
			Every decision evaluated against the Subtractive Triad
		</p>

		<div class="triad-grid">
			{#each triad as level, i}
				<div class="triad-card">
					<span class="triad-number">{i + 1}</span>
					<p class="triad-question">{level.question}</p>
					<p class="triad-answer">{level.answer}</p>
					<p class="triad-action">→ {level.action}</p>
				</div>
			{/each}
		</div>

		<p class="methodology-note">
			Methodology you can see. Outcomes you can measure.
		</p>
	</div>
</section>

<!-- Verticals Grid -->
<section class="verticals-section">
	<h2 class="section-heading">Choose your starting point</h2>
	<p class="section-subtext">Pre-built apps with agents included</p>

	<div class="verticals-grid">
		{#each verticals.slice(0, 6) as vertical}
			<a href="/templates/{vertical.slug}" class="vertical-card">
				<span class="vertical-icon">{vertical.icon}</span>
				<h3 class="vertical-name">{vertical.name}</h3>
				<p class="vertical-tagline">{vertical.tagline}</p>
				<span class="vertical-agents">{vertical.agents.length} agents included</span>
			</a>
		{/each}
	</div>

	<a href="/templates" class="view-all-link">View all templates →</a>
</section>

<!-- CTA -->
<section class="cta-section">
	<h2 class="cta-heading">Ready for apps that keep working?</h2>
	<div class="cta-buttons">
		<SavvyCalButton variant="primary" size="lg" />
		<a href="/templates" class="cta-secondary">
			or browse templates
			<span class="cta-arrow">→</span>
		</a>
	</div>
</section>

<style>
	/* Hero */
	.hero {
		padding: var(--space-3xl) var(--space-xl);
		text-align: center;
		min-height: 60vh;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.hero-content {
		max-width: 700px;
	}

	.hero-title {
		font-size: clamp(2.5rem, 6vw, 4rem);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
		line-height: 1.1;
	}

	.hero-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xl);
	}

	.spec-input-container {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
		margin-bottom: var(--space-md);
	}

	.spec-input {
		width: 100%;
		background: transparent;
		border: none;
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		resize: none;
		outline: none;
		font-family: inherit;
	}

	.spec-input::placeholder {
		color: var(--color-fg-muted);
	}

	.build-button {
		width: 100%;
		padding: var(--space-md) var(--space-lg);
		background: var(--color-fg-primary);
		color: var(--color-bg-primary);
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.build-button:hover {
		opacity: 0.9;
	}

	.hero-note {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.hero-note a {
		color: var(--color-fg-secondary);
		text-decoration: underline;
	}

	/* Scrolling Examples */
	.examples-section {
		padding: var(--space-xl) 0;
		border-top: 1px solid var(--color-border-default);
		border-bottom: 1px solid var(--color-border-default);
		overflow: hidden;
	}

	.examples-track {
		display: flex;
		gap: var(--space-lg);
		animation: scroll 30s linear infinite;
	}

	@keyframes scroll {
		0% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(-50%);
		}
	}

	.example-card {
		flex-shrink: 0;
		width: 350px;
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.example-prompt {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		font-style: italic;
		margin-bottom: var(--space-md);
	}

	.example-result {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.result-vertical {
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.result-plus {
		color: var(--color-fg-muted);
	}

	.result-agents {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* What You Get */
	.what-you-get {
		padding: var(--space-2xl) var(--space-xl);
		text-align: center;
	}

	.section-heading {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.section-subtext {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xl);
	}

	.benefits-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-lg);
		max-width: 1000px;
		margin: 0 auto;
	}

	.benefit-card {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-align: left;
	}

	.benefit-icon {
		font-size: 2rem;
		display: block;
		margin-bottom: var(--space-md);
	}

	.benefit-title {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.benefit-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
	}

	/* Outcomes */
	.outcomes-section {
		padding: var(--space-2xl) var(--space-xl);
		text-align: center;
		border-top: 1px solid var(--color-border-default);
	}

	.outcomes-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-md);
		max-width: 1200px;
		margin: 0 auto;
	}

	.outcome-card {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		text-align: left;
	}

	.outcome-vertical {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.outcome-agent {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: var(--space-xs) 0;
	}

	.outcome-result {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.outcome-metric {
		display: inline-block;
		margin-top: var(--space-sm);
		font-size: var(--text-caption);
		font-family: monospace;
		color: var(--color-fg-secondary);
		background: var(--color-bg-elevated);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
	}

	/* Methodology */
	.methodology-section {
		padding: var(--space-2xl) var(--space-xl);
		border-top: 1px solid var(--color-border-default);
	}

	.methodology-container {
		max-width: 900px;
		margin: 0 auto;
		text-align: center;
	}

	.triad-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-lg);
		margin: var(--space-xl) 0;
	}

	.triad-card {
		padding: var(--space-lg);
		text-align: left;
	}

	.triad-number {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-muted);
		opacity: 0.3;
	}

	.triad-question {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		font-style: italic;
		margin: var(--space-sm) 0;
	}

	.triad-answer {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.triad-action {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-top: var(--space-xs);
	}

	.methodology-note {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
	}

	/* Verticals */
	.verticals-section {
		padding: var(--space-2xl) var(--space-xl);
		text-align: center;
		border-top: 1px solid var(--color-border-default);
	}

	.verticals-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-lg);
		max-width: 1000px;
		margin: 0 auto var(--space-xl);
	}

	.vertical-card {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-align: left;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.vertical-card:hover {
		transform: scale(1.02);
		border-color: var(--color-border-emphasis);
	}

	.vertical-icon {
		font-size: 2rem;
		display: block;
		margin-bottom: var(--space-sm);
	}

	.vertical-name {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.vertical-tagline {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin: var(--space-xs) 0;
	}

	.vertical-agents {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.view-all-link {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.view-all-link:hover {
		color: var(--color-fg-primary);
	}

	/* CTA */
	.cta-section {
		padding: var(--space-3xl) var(--space-xl);
		text-align: center;
		border-top: 1px solid var(--color-border-default);
	}

	.cta-heading {
		font-size: var(--text-h2);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-lg);
	}

	.cta-buttons {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
	}

	.cta-secondary {
		display: inline-flex;
		align-items: center;
		gap: 0.5em;
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.cta-secondary:hover {
		color: var(--color-fg-primary);
	}

	.cta-arrow {
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.cta-secondary:hover .cta-arrow {
		transform: translateX(4px);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.benefits-grid,
		.triad-grid,
		.verticals-grid {
			grid-template-columns: 1fr;
		}

		.outcomes-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.hero,
		.what-you-get,
		.outcomes-section,
		.methodology-section,
		.verticals-section,
		.cta-section {
			padding: var(--space-xl) var(--space-lg);
		}
	}

	@media (max-width: 480px) {
		.outcomes-grid {
			grid-template-columns: 1fr;
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.examples-track {
			animation: none;
		}
	}
</style>
