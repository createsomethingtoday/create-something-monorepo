<script lang="ts">
	/**
	 * Accident Type Detail Page
	 */

	import { page } from '$app/stores';
	import { error } from '@sveltejs/kit';
	import { SEO } from '@create-something/canon';
	import { getSiteConfigFromContext } from '$lib/config/context';
	import EthicsDisclaimer from '$lib/components/EthicsDisclaimer.svelte';
	import { ArrowLeft, Clock, DollarSign, AlertTriangle, Check } from 'lucide-svelte';

	const siteConfig = getSiteConfigFromContext();

	// Find accident type by slug
	const slug = $page.params.slug;
	const accidentType = siteConfig.accidentTypes.find((t) => t.slug === slug);

	if (!accidentType) {
		throw error(404, `Accident type "${slug}" not found`);
	}

	// Get related recoveries
	const relatedRecoveries = siteConfig.recoveries
		.filter((r) => r.accidentType === slug)
		.slice(0, 3);
</script>

<SEO
	title="{accidentType.name} Attorney"
	description={accidentType.description}
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Case Types', url: '/accident-types' },
		{ name: accidentType.name, url: `/accident-types/${slug}` }
	]}
/>

<main class="accident-type-page">
	<section class="page-hero">
		<div class="container">
			<a href="/accident-types" class="back-link">
				<ArrowLeft size={16} />
				<span>All Case Types</span>
			</a>
			<h1 class="page-title">{accidentType.name}</h1>
			<p class="page-subtitle">{accidentType.description}</p>

			<div class="quick-stats">
				{#if accidentType.averageSettlement}
					<div class="stat">
						<DollarSign size={20} />
						<div class="stat-content">
							<span class="stat-value">{accidentType.averageSettlement}</span>
							<span class="stat-label">Typical Recovery</span>
						</div>
					</div>
				{/if}
				{#if accidentType.statuteOfLimitations}
					<div class="stat">
						<Clock size={20} />
						<div class="stat-content">
							<span class="stat-value">{accidentType.statuteOfLimitations}</span>
							<span class="stat-label">Time to File</span>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</section>

	<section class="content-section">
		<div class="container">
			<div class="content-grid">
				<div class="main-content">
					{#if accidentType.commonInjuries?.length}
						<div class="content-block">
							<h2 class="block-title">Common Injuries</h2>
							<ul class="injury-list">
								{#each accidentType.commonInjuries as injury}
									<li>
										<AlertTriangle size={16} />
										<span>{injury}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					{#if accidentType.keyFactors?.length}
						<div class="content-block">
							<h2 class="block-title">Key Factors We Investigate</h2>
							<ul class="factor-list">
								{#each accidentType.keyFactors as factor}
									<li>
										<Check size={16} />
										<span>{factor}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>

				<aside class="sidebar">
					{#if relatedRecoveries.length > 0}
						<div class="sidebar-block">
							<h3 class="sidebar-title">Recent Results</h3>
							<div class="results-list">
								{#each relatedRecoveries as recovery}
									<div class="result-item">
										<span class="result-amount">{recovery.recoveryDisplay}</span>
										<span class="result-title">{recovery.title}</span>
										<span class="result-year">{recovery.year}</span>
									</div>
								{/each}
							</div>
							<a href="/results" class="view-all">View all results →</a>
						</div>
					{/if}

					<div class="sidebar-block cta-block">
						<h3 class="sidebar-title">Free Case Review</h3>
						<p>Injured in a {accidentType.name.toLowerCase()}? Get a free evaluation of your case.</p>
						<a href="/free-case-review" class="cta-button">Start Free Review</a>
						<a href="tel:{siteConfig.phone.replace(/[^0-9+]/g, '')}" class="phone-link">
							Or call {siteConfig.phone}
						</a>
					</div>
				</aside>
			</div>
		</div>
	</section>

	<EthicsDisclaimer />
</main>

<style>
	.accident-type-page {
		background: var(--color-bg-pure);
		min-height: 100vh;
	}

	.page-hero {
		padding: var(--space-2xl) var(--space-lg);
		padding-top: calc(var(--space-2xl) + 80px);
		background: var(--color-bg-elevated);
	}

	.container {
		max-width: 1100px;
		margin: 0 auto;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		text-decoration: none;
		margin-bottom: var(--space-md);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover {
		color: var(--color-fg-secondary);
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
		margin: 0 0 var(--space-lg);
		max-width: 700px;
	}

	.quick-stats {
		display: flex;
		gap: var(--space-lg);
	}

	.stat {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-tertiary);
	}

	.stat-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.stat-value {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.stat-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.content-section {
		padding: var(--space-xl) var(--space-lg);
	}

	.content-grid {
		display: grid;
		grid-template-columns: 1fr 350px;
		gap: var(--space-xl);
	}

	.content-block {
		margin-bottom: var(--space-xl);
	}

	.block-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-md);
	}

	.injury-list,
	.factor-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.injury-list li,
	.factor-list li {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		font-size: var(--text-body);
	}

	.injury-list li {
		border-left: 2px solid var(--color-warning);
	}

	.factor-list li {
		border-left: 2px solid var(--color-success);
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.sidebar-block {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.sidebar-title {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-md);
	}

	.results-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.result-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: var(--space-sm);
		background: var(--color-bg-elevated);
		border-radius: var(--radius-md);
	}

	.result-amount {
		font-size: var(--text-body-lg);
		font-weight: var(--font-bold);
		color: var(--color-success);
	}

	.result-title {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.result-year {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.view-all {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		text-decoration: none;
	}

	.view-all:hover {
		color: var(--color-fg-secondary);
	}

	.cta-block {
		background: rgba(68, 170, 68, 0.1);
		border-color: var(--color-success);
	}

	.cta-block p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-md);
	}

	.cta-button {
		display: block;
		width: 100%;
		padding: var(--space-sm);
		background: var(--color-success);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		text-align: center;
		text-decoration: none;
		border-radius: var(--radius-md);
		margin-bottom: var(--space-sm);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.cta-button:hover {
		background: rgb(88, 190, 88);
	}

	.phone-link {
		display: block;
		text-align: center;
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		text-decoration: none;
	}

	.phone-link:hover {
		color: var(--color-fg-secondary);
	}

	@media (max-width: 1024px) {
		.content-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.page-hero {
			padding: var(--space-xl) var(--space-md);
			padding-top: calc(var(--space-xl) + 60px);
		}

		.content-section {
			padding: var(--space-lg) var(--space-md);
		}

		.quick-stats {
			flex-direction: column;
			gap: var(--space-sm);
		}
	}
</style>
