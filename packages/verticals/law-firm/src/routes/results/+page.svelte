<script lang="ts">
	/**
	 * Results Page
	 * Anonymized case outcomes as trust signals
	 */

	import { SEO } from '@create-something/canon';
	import { getSiteConfigFromContext } from '$lib/config/context';
	import EthicsDisclaimer from '$lib/components/EthicsDisclaimer.svelte';

	const siteConfig = getSiteConfigFromContext();
	const { results, practiceAreas, name } = siteConfig;

	// Get practice area name from slug
	function getPracticeAreaName(slug: string): string {
		const area = practiceAreas.find((a) => a.slug === slug);
		return area?.name || slug;
	}

	// Group results by practice area
	const resultsByArea = practiceAreas.map((area) => ({
		area,
		results: results.filter((r) => r.practiceArea === area.slug)
	})).filter((group) => group.results.length > 0);
</script>

<SEO
	title="Case Results"
	description="A selection of representative case outcomes. Prior results do not guarantee a similar outcome."
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Results', url: '/results' }
	]}
/>

<main class="results-page">
	<section class="page-hero">
		<div class="container">
			<h1 class="page-title">Representative Results</h1>
			<p class="page-subtitle">
				A selection of outcomes we've achieved for our clients.
			</p>
		</div>
	</section>

	<section class="results-content">
		<div class="container">
			{#each resultsByArea as { area, results }}
				<div class="results-section">
					<h2 class="section-title">
						<a href="/practice-areas/{area.slug}">{area.name}</a>
					</h2>

					<div class="results-grid">
						{#each results as result}
							<article class="result-card">
								<div class="result-header">
									<span class="result-year">{result.year}</span>
								</div>
								<h3 class="result-title">{result.title}</h3>
								<p class="result-outcome">{result.outcome}</p>
								<p class="result-description">{result.description}</p>
							</article>
						{/each}
					</div>
				</div>
			{/each}

			<div class="results-disclaimer-box">
				<h3 class="disclaimer-title">Important Notice</h3>
				<p class="disclaimer-text">
					Prior results do not guarantee a similar outcome. Every case is different,
					and outcomes depend on the specific facts and circumstances of each matter.
					The results listed above are not intended as a guarantee, warranty, or
					prediction regarding the outcome of your legal matter.
				</p>
			</div>
		</div>
	</section>

	<section class="cta-section">
		<div class="container">
			<h2 class="cta-title">Ready to Discuss Your Case?</h2>
			<p class="cta-text">
				Contact us for a free consultation to learn how we can help.
			</p>
			<div class="cta-buttons">
				<a href="/schedule" class="cta-button primary">Schedule Consultation</a>
				<a href="/contact" class="cta-button secondary">Contact Us</a>
			</div>
		</div>
	</section>

	<EthicsDisclaimer />
</main>

<style>
	.results-page {
		background: var(--color-bg-pure);
		min-height: 100vh;
	}

	.page-hero {
		padding: var(--space-2xl) var(--space-lg);
		padding-top: calc(var(--space-2xl) + 80px);
		text-align: center;
		background: var(--color-bg-elevated);
	}

	.container {
		max-width: 1000px;
		margin: 0 auto;
	}

	.page-title {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.page-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.results-content {
		padding: var(--space-xl) var(--space-lg);
	}

	.results-section {
		margin-bottom: var(--space-xl);
	}

	.section-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-md);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}

	.section-title a {
		color: inherit;
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.section-title a:hover {
		color: var(--color-fg-secondary);
	}

	.results-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: var(--space-md);
	}

	.result-card {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.result-header {
		margin-bottom: var(--space-sm);
	}

	.result-year {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.result-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
	}

	.result-outcome {
		font-size: var(--text-body-lg);
		font-weight: var(--font-medium);
		color: var(--color-success);
		margin: 0 0 var(--space-sm);
	}

	.result-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin: 0;
	}

	.results-disclaimer-box {
		margin-top: var(--space-xl);
		padding: var(--space-lg);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	.disclaimer-title {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-tertiary);
		margin: 0 0 var(--space-sm);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.disclaimer-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		line-height: 1.6;
		margin: 0;
	}

	.cta-section {
		padding: var(--space-xl) var(--space-lg);
		background: var(--color-bg-elevated);
		text-align: center;
	}

	.cta-title {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.cta-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-lg);
	}

	.cta-buttons {
		display: flex;
		gap: var(--space-md);
		justify-content: center;
	}

	.cta-button {
		padding: var(--space-sm) var(--space-lg);
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		border-radius: var(--radius-md);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.cta-button.primary {
		color: var(--color-bg-pure);
		background: var(--color-fg-primary);
	}

	.cta-button.primary:hover {
		background: var(--color-fg-secondary);
	}

	.cta-button.secondary {
		color: var(--color-fg-primary);
		background: transparent;
		border: 1px solid var(--color-border-emphasis);
	}

	.cta-button.secondary:hover {
		background: var(--color-bg-surface);
	}

	@media (max-width: 768px) {
		.page-hero {
			padding: var(--space-xl) var(--space-md);
			padding-top: calc(var(--space-xl) + 60px);
		}

		.results-content,
		.cta-section {
			padding: var(--space-lg) var(--space-md);
		}

		.results-grid {
			grid-template-columns: 1fr;
		}

		.cta-buttons {
			flex-direction: column;
		}
	}
</style>
