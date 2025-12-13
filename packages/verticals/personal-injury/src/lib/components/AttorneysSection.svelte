<script lang="ts">
	/**
	 * Attorneys Section
	 * Team grid with credentials, bar numbers, education
	 */

	import { getSiteConfigFromContext } from '$lib/config/context';

	const siteConfig = getSiteConfigFromContext();
	const { attorneys, accidentTypes } = siteConfig;

	// Get focus area names from slugs
	function getFocusAreaNames(slugs: string[] | undefined): string {
		if (!slugs || !Array.isArray(slugs)) return '';
		return slugs
			.map((slug) => {
				const type = accidentTypes.find((t) => t.slug === slug);
				return type?.name || slug;
			})
			.join(', ');
	}
</script>

<section class="attorneys-section" id="attorneys">
	<div class="container">
		<header class="section-header">
			<h2 class="section-title">Our Attorneys</h2>
			<p class="section-subtitle">
				Experienced advocates dedicated to your success.
			</p>
		</header>

		<div class="attorneys-grid">
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
						<h3 class="attorney-name">{attorney.name}</h3>
						<p class="attorney-title">{attorney.title}</p>
						<p class="attorney-bar">{attorney.barNumber}</p>
						<p class="attorney-areas">{getFocusAreaNames(attorney.focusAreas)}</p>
					</div>
				</a>
			{/each}
		</div>
	</div>
</section>

<style>
	.attorneys-section {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-surface);
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
	}

	.attorneys-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-lg);
	}

	.attorney-card {
		display: block;
		text-decoration: none;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.attorney-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateY(-4px);
	}

	.attorney-image-container {
		aspect-ratio: 3 / 4;
		overflow: hidden;
		background: var(--color-bg-subtle);
	}

	.attorney-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.attorney-card:hover .attorney-image {
		transform: scale(1.03);
	}

	.attorney-info {
		padding: var(--space-md);
	}

	.attorney-name {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
	}

	.attorney-title {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-xs);
	}

	.attorney-bar {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin: 0 0 var(--space-xs);
		font-family: var(--font-mono);
	}

	.attorney-areas {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: 0;
	}

	@media (max-width: 768px) {
		.attorneys-section {
			padding: var(--space-xl) var(--space-md);
		}

		.attorneys-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
