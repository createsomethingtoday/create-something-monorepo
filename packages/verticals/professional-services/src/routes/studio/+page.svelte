<script lang="ts">
	/**
	 * Studio Page - DWELL-Inspired About
	 *
	 * Philosophy first, credentials second.
	 * Let the work ethic speak through the words.
	 *
	 * "Architecture should recede into experience."
	 */

	import SEOHead from '$lib/components/SEOHead.svelte';
	import { getSiteConfigFromContext } from '$lib/config/context';

	const siteConfig = getSiteConfigFromContext();
</script>

<SEOHead
	title="Studio | {siteConfig.name}"
	description={siteConfig.studio.philosophy}
	canonical="/studio"
/>

<main class="studio-page">
	<!-- Header -->
	<header class="studio-header">
		<h1 class="studio-label">Studio</h1>
	</header>

	<!-- Philosophy -->
	<section class="studio-philosophy">
		<p class="philosophy-text">
			{siteConfig.studio.philosophy}
		</p>
	</section>

	<!-- Approach -->
	<section class="studio-approach">
		<h2 class="section-label">Approach</h2>
		<ul class="approach-list">
			{#each siteConfig.studio.approach as principle, index}
				<li class="approach-item" style="--index: {index}">
					<span class="approach-number">{String(index + 1).padStart(2, '0')}</span>
					<span class="approach-text">{principle}</span>
				</li>
			{/each}
		</ul>
	</section>

	<!-- Services -->
	<section class="studio-services">
		<h2 class="section-label">Services</h2>
		<ul class="services-list">
			{#each siteConfig.services as service}
				<li class="service-item">{service}</li>
			{/each}
		</ul>
	</section>

	<!-- Recognition -->
	{#if siteConfig.recognition.length > 0}
		<section class="studio-recognition">
			<h2 class="section-label">Recognition</h2>
			<ul class="recognition-list">
				{#each siteConfig.recognition as item}
					<li class="recognition-item">
						<span class="recognition-publication">{item.publication}</span>
						<span class="recognition-year">{item.year}</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- Team -->
	{#if siteConfig.studio.founders.length > 0}
		<section class="studio-team">
			<h2 class="section-label">Leadership</h2>
			<div class="team-grid">
				{#each siteConfig.studio.founders as founder}
					<article class="team-member">
						<div class="member-image-container">
							<img
								src={founder.image}
								alt={founder.name}
								class="member-image"
								loading="lazy"
							/>
						</div>
						<div class="member-info">
							<h3 class="member-name">{founder.name}</h3>
							<span class="member-role">{founder.role}</span>
							<p class="member-bio">{founder.bio}</p>
						</div>
					</article>
				{/each}
			</div>
		</section>
	{/if}
</main>

<style>
	.studio-page {
		background: var(--color-bg-pure);
		min-height: 100vh;
		padding-top: var(--space-3xl);
	}

	/* Header */
	.studio-header {
		max-width: var(--width-wide);
		margin: 0 auto;
		padding: 0 var(--space-lg) var(--space-xl);
	}

	.studio-label {
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
		letter-spacing: var(--tracking-wider);
		text-transform: uppercase;
	}

	/* Philosophy */
	.studio-philosophy {
		max-width: var(--width-wide);
		margin: 0 auto;
		padding: 0 var(--space-lg) var(--space-3xl);
		border-bottom: 1px solid var(--color-border-default);
	}

	.philosophy-text {
		font-size: var(--text-h1);
		font-weight: var(--font-light);
		color: var(--color-fg-primary);
		line-height: var(--leading-relaxed);
		max-width: var(--width-prose);
		letter-spacing: var(--tracking-tight);
	}

	/* Sections */
	.section-label {
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
		letter-spacing: var(--tracking-wider);
		text-transform: uppercase;
		margin-bottom: var(--space-lg);
	}

	/* Approach */
	.studio-approach {
		max-width: var(--width-wide);
		margin: 0 auto;
		padding: var(--space-2xl) var(--space-lg);
		border-bottom: 1px solid var(--color-border-default);
	}

	.approach-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.approach-item {
		display: flex;
		align-items: baseline;
		gap: var(--space-md);
		opacity: 0;
		animation: approach-fade 0.6s var(--ease-decelerate) forwards;
		animation-delay: calc(var(--index) * 0.1s);
	}

	@keyframes approach-fade {
		from {
			opacity: 0;
			transform: translateX(-10px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.approach-number {
		font-size: var(--text-caption);
		color: var(--color-fg-subtle);
		font-variant-numeric: tabular-nums;
	}

	.approach-text {
		font-size: var(--text-h3);
		font-weight: var(--font-light);
		color: var(--color-fg-primary);
	}

	/* Services */
	.studio-services {
		max-width: var(--width-wide);
		margin: 0 auto;
		padding: var(--space-2xl) var(--space-lg);
		border-bottom: 1px solid var(--color-border-default);
	}

	.services-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-md);
	}

	.service-item {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		padding: var(--space-sm) var(--space-md);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
	}

	/* Recognition */
	.studio-recognition {
		max-width: var(--width-wide);
		margin: 0 auto;
		padding: var(--space-2xl) var(--space-lg);
		border-bottom: 1px solid var(--color-border-default);
	}

	.recognition-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.recognition-item {
		display: flex;
		align-items: baseline;
		gap: var(--space-md);
	}

	.recognition-publication {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
	}

	.recognition-year {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Team */
	.studio-team {
		max-width: var(--width-wide);
		margin: 0 auto;
		padding: var(--space-2xl) var(--space-lg) var(--space-3xl);
	}

	.team-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-xl);
	}

	.team-member {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.member-image-container {
		aspect-ratio: 1;
		overflow: hidden;
		border-radius: var(--radius-sm);
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
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.member-role {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
	}

	.member-bio {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-top: var(--space-xs);
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.approach-item {
			animation: none;
			opacity: 1;
			transform: none;
		}

		.member-image {
			transition: none;
		}
	}
</style>
