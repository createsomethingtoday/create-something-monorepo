<script lang="ts">
	/**
	 * Attorney Detail Page
	 * Full profile with credentials, education, practice areas
	 */

	import { SEO } from '@create-something/components';
	import { getSiteConfigFromContext } from '$lib/config/context';
	import EthicsDisclaimer from '$lib/components/EthicsDisclaimer.svelte';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
	const { attorney, accidentTypes } = data;

	const siteConfig = getSiteConfigFromContext();

	// Get focus area details (accident types the attorney handles)
	const attorneyFocusAreas = (attorney.focusAreas || [])
		.map((slug) => accidentTypes.find((t) => t.slug === slug))
		.filter(Boolean);
</script>

<SEO
	title="{attorney.name} - {attorney.title}"
	description="{attorney.bio.slice(0, 160)}..."
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Attorneys', url: '/attorneys' },
		{ name: attorney.name, url: `/attorneys/${attorney.slug}` }
	]}
/>

<main class="attorney-page">
	<section class="attorney-hero">
		<div class="container">
			<a href="/attorneys" class="back-link">← All Attorneys</a>

			<div class="hero-content">
				<div class="hero-image-container">
					<img
						src={attorney.image}
						alt={attorney.name}
						class="hero-image"
					/>
				</div>

				<div class="hero-info">
					<h1 class="attorney-name">{attorney.name}</h1>
					<p class="attorney-title">{attorney.title}</p>
					<p class="attorney-bar">{attorney.barNumber}</p>

					<div class="quick-info">
						<div class="info-item">
							<span class="info-label">Admitted</span>
							<span class="info-value">{attorney.admittedStates.join(', ')}</span>
						</div>
					</div>

					<a href="/free-case-review" class="cta-button">Free Case Review</a>
				</div>
			</div>
		</div>
	</section>

	<section class="attorney-details">
		<div class="container">
			<div class="details-grid">
				<div class="bio-section">
					<h2 class="section-title">About</h2>
					<p class="bio-text">{attorney.bio}</p>
				</div>

				<aside class="sidebar">
					<div class="sidebar-section">
						<h3 class="sidebar-title">Education</h3>
						<ul class="education-list">
							{#each attorney.education as edu}
								<li class="education-item">
									<span class="edu-degree">{edu.degree}</span>
									<span class="edu-school">{edu.school}</span>
									<span class="edu-year">{edu.year}</span>
								</li>
							{/each}
						</ul>
					</div>

					<div class="sidebar-section">
						<h3 class="sidebar-title">Focus Areas</h3>
						<ul class="practice-list">
							{#each attorneyFocusAreas as area}
								{#if area}
									<li>
										<a href="/accident-types/{area.slug}" class="practice-link">
											{area.name}
										</a>
									</li>
								{/if}
							{/each}
						</ul>
					</div>

					<div class="sidebar-section">
						<h3 class="sidebar-title">Contact</h3>
						<p class="contact-text">
							To discuss your case with {attorney.name.split(' ')[0]},
							please call <a href="tel:{siteConfig.phone}">{siteConfig.phone}</a>
							or <a href="/free-case-review">request a free case review</a>.
						</p>
					</div>
				</aside>
			</div>
		</div>
	</section>

	<EthicsDisclaimer />
</main>

<style>
	.attorney-page {
		background: var(--color-bg-pure);
		min-height: 100vh;
	}

	.attorney-hero {
		padding: var(--space-xl) var(--space-lg);
		padding-top: calc(var(--space-xl) + 80px);
		background: var(--color-bg-elevated);
	}

	.container {
		max-width: 1000px;
		margin: 0 auto;
	}

	.back-link {
		display: inline-block;
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		text-decoration: none;
		margin-bottom: var(--space-lg);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover {
		color: var(--color-fg-primary);
	}

	.hero-content {
		display: grid;
		grid-template-columns: 280px 1fr;
		gap: var(--space-xl);
		align-items: start;
	}

	.hero-image-container {
		aspect-ratio: 3 / 4;
		overflow: hidden;
		border-radius: var(--radius-lg);
		background: var(--color-bg-subtle);
	}

	.hero-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.attorney-name {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
	}

	.attorney-title {
		font-size: var(--text-h3);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-xs);
	}

	.attorney-bar {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		font-family: var(--font-mono);
		margin: 0 0 var(--space-md);
	}

	.quick-info {
		margin-bottom: var(--space-lg);
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.info-label {
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.info-value {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
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

	.attorney-details {
		padding: var(--space-xl) var(--space-lg);
	}

	.details-grid {
		display: grid;
		grid-template-columns: 1fr 300px;
		gap: var(--space-xl);
	}

	.section-title {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		margin: 0 0 var(--space-md);
	}

	.bio-text {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: 1.8;
		margin: 0;
	}

	.sidebar-section {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-md);
	}

	.sidebar-title {
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		color: var(--color-fg-tertiary);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		margin: 0 0 var(--space-sm);
	}

	.education-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.education-item {
		display: flex;
		flex-direction: column;
		padding: var(--space-xs) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.education-item:last-child {
		border-bottom: none;
	}

	.edu-degree {
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.edu-school {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.edu-year {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.practice-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.practice-list li {
		padding: var(--space-xs) 0;
	}

	.practice-link {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.practice-link:hover {
		color: var(--color-fg-primary);
	}

	.contact-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin: 0;
	}

	.contact-text a {
		color: var(--color-fg-primary);
		text-decoration: underline;
	}

	@media (max-width: 768px) {
		.attorney-hero {
			padding: var(--space-lg) var(--space-md);
			padding-top: calc(var(--space-lg) + 60px);
		}

		.hero-content {
			grid-template-columns: 1fr;
			gap: var(--space-lg);
		}

		.hero-image-container {
			max-width: 200px;
		}

		.attorney-details {
			padding: var(--space-lg) var(--space-md);
		}

		.details-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
