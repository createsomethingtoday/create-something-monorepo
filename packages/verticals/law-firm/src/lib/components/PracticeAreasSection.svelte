<script lang="ts">
	/**
	 * Practice Areas Section
	 * Displays firm's areas of legal expertise with Lucide icons
	 */

	import { getSiteConfigFromContext } from '$lib/config/context';
	import { Users, Shield, Briefcase, Scale, Home, Car, Gavel, FileText, Building2 } from 'lucide-svelte';

	const siteConfig = getSiteConfigFromContext();
	const { practiceAreas } = siteConfig;

	// Icon component mapping
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

<section class="practice-areas" id="practice-areas">
	<div class="container">
		<header class="section-header">
			<h2 class="section-title">Practice Areas</h2>
			<p class="section-subtitle">
				Focused legal representation in the areas that matter most.
			</p>
		</header>

		<div class="areas-grid">
			{#each practiceAreas as area}
				<a href="/practice-areas/{area.slug}" class="area-card" aria-label="Learn more about {area.name}">
					<div class="area-icon">
						{#if area.icon && iconComponents[area.icon]}
							<svelte:component this={iconComponents[area.icon]} size={32} strokeWidth={1.5} />
						{:else}
							<Scale size={32} strokeWidth={1.5} />
						{/if}
					</div>
					<h3 class="area-name">{area.name}</h3>
					<p class="area-description">{area.description}</p>
					<span class="area-link" aria-hidden="true">Learn more →</span>
				</a>
			{/each}
		</div>
	</div>
</section>

<style>
	.practice-areas {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-pure);
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
	}

	.section-header {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.section-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin: 0;
		max-width: 600px;
		margin-inline: auto;
	}

	.areas-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: var(--space-md);
	}

	.area-card {
		display: flex;
		flex-direction: column;
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-decoration: none;
		transition: all 0.3s ease;
	}

	.area-card:hover {
		background: var(--color-bg-subtle);
		border-color: var(--color-border-emphasis);
		transform: translateY(-2px);
	}

	.area-icon {
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
		transition: color 0.2s ease;
	}

	.area-card:hover .area-icon {
		color: var(--color-fg-primary);
	}

	.area-name {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.area-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0;
		flex-grow: 1;
		line-height: 1.6;
	}

	.area-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-top: var(--space-md);
		transition: color 0.2s ease;
	}

	.area-card:hover .area-link {
		color: var(--color-fg-primary);
	}

	@media (max-width: 768px) {
		.practice-areas {
			padding: var(--space-xl) var(--space-md);
		}

		.areas-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
