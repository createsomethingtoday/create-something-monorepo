<script lang="ts">
	import SEO from '$lib/components/SEO.svelte';
	import TextRevelation from '$lib/components/TextRevelation.svelte';

	const services = [
		{
			title: 'Agentic Systems',
			description: 'AI that runs autonomously. Not chatbots—agents that process 500+ decisions while you sleep.',
			href: '/services/agentic-systems'
		},
		{
			title: 'Web Platforms',
			description: 'Sub-100ms response times. Cloudflare edge. No frameworks, no bloat.',
			href: '/services/web-development'
		},
		{
			title: 'Workflow Automation',
			description: 'Manual processes become autonomous. 60-70% time savings, measured.',
			href: '/services/automation'
		}
	];

	const principles = [
		{
			question: 'Have I built this before?',
			answer: 'Unify'
		},
		{
			question: 'Does this earn its existence?',
			answer: 'Remove'
		},
		{
			question: 'Does this serve the whole?',
			answer: 'Reconnect'
		}
	];
</script>

<SEO
	title="Agentic Systems Engineering"
	description="We build AI systems that run your business autonomously. From web development to automation workflows to long-running AI agents. Research-backed agentic engineering."
	keywords="agentic systems, AI automation, autonomous systems, Cloudflare Workers, Claude Code, web development, AI agents"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<!-- Act 1: The Revelation -->
<TextRevelation />

<!-- Act 2: What We Do -->
<section class="services-section">
	<div class="services-grid">
		{#each services as service}
			<a href={service.href} class="service-card">
				<h3 class="service-title">{service.title}</h3>
				<p class="service-description">{service.description}</p>
				<span class="service-arrow">→</span>
			</a>
		{/each}
	</div>
</section>

<!-- Act 3: How We Think -->
<section class="principles-section">
	<h2 class="principles-heading">The Subtractive Triad</h2>
	<p class="principles-subtext">Three questions. One discipline.</p>

	<div class="principles-list">
		{#each principles as principle, i}
			<div class="principle">
				<span class="principle-number">{i + 1}</span>
				<div class="principle-content">
					<p class="principle-question">{principle.question}</p>
					<p class="principle-answer">{principle.answer}</p>
				</div>
			</div>
		{/each}
	</div>
</section>

<!-- Act 4: The Invitation -->
<section class="cta-section">
	<p class="cta-text">Ready to subtract?</p>
	<a href="/contact" class="cta-button">
		Start a conversation
		<span class="cta-arrow">→</span>
	</a>
</section>

<style>
	/* Services Section */
	.services-section {
		padding: var(--space-2xl) var(--space-xl);
		border-top: 1px solid var(--color-border-default);
	}

	.services-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-lg);
		max-width: 1200px;
		margin: 0 auto;
	}

	.service-card {
		display: flex;
		flex-direction: column;
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		transition: border-color var(--duration-standard) var(--ease-standard),
					background var(--duration-standard) var(--ease-standard);
	}

	.service-card:hover {
		border-color: var(--color-border-emphasis);
		background: var(--color-bg-elevated);
	}

	.service-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.service-description {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
		flex-grow: 1;
	}

	.service-arrow {
		font-size: var(--text-h3);
		color: var(--color-fg-muted);
		margin-top: var(--space-md);
		transition: transform var(--duration-micro) var(--ease-standard),
					color var(--duration-micro) var(--ease-standard);
	}

	.service-card:hover .service-arrow {
		transform: translateX(4px);
		color: var(--color-fg-primary);
	}

	/* Principles Section */
	.principles-section {
		padding: var(--space-2xl) var(--space-xl);
		text-align: center;
		border-top: 1px solid var(--color-border-default);
	}

	.principles-heading {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.principles-subtext {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xl);
	}

	.principles-list {
		display: flex;
		justify-content: center;
		gap: var(--space-2xl);
		max-width: 900px;
		margin: 0 auto;
	}

	.principle {
		display: flex;
		align-items: flex-start;
		gap: var(--space-md);
		text-align: left;
	}

	.principle-number {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-muted);
		line-height: 1;
	}

	.principle-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.principle-question {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		font-style: italic;
	}

	.principle-answer {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	/* CTA Section */
	.cta-section {
		padding: var(--space-2xl) var(--space-xl);
		text-align: center;
		border-top: 1px solid var(--color-border-default);
	}

	.cta-text {
		font-size: var(--text-h2);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-lg);
	}

	.cta-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5em;
		padding: var(--space-sm) var(--space-lg);
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		color: var(--color-bg-pure);
		background: var(--color-fg-primary);
		border-radius: var(--radius-full);
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.cta-button:hover {
		opacity: 0.9;
	}

	.cta-arrow {
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.cta-button:hover .cta-arrow {
		transform: translateX(4px);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.services-grid {
			grid-template-columns: 1fr;
		}

		.principles-list {
			flex-direction: column;
			align-items: center;
			gap: var(--space-lg);
		}

		.principle {
			max-width: 280px;
		}

		.services-section,
		.principles-section,
		.cta-section {
			padding: var(--space-xl) var(--space-lg);
		}
	}
</style>
