<script lang="ts">
	/**
	 * Services Page
	 * Overview of architecture services offered
	 */

	import { SEO } from '@create-something/components';
	import { config } from '$lib/config/runtime';
	import StructuredData from '$lib/components/StructuredData.svelte';
</script>

<SEO
	title="Services"
	description="Architecture, interiors, and custom furniture design. Full-service residential design from concept through construction."
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Services', url: '/services' }
	]}
/>
<StructuredData page="services" />

<main class="services-page">
	<section class="page-hero">
		<div class="container">
			<h1 class="page-title">Services</h1>
			<p class="page-subtitle">
				Comprehensive design from concept through completion
			</p>
		</div>
	</section>

	<section class="services-list">
		<div class="container">
			{#each $config.services as service, i}
				<article class="service-card" style="--delay: {i * 100}ms">
					<div class="service-number">
						{String(i + 1).padStart(2, '0')}
					</div>
					<div class="service-content">
						<h2 class="service-name">{service.name}</h2>
						<p class="service-description">{service.description}</p>
					</div>
				</article>
			{/each}
		</div>
	</section>

	<section class="approach-section">
		<div class="container">
			<h2 class="section-title">Approach</h2>
			<div class="approach-grid">
				{#each $config.studio.approach as principle, i}
					<div class="approach-item" style="--delay: {($config.services.length + i) * 100}ms">
						<p class="approach-text">{principle}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section class="cta-section">
		<div class="container">
			<h2 class="cta-title">Start a Project</h2>
			<p class="cta-text">
				Discuss your site, timeline, and vision with us.
			</p>
			<a href="/contact" class="cta-button">Get in Touch</a>
		</div>
	</section>
</main>

<style>
	.services-page {
		background: var(--color-bg-pure);
		min-height: 100vh;
	}

	.page-hero {
		padding: var(--space-2xl) var(--gutter);
		padding-top: calc(var(--space-2xl) + 80px);
		text-align: center;
		background: var(--color-bg-surface);
	}

	.container {
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.page-title {
		font-size: var(--text-display);
		font-weight: 300;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.page-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	/* Services List */
	.services-list {
		padding: var(--space-2xl) var(--gutter);
	}

	.service-card {
		display: grid;
		grid-template-columns: 60px 1fr;
		gap: var(--space-xl);
		padding: var(--space-xl) 0;
		border-bottom: 1px solid var(--color-border-default);
		animation: fadeIn 0.6s ease-out var(--delay) both;
	}

	.service-card:last-child {
		border-bottom: none;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.service-number {
		font-size: var(--text-body-sm);
		font-family: var(--font-mono);
		color: var(--color-fg-muted);
		padding-top: var(--space-xs);
	}

	.service-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.service-name {
		font-size: var(--text-h2);
		font-weight: 300;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.service-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin: 0;
		max-width: 65ch;
	}

	/* Approach Section */
	.approach-section {
		padding: var(--space-2xl) var(--gutter);
		background: var(--color-bg-elevated);
	}

	.section-title {
		font-size: var(--text-h3);
		font-weight: 300;
		margin: 0 0 var(--space-xl);
		text-align: center;
	}

	.approach-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-lg);
		max-width: 800px;
		margin: 0 auto;
	}

	.approach-item {
		padding: var(--space-lg);
		border: 1px solid var(--color-border-default);
		animation: fadeIn 0.6s ease-out var(--delay) both;
	}

	.approach-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0;
		line-height: var(--leading-relaxed);
	}

	/* CTA Section */
	.cta-section {
		padding: var(--space-2xl) var(--gutter);
		text-align: center;
	}

	.cta-title {
		font-size: var(--text-h2);
		font-weight: 300;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.cta-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-lg);
	}

	.cta-button {
		display: inline-block;
		padding: var(--space-sm) var(--space-xl);
		font-size: var(--text-body);
		color: var(--color-bg-pure);
		background: var(--color-fg-primary);
		border-radius: var(--radius-sm);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.cta-button:hover {
		background: var(--color-fg-secondary);
		transform: translateY(-2px);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.page-hero {
			padding: var(--space-xl) var(--space-md);
			padding-top: calc(var(--space-xl) + 60px);
		}

		.services-list,
		.approach-section,
		.cta-section {
			padding: var(--space-xl) var(--space-md);
		}

		.service-card {
			grid-template-columns: 40px 1fr;
			gap: var(--space-md);
			padding: var(--space-lg) 0;
		}

		.approach-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
