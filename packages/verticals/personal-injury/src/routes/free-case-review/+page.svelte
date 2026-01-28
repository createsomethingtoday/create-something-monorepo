<script lang="ts">
	/**
	 * Free Case Review - Dedicated Intake Landing Page
	 * Primary conversion page for PI leads
	 */

	import { SEO } from '@create-something/canon';
	import { getSiteConfigFromContext } from '$lib/config/context';
	import PIIntakeForm from '$lib/components/PIIntakeForm.svelte';
	import EthicsDisclaimer from '$lib/components/EthicsDisclaimer.svelte';
	import { Shield, Clock, DollarSign, Phone } from 'lucide-svelte';

	const siteConfig = getSiteConfigFromContext();
</script>

<SEO
	title="Free Case Review"
	description="Get a free, no-obligation evaluation of your personal injury case. No fees unless we win. Available 24/7."
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Free Case Review', url: '/free-case-review' }
	]}
/>

<main class="case-review-page">
	<section class="page-hero">
		<div class="container">
			<div class="hero-content">
				<div class="hero-text">
					<div class="trust-badges">
						<span class="badge">
							<Shield size={14} />
							<span>Free Consultation</span>
						</span>
						<span class="badge">
							<DollarSign size={14} />
							<span>No Fee Unless We Win</span>
						</span>
						{#if siteConfig.available24_7}
							<span class="badge highlight">
								<Clock size={14} />
								<span>Available 24/7</span>
							</span>
						{/if}
					</div>

					<h1 class="page-title">Free Case Review</h1>
					<p class="page-subtitle">
						Injured? Get a confidential evaluation of your case in minutes.
						Our experienced attorneys will review your situation and advise you on your options.
					</p>

					<div class="value-props">
						<div class="prop">
							<span class="prop-number">1</span>
							<div class="prop-content">
								<span class="prop-title">Quick Evaluation</span>
								<span class="prop-desc">Get an initial assessment within 24 hours</span>
							</div>
						</div>
						<div class="prop">
							<span class="prop-number">2</span>
							<div class="prop-content">
								<span class="prop-title">No Obligation</span>
								<span class="prop-desc">Free consultation with no pressure</span>
							</div>
						</div>
						<div class="prop">
							<span class="prop-number">3</span>
							<div class="prop-content">
								<span class="prop-title">Contingency Fees</span>
								<span class="prop-desc">You pay nothing unless we win your case</span>
							</div>
						</div>
					</div>

					<div class="phone-cta">
						<span class="phone-label">Prefer to talk? Call us now:</span>
						<a href="tel:{siteConfig.phone.replace(/[^0-9+]/g, '')}" class="phone-number">
							<Phone size={18} />
							{siteConfig.phone}
						</a>
					</div>
				</div>

				<div class="form-container">
					<PIIntakeForm />
				</div>
			</div>
		</div>
	</section>

	<section class="results-preview">
		<div class="container">
			<h2 class="section-title">Recent Case Results</h2>
			<div class="results-grid">
				{#each siteConfig.recoveries.slice(0, 3) as recovery}
					<div class="result-card">
						<span class="result-amount">{recovery.recoveryDisplay}</span>
						<span class="result-title">{recovery.title}</span>
						<span class="result-meta">
							{recovery.resolution === 'verdict' ? 'Verdict' : 'Settlement'} • {recovery.year}
						</span>
					</div>
				{/each}
			</div>
			<p class="results-disclaimer">
				Prior results do not guarantee a similar outcome. Every case is different.
			</p>
		</div>
	</section>

	<EthicsDisclaimer />
</main>

<style>
	.case-review-page {
		background: var(--color-bg-pure);
		min-height: 100vh;
	}

	.page-hero {
		padding: var(--space-xl) var(--space-lg);
		padding-top: calc(var(--space-xl) + 100px); /* Account for nav + emergency banner */
		background: var(--color-bg-elevated);
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
	}

	.hero-content {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-xl);
		align-items: start;
	}

	.trust-badges {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
	}

	.badge.highlight {
		background: rgba(68, 170, 68, 0.15);
		border-color: var(--color-success);
		color: var(--color-success);
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
		line-height: 1.6;
	}

	.value-props {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
	}

	.prop {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
	}

	.prop-number {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-tertiary);
		flex-shrink: 0;
	}

	.prop-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.prop-title {
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.prop-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.phone-cta {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.phone-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.phone-number {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-success);
		text-decoration: none;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.phone-number:hover {
		opacity: 0.8;
	}

	.form-container {
		position: sticky;
		top: 120px;
	}

	.results-preview {
		padding: var(--space-xl) var(--space-lg);
	}

	.section-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		text-align: center;
		margin: 0 0 var(--space-lg);
	}

	.results-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-md);
		margin-bottom: var(--space-md);
	}

	.result-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-align: center;
	}

	.result-amount {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-success);
	}

	.result-title {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.result-meta {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.results-disclaimer {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-align: center;
		font-style: italic;
		margin: 0;
	}

	@media (max-width: 1024px) {
		.hero-content {
			grid-template-columns: 1fr;
		}

		.form-container {
			position: static;
		}
	}

	@media (max-width: 768px) {
		.page-hero {
			padding: var(--space-lg) var(--space-md);
			padding-top: calc(var(--space-lg) + 80px);
		}

		.results-preview {
			padding: var(--space-lg) var(--space-md);
		}

		.results-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
