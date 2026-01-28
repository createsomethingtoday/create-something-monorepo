<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { config } from '$lib/config/runtime';
	import StructuredData from '$lib/components/StructuredData.svelte';
</script>

<SEO
	title="Studio"
	description={$config.studio.philosophy}
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Studio', url: '/studio' }
	]}
/>
<StructuredData page="studio" />

<div class="studio-page">
	<!-- Philosophy -->
	<section class="philosophy-section">
		<div class="philosophy-content">
			<h1 class="philosophy-headline">{$config.studio.headline}</h1>
			<p class="philosophy-text">{$config.studio.philosophy}</p>
		</div>
	</section>

	<!-- Process -->
	<section class="process-section section">
		<h2 class="section-title">Process</h2>
		<div class="process-grid">
			{#each $config.studio.process as step, i}
				<div class="process-step">
					<span class="step-number">{String(i + 1).padStart(2, '0')}</span>
					<h3 class="step-phase">{step.phase}</h3>
					<p class="step-description">{step.description}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- Team -->
	<section class="team-section section">
		<h2 class="section-title">Team</h2>
		<div class="team-grid">
			{#each $config.studio.team as member}
				<div class="team-member">
					{#if member.image}
						<div class="member-image-wrapper">
							<img src={member.image} alt={member.name} class="member-image" />
						</div>
					{/if}
					<div class="member-info">
						<h3 class="member-name">{member.name}</h3>
						<p class="member-role">{member.role}</p>
						<p class="member-bio">{member.bio}</p>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Services -->
	<section class="services-section section">
		<h2 class="section-title">Services</h2>
		<div class="services-grid">
			{#each $config.services as service}
				<div class="service-item">
					<h3 class="service-name">{service.name}</h3>
					<p class="service-description">{service.description}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- Recognition -->
	{#if $config.recognition.length > 0}
		<section class="recognition-section section">
			<h2 class="section-title">Recognition</h2>
			<div class="recognition-grid">
				{#each $config.recognition as item}
					<div class="recognition-item">
						<span class="recognition-publication">{item.publication}</span>
						<span class="recognition-year">{item.year}</span>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>

<style>
	.studio-page {
		padding-top: 80px;
	}

	/* Philosophy */
	.philosophy-section {
		min-height: 60vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-2xl) var(--gutter);
		background: var(--color-bg-surface);
	}

	.philosophy-content {
		max-width: var(--content-narrow);
		text-align: center;
	}

	.philosophy-headline {
		font-size: var(--text-display);
		font-weight: 300;
		margin-bottom: var(--space-lg);
	}

	.philosophy-text {
		font-size: var(--text-h3);
		font-weight: 300;
		line-height: var(--leading-relaxed);
		color: var(--color-fg-secondary);
	}

	/* Sections */
	.section {
		padding: var(--space-2xl) var(--gutter);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.section-title {
		font-size: var(--text-h3);
		font-weight: 300;
		margin-bottom: var(--space-xl);
	}

	/* Process */
	.process-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-lg);
	}

	.process-step {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.step-number {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-family: var(--font-mono);
	}

	.step-phase {
		font-size: var(--text-body-lg);
		font-weight: 400;
	}

	.step-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	/* Team */
	.team-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--space-xl);
	}

	.team-member {
		display: grid;
		grid-template-columns: 120px 1fr;
		gap: var(--space-lg);
		align-items: start;
	}

	.member-image-wrapper {
		aspect-ratio: 1;
		overflow: hidden;
	}

	.member-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: grayscale(100%);
		transition: filter var(--duration-standard) var(--ease-standard);
	}

	.team-member:hover .member-image {
		filter: grayscale(0%);
	}

	.member-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.member-name {
		font-size: var(--text-body-lg);
		font-weight: 400;
	}

	.member-role {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.member-bio {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-top: var(--space-sm);
	}

	/* Services */
	.services-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-lg);
	}

	.service-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding: var(--space-lg);
		border: 1px solid var(--color-border-default);
	}

	.service-name {
		font-size: var(--text-body-lg);
		font-weight: 400;
	}

	.service-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	/* Recognition */
	.recognition-grid {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-lg);
	}

	.recognition-item {
		display: flex;
		gap: var(--space-sm);
		align-items: baseline;
	}

	.recognition-publication {
		font-size: var(--text-body);
	}

	.recognition-year {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.process-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.services-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.process-grid {
			grid-template-columns: 1fr;
		}

		.team-member {
			grid-template-columns: 1fr;
		}

		.member-image-wrapper {
			max-width: 200px;
		}
	}
</style>
