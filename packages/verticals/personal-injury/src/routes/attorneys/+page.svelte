<script lang="ts">
	/**
	 * Attorneys Page - Personal Injury
	 * Team listing with PI focus areas
	 */

	import { getSiteConfigFromContext } from '$lib/config/context';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import EthicsDisclaimer from '$lib/components/EthicsDisclaimer.svelte';

	const siteConfig = getSiteConfigFromContext();
	const { attorneys, accidentTypes, name } = siteConfig;

	// Get accident type names from slugs
	function getAccidentTypeNames(slugs: string[] | undefined): string {
		if (!slugs || !Array.isArray(slugs)) return '';
		return slugs
			.map((slug) => accidentTypes.find((t) => t.slug === slug)?.name || slug)
			.join(', ');
	}
</script>

<SEOHead
	canonical="/attorneys"
	title="Our Attorneys | {name}"
	description="Meet our experienced personal injury attorneys. Each brings decades of experience fighting for accident victims."
/>

<main class="attorneys-page">
	<section class="page-hero">
		<div class="container">
			<h1 class="page-title">Our Attorneys</h1>
			<p class="page-subtitle">
				Experienced advocates fighting for accident victims.
			</p>
		</div>
	</section>

	<section class="attorneys-list">
		<div class="container">
			{#each attorneys as attorney}
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
						<h2 class="attorney-name">{attorney.name}</h2>
						<p class="attorney-title">{attorney.title}</p>
						<p class="attorney-bar">{attorney.barNumber}</p>

						<div class="attorney-credentials">
							<div class="credential">
								<span class="credential-label">Admitted</span>
								<span class="credential-value">{attorney.admittedStates.join(', ')}</span>
							</div>
							<div class="credential">
								<span class="credential-label">Focus Areas</span>
								<span class="credential-value">{getAccidentTypeNames(attorney.focusAreas)}</span>
							</div>
						</div>

						<p class="attorney-bio">{attorney.bio}</p>

						<span class="attorney-link">View full profile →</span>
					</div>
				</a>
			{/each}
		</div>
	</section>

	<EthicsDisclaimer />
</main>

<style>
	.attorneys-page {
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

	.attorneys-list {
		padding: var(--space-xl) var(--space-lg);
	}

	.attorney-card {
		display: grid;
		grid-template-columns: 300px 1fr;
		gap: var(--space-lg);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-decoration: none;
		margin-bottom: var(--space-lg);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.attorney-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.attorney-image-container {
		aspect-ratio: 3 / 4;
		overflow: hidden;
		border-radius: var(--radius-md);
		background: var(--color-bg-subtle);
	}

	.attorney-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.attorney-info {
		display: flex;
		flex-direction: column;
	}

	.attorney-name {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
	}

	.attorney-title {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-xs);
	}

	.attorney-bar {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		font-family: var(--font-mono);
		margin: 0 0 var(--space-md);
	}

	.attorney-credentials {
		display: flex;
		gap: var(--space-lg);
		margin-bottom: var(--space-md);
	}

	.credential {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.credential-label {
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.credential-value {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.attorney-bio {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin: 0;
		flex-grow: 1;
	}

	.attorney-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-top: var(--space-md);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.attorney-card:hover .attorney-link {
		color: var(--color-fg-primary);
	}

	@media (max-width: 768px) {
		.page-hero {
			padding: var(--space-xl) var(--space-md);
			padding-top: calc(var(--space-xl) + 60px);
		}

		.attorneys-list {
			padding: var(--space-lg) var(--space-md);
		}

		.attorney-card {
			grid-template-columns: 1fr;
		}

		.attorney-image-container {
			max-width: 200px;
		}

		.attorney-credentials {
			flex-direction: column;
			gap: var(--space-sm);
		}
	}
</style>
