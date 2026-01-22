<script lang="ts">
	/**
	 * OUTERFIELDS PCN Partners
	 *
	 * Social proof section showcasing current PCN clients/partners.
	 * CTA: Become a Partner (Calendly)
	 */
	import { Users } from 'lucide-svelte';

	interface Partner {
		id: string;
		name: string;
		description: string;
		logo?: string;
	}

	const partners: Partner[] = [
		{
			id: 'shiv-works',
			name: 'SHIV Works',
			description: 'Elite tactical training and combatives instruction'
		},
		{
			id: 'velocity-health',
			name: 'Velocity Health Clinic',
			description: 'Performance medicine and wellness optimization'
		},
		{
			id: 'good-life',
			name: 'Good Life Network',
			description: 'Lifestyle content and personal development'
		}
	];

	function bookDiscoveryCall() {
		window.open('https://calendly.com/outerfields/discovery-call', '_blank');
	}
</script>

<section class="partners-section" id="partners">
	<div class="partners-container">
		<div class="section-header">
			<span class="section-badge">
				<Users size={12} />
				Our Partners
			</span>
			<h2 class="section-title">PCN Partners</h2>
			<p class="section-description">
				Trusted by creators and brands who value quality, ownership, and results.
			</p>
		</div>

		<div class="partners-grid">
			{#each partners as partner}
				<div class="partner-card">
					<div class="partner-logo">
						{#if partner.logo}
							<img src={partner.logo} alt={partner.name} loading="lazy" />
						{:else}
							<div class="logo-placeholder">
								{partner.name.charAt(0)}
							</div>
						{/if}
					</div>
					<h3 class="partner-name">{partner.name}</h3>
					<p class="partner-description">{partner.description}</p>
				</div>
			{/each}
		</div>

		<div class="partners-cta">
			<button class="cta-button" onclick={bookDiscoveryCall}>
				Become a Partner
			</button>
		</div>
	</div>
</section>

<style>
	.partners-section {
		padding: 6rem 1.5rem;
		background: var(--color-bg-surface);
	}

	.partners-container {
		max-width: var(--container-max-width);
		margin: 0 auto;
	}

	.section-header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.section-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		background: var(--color-primary-muted);
		border: 1px solid rgba(244, 81, 38, 0.3);
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-sun);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 1rem;
	}

	.section-title {
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 1rem;
	}

	.section-description {
		font-size: 1.125rem;
		color: var(--color-slate);
		max-width: 36rem;
		margin: 0 auto;
		line-height: 1.6;
	}

	.partners-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 2rem;
		margin-bottom: 3rem;
	}

	.partner-card {
		padding: 2rem;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		text-align: center;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.partner-card:hover {
		border-color: var(--color-sun);
	}

	.partner-logo {
		width: 5rem;
		height: 5rem;
		margin: 0 auto 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.partner-logo img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
	}

	.logo-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-primary-muted);
		border-radius: 1rem;
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-sun);
	}

	.partner-name {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.partner-description {
		font-size: 0.9375rem;
		color: var(--color-slate);
		line-height: 1.5;
		margin: 0;
	}

	.partners-cta {
		text-align: center;
	}

	.cta-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 1rem 2.5rem;
		background: var(--color-sun);
		border: none;
		border-radius: 0.5rem;
		font-size: 1.125rem;
		font-weight: 700;
		color: white;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.cta-button:hover {
		background: var(--color-primary-hover);
		transform: scale(1.02);
	}

	@media (max-width: 900px) {
		.partners-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.partners-section {
			padding: 4rem 1rem;
		}

		.partners-grid {
			grid-template-columns: 1fr;
		}

		.partner-card {
			padding: 1.5rem;
		}
	}
</style>
