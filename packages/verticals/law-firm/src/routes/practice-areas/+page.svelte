<script lang="ts">
	/**
	 * Practice Areas Page
	 * Overview of all practice areas
	 */

	import { SEO } from '@create-something/canon';
	import { getSiteConfigFromContext } from '$lib/config/context';
	import EthicsDisclaimer from '$lib/components/EthicsDisclaimer.svelte';
	import { Users, Shield, Briefcase, Scale, Home, Car, Gavel, FileText, Building2 } from 'lucide-svelte';

	const siteConfig = getSiteConfigFromContext();
	const { practiceAreas, name } = siteConfig;

	// Lucide icon component mapping
	const iconComponents: Record<string, typeof Users> = {
		users: Users,
		shield: Shield,
		briefcase: Briefcase,
		scale: Scale,
		home: Home,
		car: Car,
		gavel: Gavel,
		'file-text': FileText,
		building: Building2
	};
</script>

<SEO
	title="Practice Areas"
	description="Our areas of legal expertise. We provide skilled representation in family law, personal injury, business law, and more."
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Practice Areas', url: '/practice-areas' }
	]}
/>

<main class="practice-areas-page">
	<section class="page-hero">
		<div class="container">
			<h1 class="page-title">Practice Areas</h1>
			<p class="page-subtitle">
				Focused legal representation in the areas that matter most.
			</p>
		</div>
	</section>

	<section class="areas-list">
		<div class="container">
			{#each practiceAreas as area}
				<a href="/practice-areas/{area.slug}" class="area-card">
					<div class="area-icon">
						{#if area.icon && iconComponents[area.icon]}
							<svelte:component this={iconComponents[area.icon]} size={40} strokeWidth={1.5} />
						{:else}
							<Scale size={40} strokeWidth={1.5} />
						{/if}
					</div>

					<div class="area-content">
						<h2 class="area-name">{area.name}</h2>
						<p class="area-description">{area.description}</p>
						<span class="area-link">Learn more about {area.name.toLowerCase()} →</span>
					</div>
				</a>
			{/each}
		</div>
	</section>

	<section class="cta-section">
		<div class="container">
			<h2 class="cta-title">Not sure which practice area applies?</h2>
			<p class="cta-text">
				Contact us for a free consultation. We'll help you understand your options.
			</p>
			<a href="/contact" class="cta-button">Request Consultation</a>
		</div>
	</section>

	<EthicsDisclaimer />
</main>

<style>
	.practice-areas-page {
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
		max-width: 900px;
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

	.areas-list {
		padding: var(--space-xl) var(--space-lg);
	}

	.area-card {
		display: flex;
		gap: var(--space-lg);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-decoration: none;
		margin-bottom: var(--space-md);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.area-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateX(4px);
	}

	.area-icon {
		flex-shrink: 0;
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.area-card:hover .area-icon {
		color: var(--color-fg-primary);
	}

	.area-content {
		flex-grow: 1;
	}

	.area-name {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.area-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin: 0 0 var(--space-sm);
	}

	.area-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.area-card:hover .area-link {
		color: var(--color-fg-primary);
	}

	.cta-section {
		padding: var(--space-xl) var(--space-lg);
		background: var(--color-bg-elevated);
		text-align: center;
	}

	.cta-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
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

	@media (max-width: 768px) {
		.page-hero {
			padding: var(--space-xl) var(--space-md);
			padding-top: calc(var(--space-xl) + 60px);
		}

		.areas-list {
			padding: var(--space-lg) var(--space-md);
		}

		.area-card {
			flex-direction: column;
			gap: var(--space-sm);
		}

		.cta-section {
			padding: var(--space-lg) var(--space-md);
		}
	}
</style>
