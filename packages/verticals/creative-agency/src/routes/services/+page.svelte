<script lang="ts">
	import { SEO } from '@create-something/components';
	import { config } from '$lib/config/runtime';
</script>

<SEO
	title="Services"
	description="What we do: Brand Strategy, Visual Identity, and Digital Experience."
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Services', url: '/services' }
	]}
/>

<!-- Hero -->
<section class="hero">
	<div class="hero-content">
		<h1 class="hero-title">What We Do</h1>
		<p class="hero-description">
			Strategy, identity, and digital experiences for companies ready to lead.
		</p>
	</div>
</section>

<!-- Services Grid -->
<section class="services section">
	<div class="services-grid">
		{#each $config.services as service, i}
			<div class="service-card">
				<span class="service-number">{String(i + 1).padStart(2, '0')}</span>
				<h2 class="service-name">{service.name}</h2>
				<p class="service-description">{service.description}</p>
				<ul class="service-includes">
					{#each service.includes as item}
						<li>{item}</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>
</section>

<!-- Process -->
<section class="process section">
	<div class="section-header">
		<h2 class="section-title">How We Work</h2>
	</div>

	<div class="process-grid">
		<div class="process-step">
			<span class="step-number">01</span>
			<h3 class="step-title">Discover</h3>
			<p class="step-description">
				We immerse ourselves in your business, market, and competition.
				Every great brand starts with understanding.
			</p>
		</div>
		<div class="process-step">
			<span class="step-number">02</span>
			<h3 class="step-title">Define</h3>
			<p class="step-description">
				We distill insights into a clear strategic direction.
				Positioning, messaging, and creative territories that set you apart.
			</p>
		</div>
		<div class="process-step">
			<span class="step-number">03</span>
			<h3 class="step-title">Design</h3>
			<p class="step-description">
				We craft every touchpoint with intention.
				From logo to website, every detail serves the strategy.
			</p>
		</div>
		<div class="process-step">
			<span class="step-number">04</span>
			<h3 class="step-title">Deliver</h3>
			<p class="step-description">
				We hand off a complete system you can use forever.
				Guidelines, assets, and ongoing support as needed.
			</p>
		</div>
	</div>
</section>

<!-- CTA -->
<section class="cta section">
	<div class="cta-content">
		<h2 class="cta-title">Ready to start?</h2>
		<p class="cta-description">
			Tell us about your project. We'll get back to you within 24 hours.
		</p>
		<a href="/contact" class="btn-primary btn-lg">Start a Project</a>
	</div>
</section>

<style>
	/* Hero */
	.hero {
		padding: var(--space-3xl) var(--gutter) var(--space-2xl);
	}

	.hero-content {
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.hero-title {
		font-size: var(--text-display);
		font-weight: 700;
		letter-spacing: var(--tracking-tight);
		margin-bottom: var(--space-md);
	}

	.hero-description {
		font-size: var(--text-h3);
		color: var(--color-fg-secondary);
		max-width: 50ch;
	}

	/* Services */
	.services-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-lg);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.service-card {
		padding: var(--space-xl);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.service-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.service-number {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-family: var(--font-mono);
	}

	.service-name {
		font-size: var(--text-h2);
		font-weight: 600;
		margin: var(--space-sm) 0;
	}

	.service-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-lg);
	}

	.service-includes {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.service-includes li {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
	}

	/* Process */
	.section-header {
		max-width: var(--content-width);
		margin: 0 auto var(--space-xl);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 600;
	}

	.process-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-lg);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.process-step {
		padding: var(--space-lg);
		border-left: 1px solid var(--color-border-default);
	}

	.step-number {
		font-size: var(--text-display);
		font-weight: 700;
		color: var(--color-fg-subtle);
		display: block;
		margin-bottom: var(--space-md);
	}

	.step-title {
		font-size: var(--text-h3);
		font-weight: 600;
		margin-bottom: var(--space-sm);
	}

	.step-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	/* CTA */
	.cta {
		background: var(--color-bg-surface);
		text-align: center;
	}

	.cta-content {
		max-width: var(--content-narrow);
		margin: 0 auto;
	}

	.cta-title {
		font-size: var(--text-h1);
		margin-bottom: var(--space-sm);
	}

	.cta-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-lg);
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.services-grid {
			grid-template-columns: 1fr;
		}

		.process-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.process-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
