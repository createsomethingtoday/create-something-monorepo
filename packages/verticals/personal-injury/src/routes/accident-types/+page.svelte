<script lang="ts">
	/**
	 * Accident Types Listing Page
	 * Grid of all case types we handle
	 */

	import { getSiteConfigFromContext } from '$lib/config/context';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import EthicsDisclaimer from '$lib/components/EthicsDisclaimer.svelte';
	import { Car, Truck, Bike, PersonStanding, Skull, Stethoscope, ArrowRight } from 'lucide-svelte';

	const siteConfig = getSiteConfigFromContext();
	const { accidentTypes, name } = siteConfig;

	// Icon mapping
	const iconMap: Record<string, typeof Car> = {
		'car-accident': Car,
		'truck-accident': Truck,
		'motorcycle-accident': Bike,
		'slip-and-fall': PersonStanding,
		'wrongful-death': Skull,
		'medical-malpractice': Stethoscope
	};

	function getIcon(slug: string) {
		return iconMap[slug] || Car;
	}
</script>

<SEOHead
	canonical="/accident-types"
	title="Case Types We Handle | {name}"
	description="Personal injury cases we handle: car accidents, truck accidents, motorcycle accidents, slip and fall, wrongful death, and medical malpractice."
/>

<main class="accident-types-page">
	<section class="page-hero">
		<div class="container">
			<h1 class="page-title">Types of Cases We Handle</h1>
			<p class="page-subtitle">
				Our experienced team represents accident victims across all types of personal injury cases.
			</p>
		</div>
	</section>

	<section class="types-content">
		<div class="container">
			<div class="types-grid">
				{#each accidentTypes as type}
					{@const Icon = getIcon(type.slug)}
					<a href="/accident-types/{type.slug}" class="type-card">
						<div class="card-icon">
							<Icon size={28} />
						</div>
						<div class="card-content">
							<h2 class="card-title">{type.name}</h2>
							<p class="card-description">{type.description}</p>

							{#if type.averageSettlement}
								<div class="settlement-info">
									<span class="settlement-label">Typical Recovery</span>
									<span class="settlement-value">{type.averageSettlement}</span>
								</div>
							{/if}

							{#if type.statuteOfLimitations}
								<div class="statute-info">
									<span class="statute-label">Time Limit</span>
									<span class="statute-value">{type.statuteOfLimitations}</span>
								</div>
							{/if}

							<span class="card-link">
								<span>Learn More</span>
								<ArrowRight size={14} />
							</span>
						</div>
					</a>
				{/each}
			</div>
		</div>
	</section>

	<section class="cta-section">
		<div class="container">
			<h2 class="cta-title">Don't See Your Case Type?</h2>
			<p class="cta-text">
				We handle many types of injury cases. Contact us for a free evaluation.
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
	.accident-types-page {
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
		max-width: 1100px;
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
		max-width: 600px;
		margin-left: auto;
		margin-right: auto;
	}

	.types-content {
		padding: var(--space-xl) var(--space-lg);
	}

	.types-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: var(--space-md);
	}

	.type-card {
		display: flex;
		flex-direction: column;
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-decoration: none;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.type-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateY(-2px);
	}

	.card-icon {
		width: 56px;
		height: 56px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.05);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-md);
	}

	.card-content {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.card-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
	}

	.card-description {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		margin: 0 0 var(--space-md);
		flex: 1;
		line-height: 1.6;
	}

	.settlement-info,
	.statute-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: var(--space-sm);
		background: var(--color-bg-elevated);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-sm);
	}

	.settlement-label,
	.statute-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.settlement-value {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-success);
	}

	.statute-value {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.card-link {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		margin-top: var(--space-md);
	}

	.type-card:hover .card-link {
		color: var(--color-fg-primary);
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

		.types-content,
		.cta-section {
			padding: var(--space-lg) var(--space-md);
		}

		.types-grid {
			grid-template-columns: 1fr;
		}

		.cta-buttons {
			flex-direction: column;
		}
	}
</style>
