<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { getSiteConfigFromContext } from '$lib/config/context';
	import EthicsDisclaimer from '$lib/components/EthicsDisclaimer.svelte';
	import StructuredData from '$lib/components/StructuredData.svelte';

	const siteConfig = getSiteConfigFromContext();
</script>

<SEO
	title="About {siteConfig.name}"
	description={siteConfig.firm.philosophy}
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'About', url: '/about' }
	]}
/>
<StructuredData page="about" />

<div class="about-page">
	<!-- Page Header -->
	<section class="page-header">
		<div class="container">
			<h1>{siteConfig.firm.headline}</h1>
			<p class="lead">
				{siteConfig.firm.philosophy}
			</p>
		</div>
	</section>

	<!-- Mission Section -->
	<section class="mission-section">
		<div class="container">
			<div class="mission-grid">
				<div class="mission-content">
					<h2>Our Philosophy</h2>
					<p>
						{siteConfig.firm.philosophy}
					</p>
					<p>
						Founded in {siteConfig.firm.founded}, {siteConfig.name} has built a reputation for
						delivering results through skilled advocacy and personalized attention.
					</p>
				</div>
				<div class="mission-stats">
					<div class="stat">
						<span class="stat-value">{new Date().getFullYear() - siteConfig.firm.founded}+</span>
						<span class="stat-label">Years of Experience</span>
					</div>
					<div class="stat">
						<span class="stat-value">{siteConfig.attorneys.length}</span>
						<span class="stat-label">Attorneys</span>
					</div>
					<div class="stat">
						<span class="stat-value">{siteConfig.practiceAreas.length}</span>
						<span class="stat-label">Practice Areas</span>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Values Section -->
	<section class="values-section">
		<div class="container">
			<h2>Our Values</h2>
			<p class="section-lead">The principles that guide our practice.</p>

			<div class="values-grid">
				{#each siteConfig.firm.values as value}
					<article class="value-card">
						<h3>{value}</h3>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<!-- Bar Associations -->
	<section class="associations-section">
		<div class="container">
			<h2>Professional Memberships</h2>
			<div class="associations-list">
				{#each siteConfig.barAssociations as association}
					<span class="association-badge">{association}</span>
				{/each}
			</div>
		</div>
	</section>

	<!-- CTA -->
	<section class="cta-section">
		<div class="container">
			<div class="cta-content">
				<h2>Schedule a Consultation</h2>
				<p>Discuss your legal matter with an experienced attorney.</p>
				<a href="/contact" class="cta-button">Contact Us</a>
			</div>
		</div>
	</section>

	<EthicsDisclaimer />
</div>

<style>
	.about-page {
		background: var(--color-bg-pure);
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	/* Page Header */
	.page-header {
		padding: var(--space-2xl) 0 var(--space-xl);
		text-align: center;
		border-bottom: 1px solid var(--color-border-default);
	}

	.page-header h1 {
		font-size: var(--text-display);
		font-weight: 300;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
		letter-spacing: -0.02em;
	}

	.lead {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		max-width: 700px;
		margin: 0 auto;
		line-height: 1.6;
	}

	/* Mission Section */
	.mission-section {
		padding: var(--space-2xl) 0;
	}

	.mission-grid {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: var(--space-xl);
		align-items: start;
	}

	@media (max-width: 768px) {
		.mission-grid {
			grid-template-columns: 1fr;
		}
	}

	.mission-content h2 {
		font-size: var(--text-h1);
		font-weight: 300;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.mission-content p {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: 1.7;
		margin-bottom: var(--space-md);
	}

	.mission-stats {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	.stat {
		text-align: center;
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.stat:last-child {
		border-bottom: none;
	}

	.stat-value {
		display: block;
		font-size: var(--text-h1);
		font-weight: 300;
		color: var(--color-fg-primary);
	}

	.stat-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Values Section */
	.values-section {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-elevated);
	}

	.values-section h2 {
		font-size: var(--text-h1);
		font-weight: 300;
		color: var(--color-fg-primary);
		text-align: center;
		margin-bottom: var(--space-sm);
	}

	.section-lead {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	/* Golden Ratio Grid Layout
	 * φ = 1.618
	 * Featured value: ~61.8% (1.618fr)
	 * Secondary values: ~38.2% (1fr), stacked in 3 rows
	 */
	.values-grid {
		display: grid;
		grid-template-columns: 1.618fr 1fr;
		grid-template-rows: repeat(3, auto);
		gap: var(--space-md);
	}

	/* Featured value spans all 3 rows */
	.value-card:first-child {
		grid-row: 1 / 4;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 200px;
	}

	.value-card:first-child h3 {
		font-size: var(--text-h2);
	}

	/* Tablet: 2-column equal grid */
	@media (max-width: 768px) {
		.values-grid {
			grid-template-columns: 1fr 1fr;
			grid-template-rows: auto;
		}

		.value-card:first-child {
			grid-row: auto;
			min-height: auto;
		}

		.value-card:first-child h3 {
			font-size: var(--text-body);
		}
	}

	/* Mobile: single column */
	@media (max-width: 480px) {
		.values-grid {
			grid-template-columns: 1fr;
		}
	}

	.value-card {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
		text-align: center;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.value-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.value-card h3 {
		font-size: var(--text-body);
		font-weight: 500;
		color: var(--color-fg-primary);
		margin: 0;
	}

	/* Associations Section */
	.associations-section {
		padding: var(--space-2xl) 0;
	}

	.associations-section h2 {
		font-size: var(--text-h2);
		font-weight: 300;
		color: var(--color-fg-primary);
		text-align: center;
		margin-bottom: var(--space-lg);
	}

	.associations-list {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-sm);
	}

	.association-badge {
		padding: var(--space-xs) var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* CTA Section */
	.cta-section {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-elevated);
	}

	.cta-content {
		text-align: center;
		max-width: 600px;
		margin: 0 auto;
	}

	.cta-content h2 {
		font-size: var(--text-h2);
		font-weight: 300;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.cta-content p {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-lg);
	}

	.cta-button {
		display: inline-block;
		padding: var(--space-sm) var(--space-lg);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		text-decoration: none;
		border-radius: var(--radius-md);
		font-weight: 500;
		transition: opacity 0.2s;
	}

	.cta-button:hover {
		opacity: 0.9;
	}
</style>
