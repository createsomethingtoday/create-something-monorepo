<script lang="ts">
	/**
	 * Practice Area Detail Page
	 * Shows practice area info, related attorneys, and case results
	 */

	import { getSiteConfigFromContext } from '$lib/config/context';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import EthicsDisclaimer from '$lib/components/EthicsDisclaimer.svelte';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
	const { practiceArea, relatedAttorneys, relatedResults } = data;

	const siteConfig = getSiteConfigFromContext();
</script>

<SEOHead
	canonical="/practice-areas/{practiceArea.slug}"
	title="{practiceArea.name} Attorney | {siteConfig.name}"
	description="{practiceArea.description}"
/>

<main class="practice-area-page">
	<section class="page-hero">
		<div class="container">
			<a href="/practice-areas" class="back-link">← All Practice Areas</a>
			<h1 class="page-title">{practiceArea.name}</h1>
			<p class="page-description">{practiceArea.description}</p>
			<a href="/contact?area={practiceArea.slug}" class="cta-button">
				Free Consultation
			</a>
		</div>
	</section>

	{#if relatedAttorneys.length > 0}
		<section class="related-attorneys">
			<div class="container">
				<h2 class="section-title">Our {practiceArea.name} Attorneys</h2>
				<div class="attorneys-grid">
					{#each relatedAttorneys as attorney}
						<a href="/attorneys/{attorney.slug}" class="attorney-card">
							<div class="attorney-image-container">
								<img
									src={attorney.image}
									alt={attorney.name}
									class="attorney-image"
									loading="lazy"
								/>
							</div>
							<div class="attorney-info">
								<h3 class="attorney-name">{attorney.name}</h3>
								<p class="attorney-title">{attorney.title}</p>
							</div>
						</a>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	{#if relatedResults.length > 0}
		<section class="related-results">
			<div class="container">
				<h2 class="section-title">Representative Results</h2>
				<div class="results-grid">
					{#each relatedResults as result}
						<article class="result-card">
							<p class="result-outcome">{result.outcome}</p>
							<h3 class="result-title">{result.title}</h3>
							<p class="result-description">{result.description}</p>
							<span class="result-year">{result.year}</span>
						</article>
					{/each}
				</div>
				<p class="results-disclaimer">
					Prior results do not guarantee a similar outcome.
				</p>
			</div>
		</section>
	{/if}

	<section class="contact-section">
		<div class="container">
			<h2 class="section-title">Need Help with a {practiceArea.name} Matter?</h2>
			<p class="section-text">
				Contact us for a free consultation. We'll discuss your situation
				and explain your options.
			</p>
			<div class="contact-actions">
				<a href="/schedule" class="action-button primary">
					Schedule Online
				</a>
				<a href="tel:{siteConfig.phone}" class="action-button secondary">
					Call {siteConfig.phone}
				</a>
			</div>
		</div>
	</section>

	<EthicsDisclaimer />
</main>

<style>
	.practice-area-page {
		background: var(--color-bg-pure);
		min-height: 100vh;
	}

	.page-hero {
		padding: var(--space-2xl) var(--space-lg);
		padding-top: calc(var(--space-2xl) + 80px);
		background: var(--color-bg-elevated);
	}

	.container {
		max-width: 900px;
		margin: 0 auto;
	}

	.back-link {
		display: inline-block;
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		text-decoration: none;
		margin-bottom: var(--space-lg);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover {
		color: var(--color-fg-primary);
	}

	.page-title {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.page-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin: 0 0 var(--space-lg);
		max-width: 700px;
	}

	.cta-button {
		display: inline-block;
		padding: var(--space-sm) var(--space-lg);
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-bg-pure);
		background: var(--color-fg-primary);
		border-radius: var(--radius-md);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.cta-button:hover {
		background: var(--color-fg-secondary);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-lg);
	}

	.related-attorneys {
		padding: var(--space-xl) var(--space-lg);
	}

	.attorneys-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	.attorney-card {
		display: block;
		text-decoration: none;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.attorney-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateY(-2px);
	}

	.attorney-image-container {
		aspect-ratio: 1;
		overflow: hidden;
		background: var(--color-bg-subtle);
	}

	.attorney-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.attorney-info {
		padding: var(--space-md);
	}

	.attorney-name {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
	}

	.attorney-title {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.related-results {
		padding: var(--space-xl) var(--space-lg);
		background: var(--color-bg-elevated);
	}

	.results-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--space-md);
	}

	.result-card {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.result-outcome {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-success);
		margin: 0 0 var(--space-xs);
	}

	.result-title {
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.result-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin: 0 0 var(--space-sm);
	}

	.result-year {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.results-disclaimer {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-style: italic;
		text-align: center;
		margin-top: var(--space-lg);
	}

	.contact-section {
		padding: var(--space-xl) var(--space-lg);
		text-align: center;
	}

	.section-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-lg);
	}

	.contact-actions {
		display: flex;
		gap: var(--space-md);
		justify-content: center;
	}

	.action-button {
		padding: var(--space-sm) var(--space-lg);
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		border-radius: var(--radius-md);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.action-button.primary {
		color: var(--color-bg-pure);
		background: var(--color-fg-primary);
	}

	.action-button.primary:hover {
		background: var(--color-fg-secondary);
	}

	.action-button.secondary {
		color: var(--color-fg-primary);
		background: transparent;
		border: 1px solid var(--color-border-emphasis);
	}

	.action-button.secondary:hover {
		background: var(--color-bg-surface);
	}

	@media (max-width: 768px) {
		.page-hero {
			padding: var(--space-xl) var(--space-md);
			padding-top: calc(var(--space-xl) + 60px);
		}

		.related-attorneys,
		.related-results,
		.contact-section {
			padding: var(--space-lg) var(--space-md);
		}

		.contact-actions {
			flex-direction: column;
		}
	}
</style>
