<script lang="ts">
	import { SEO } from '@create-something/components';
	import TextRevelation from '$lib/components/TextRevelation.svelte';
	import SocialProofStrip from '$lib/components/SocialProofStrip.svelte';
	import SavvyCalButton from '$lib/components/SavvyCalButton.svelte';

	const services = [
		{
			title: 'Agentic Systems',
			metric: '155 → 13 scripts',
			description: 'AI that runs your operations. Not chatbots—agents that make decisions while you sleep.',
			href: '/services/agentic-systems'
		},
		{
			title: 'Web Platforms',
			metric: '3 weeks to production',
			description: 'Fast sites on Cloudflare edge. Sub-100ms response, zero maintenance.',
			href: '/services/web-development'
		},
		{
			title: 'Workflow Automation',
			metric: '60-70% time savings',
			description: 'Manual work becomes automated. We measure the hours saved.',
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
	description="We build AI systems that run your business autonomously. From web development to automation workflows to long-running AI agents. Systematic approach with measured outcomes."
	keywords="agentic systems, AI automation, autonomous systems, Cloudflare Workers, Claude Code, web development, AI agents"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<!-- Act 1: The Revelation -->
<TextRevelation />

<!-- Social Proof: Case study metrics -->
<SocialProofStrip />

<!-- Act 2: What We Do -->
<section class="services-section">
	<div class="services-grid highlight-grid">
		{#each services as service, i}
			<a href={service.href} class="service-card highlight-item" style="--index: {i}">
				<span class="service-metric">{service.metric}</span>
				<h3 class="service-title">{service.title}</h3>
				<p class="service-description">{service.description}</p>
				<span class="service-arrow">→</span>
			</a>
		{/each}
	</div>
</section>

<!-- Act 3: How We Think -->
<section class="principles-section">
	<h2 class="principles-heading">How We Work</h2>
	<p class="principles-subtext">Three questions before every decision.</p>

	<div class="principles-list highlight-flex">
		{#each principles as principle, i}
			<div class="principle highlight-item" style="--index: {i}">
				<span class="principle-number">{i + 1}</span>
				<div class="principle-content">
					<p class="principle-question">{principle.question}</p>
					<p class="principle-answer">{principle.answer}</p>
				</div>
			</div>
		{/each}
	</div>
</section>

<!-- Ecosystem: Where This Comes From -->
<section class="ecosystem-section">
	<div class="ecosystem-container">
		<p class="ecosystem-label">How We Work</p>
		<h2 class="ecosystem-heading">Research-backed. Measured outcomes.</h2>
		<p class="ecosystem-description">
			Every approach is tested first. We publish what works (and what doesn't) so you can verify the method before hiring us.
		</p>

		<div class="ecosystem-grid highlight-grid">
			<a href="https://createsomething.io" class="ecosystem-card highlight-item" style="--index: 0" target="_blank" rel="noopener">
				<span class="property-tag">.io</span>
				<h3 class="property-name">Research</h3>
				<p class="property-desc">47 experiments published. Real metrics: time, cost, errors. See what worked.</p>
			</a>

			<a href="https://createsomething.space" class="ecosystem-card highlight-item" style="--index: 1" target="_blank" rel="noopener">
				<span class="property-tag">.space</span>
				<h3 class="property-name">Practice</h3>
				<p class="property-desc">Learn the same patterns we use. Tutorials that show you how to build it yourself.</p>
			</a>

			<a href="https://createsomething.ltd/patterns/crystallization" class="ecosystem-card highlight-item" style="--index: 2" target="_blank" rel="noopener">
				<span class="property-tag">.ltd</span>
				<h3 class="property-name">Principles</h3>
				<p class="property-desc">Rooted in Rams' design discipline: "Less, but better." The philosophy behind the work.</p>
			</a>
		</div>
	</div>
</section>

<!-- Act 4: The Invitation -->
<section class="cta-section">
	<p class="cta-text">Ready to subtract?</p>
	<div class="cta-buttons">
		<SavvyCalButton variant="primary" size="lg" />
		<a href="/discover" class="cta-secondary">
			or take the assessment
			<span class="cta-arrow">→</span>
		</a>
	</div>
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
		transition: all var(--duration-micro) var(--ease-standard);
		/* Cascade entrance */
		opacity: 0;
		animation: cardReveal var(--duration-standard) var(--ease-standard) forwards;
		animation-delay: calc(var(--index, 0) * var(--cascade-step));
	}

	.service-card:hover {
		transform: scale(var(--scale-micro));
		border-color: var(--color-border-emphasis);
		background: var(--color-bg-elevated);
	}

	.service-card:active {
		transform: scale(var(--scale-subtle));
	}

	.service-metric {
		display: block;
		font-size: var(--text-body-sm);
		font-family: monospace;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
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
		/* Cascade entrance */
		opacity: 0;
		animation: principleReveal var(--duration-standard) var(--ease-standard) forwards;
		animation-delay: calc(var(--index, 0) * var(--cascade-group));
	}

	@keyframes principleReveal {
		from {
			opacity: 0;
			transform: translateX(-16px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
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

	/* Ecosystem Section */
	.ecosystem-section {
		padding: var(--space-2xl) var(--space-xl);
		border-top: 1px solid var(--color-border-default);
	}

	.ecosystem-container {
		max-width: 1000px;
		margin: 0 auto;
		text-align: center;
	}

	.ecosystem-label {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.ecosystem-heading {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.ecosystem-description {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		max-width: 600px;
		margin: 0 auto var(--space-xl);
	}

	.ecosystem-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-lg);
	}

	.ecosystem-card {
		display: block;
		padding: var(--space-lg);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-align: left;
		transition: all var(--duration-micro) var(--ease-standard);
		/* Cascade entrance */
		opacity: 0;
		animation: cardReveal var(--duration-standard) var(--ease-standard) forwards;
		animation-delay: calc(var(--index, 0) * var(--cascade-step));
	}

	.ecosystem-card:hover {
		transform: scale(var(--scale-micro));
		border-color: var(--color-border-emphasis);
		background: var(--color-bg-surface);
	}

	.ecosystem-card:active {
		transform: scale(var(--scale-subtle));
	}

	.property-tag {
		font-size: var(--text-caption);
		font-family: monospace;
		color: var(--color-fg-muted);
	}

	.property-name {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: var(--space-xs) 0;
	}

	.property-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
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
		.cta-section,
		.ecosystem-section {
			padding: var(--space-xl) var(--space-lg);
		}

		.ecosystem-grid {
			grid-template-columns: 1fr;
		}
	}

	/* Shared keyframe for card reveals */
	@keyframes cardReveal {
		from {
			opacity: 0;
			transform: translateY(16px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.service-card,
		.principle,
		.ecosystem-card {
			animation: none;
			opacity: 1;
		}
	}
</style>
