<script lang="ts">
	/**
	 * Results Page - Personal Injury
	 * Recovery amounts as trust signals
	 */

	import { SEO } from '@create-something/canon';
	import { getSiteConfigFromContext } from '$lib/config/context';
	import EthicsDisclaimer from '$lib/components/EthicsDisclaimer.svelte';

	const siteConfig = getSiteConfigFromContext();
	const { recoveries, accidentTypes, name } = siteConfig;

	// Get accident type name from slug
	function getAccidentTypeName(slug: string): string {
		const type = accidentTypes.find((t) => t.slug === slug);
		return type?.name || slug;
	}

	// Group recoveries by accident type
	const recoveriesByType = accidentTypes.map((type) => ({
		type,
		recoveries: recoveries.filter((r) => r.accidentType === type.slug)
	})).filter((group) => group.recoveries.length > 0);

	// Total recovered calculation
	const totalRecovered = recoveries.reduce((sum, r) => sum + r.recoveryAmount, 0);
	const formattedTotal = totalRecovered >= 1000000
		? `$${(totalRecovered / 1000000).toFixed(0)}M+`
		: `$${(totalRecovered / 1000).toFixed(0)}K+`;
</script>

<SEO
	title="Case Results"
	description="Over {formattedTotal} recovered for accident victims. A selection of representative case outcomes. Prior results do not guarantee a similar outcome."
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Results', url: '/results' }
	]}
/>

<main class="results-page">
	<section class="page-hero">
		<div class="container">
			<h1 class="page-title">Case Results</h1>
			<p class="page-subtitle">
				Over <strong>{formattedTotal}</strong> recovered for our clients
			</p>
		</div>
	</section>

	<section class="results-content">
		<div class="container">
			{#each recoveriesByType as { type, recoveries }}
				<div class="results-section">
					<h2 class="section-title">
						<a href="/accident-types/{type.slug}">{type.name}</a>
					</h2>

					<div class="results-grid">
						{#each recoveries as recovery}
							<article class="result-card">
								<div class="result-header">
									<span class="result-badge">
										{recovery.resolution === 'verdict' ? 'Verdict' : 'Settlement'}
									</span>
									<span class="result-year">{recovery.year}</span>
								</div>
								<div class="result-amount">{recovery.recoveryDisplay}</div>
								<h3 class="result-title">{recovery.title}</h3>
								<p class="result-description">{recovery.description}</p>
								{#if recovery.injuryType}
									<span class="result-injury">{recovery.injuryType}</span>
								{/if}
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
			<h2 class="cta-title">Injured? Get Your Free Case Review</h2>
			<p class="cta-text">
				No fees unless we win. Contact us for a free evaluation of your case.
			</p>
			<div class="cta-buttons">
				<a href="/free-case-review" class="cta-button primary">Free Case Review</a>
				<a href="tel:{siteConfig.phone.replace(/[^0-9+]/g, '')}" class="cta-button emergency">
					Call {siteConfig.phone}
				</a>
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

	.page-subtitle strong {
		color: var(--color-success);
		font-size: var(--text-h3);
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
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--space-md);
	}

	.result-card {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.result-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-sm);
	}

	.result-badge {
		display: inline-block;
		padding: 2px var(--space-xs);
		background: rgba(68, 170, 68, 0.15);
		border: 1px solid var(--color-success);
		border-radius: var(--radius-full);
		font-size: 10px;
		font-weight: var(--font-semibold);
		color: var(--color-success);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.result-year {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.result-amount {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.result-title {
		font-size: var(--text-body-lg);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-sm);
	}

	.result-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: 1.6;
		margin: 0 0 var(--space-sm);
	}

	.result-injury {
		display: inline-block;
		padding: 2px var(--space-xs);
		background: var(--color-bg-elevated);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
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
		letter-spacing: 0.05em;
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

	.cta-button.emergency {
		color: var(--color-fg-primary);
		background: rgba(68, 170, 68, 0.2);
		border: 1px solid var(--color-success);
	}

	.cta-button.emergency:hover {
		background: rgba(68, 170, 68, 0.3);
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

		.result-amount {
			font-size: var(--text-h3);
		}

		.cta-buttons {
			flex-direction: column;
		}
	}
</style>
