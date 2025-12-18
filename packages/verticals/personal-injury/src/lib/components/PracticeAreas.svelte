<script lang="ts">
	import { getSiteConfigFromContext } from '$lib/config/context';

	const siteConfig = getSiteConfigFromContext();

	interface PracticeArea {
		title: string;
		description: string;
		href: string;
	}

	interface Props {
		areas?: PracticeArea[];
	}

	// Generate practice areas from siteConfig services
	const defaultAreas: PracticeArea[] = siteConfig.services.map((service) => ({
		title: service.name,
		description: service.description,
		href: '/services'
	}));

	let { areas = defaultAreas }: Props = $props();
</script>

<section class="practice-areas">
	<!-- Title: 2 words, Subtitle: 8 words (Fibonacci) -->
	<div class="container">
		<div class="section-header">
			<h2 class="section-title">Practice Areas</h2>
			<p class="section-subtitle">Focused expertise across three essential business disciplines</p>
		</div>

		<div class="areas-grid stagger-children">
			{#each areas as area}
				<a href={area.href} class="area-card service-card card-interactive stagger-item" aria-label="Learn more about {area.title}">
					<h3 class="area-title">{area.title}</h3>
					<p class="area-description">{area.description}</p>
					<span class="area-link" aria-hidden="true">Learn more &rarr;</span>
				</a>
			{/each}
		</div>
	</div>
</section>

<style>
	.practice-areas {
		padding: var(--space-3xl) 0;
		background: var(--color-bg-elevated);
	}

	.container {
		max-width: var(--container-xl);
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	.section-header {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.section-title {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.section-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.areas-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-lg);
	}

	@media (min-width: 768px) {
		.areas-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1024px) {
		.areas-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.area-card {
		text-decoration: none;
		display: flex;
		flex-direction: column;
	}

	.area-title {
		font-size: var(--text-h4);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.area-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
		flex: 1;
		margin-bottom: var(--space-md);
	}

	.area-link {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.area-card:hover .area-link {
		color: var(--color-fg-primary);
	}
</style>
