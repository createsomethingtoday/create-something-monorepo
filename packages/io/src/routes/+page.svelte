<script lang="ts">
	/**
	 * createsomething.io Landing Page
	 *
	 * The entry point presents two paths:
	 *   - Experiments (Zuhandenheit) → Engaged practice
	 *   - Papers (Vorhandenheit) → Detached analysis
	 *
	 * Featured experiments are showcased below the hero.
	 */
	import type { PageData } from './$types';
	import HeroSection from '$lib/components/HeroSection.svelte';
	import { PapersGrid, SEO, NewsletterSignup } from '@create-something/components';

	let { data }: { data: PageData } = $props();
	const { papers } = data;

	// Featured experiments sorted by newest first
	const featuredExperiments = papers
		.filter((p) => p.featured || p.is_file_based)
		.sort((a, b) => {
			const aDate = new Date(a.published_at || a.created_at || 0).getTime();
			const bDate = new Date(b.published_at || b.created_at || 0).getTime();
			return bDate - aDate;
		})
		.slice(0, 6);
</script>

<SEO
	title="AI-Native Development Research"
	description="Systems thinking for AI-native development. Experiments demonstrate through practice; papers ground through analysis. Both paths connect through the hermeneutic circle."
	keywords="AI-native development, Claude Code, Cloudflare Workers, experiments, research papers, systems thinking, Zuhandenheit, Vorhandenheit"
	ogImage="/og-image.svg"
	propertyName="io"
/>

<!-- Hero Section with Two Paths -->
<HeroSection />

<!-- Featured Experiments -->
{#if featuredExperiments.length > 0}
	<PapersGrid
		papers={featuredExperiments}
		title="Featured Experiments"
		subtitle="Interactive demonstrations where tools recede into use"
	/>
{/if}

<!-- Ecosystem Navigation -->
<section class="ecosystem">
	<div class="ecosystem-container">
		<p class="ecosystem-label">The Hermeneutic Circle</p>
		<h2 class="ecosystem-heading">Research flows into practice</h2>
		<p class="ecosystem-description">
			.io documents what works. .space teaches it. .agency applies it. .ltd defines why it matters.
		</p>

		<div class="ecosystem-grid">
			<a href="https://createsomething.space" class="ecosystem-card" target="_blank" rel="noopener">
				<span class="property-tag">.space</span>
				<h3 class="property-name">Practice</h3>
				<p class="property-desc">Interactive tutorials. Learn by doing what research discovers.</p>
			</a>

			<a href="https://createsomething.agency" class="ecosystem-card" target="_blank" rel="noopener">
				<span class="property-tag">.agency</span>
				<h3 class="property-name">Apply</h3>
				<p class="property-desc">Client work held to research standards. Theory becomes delivery.</p>
			</a>

			<a href="https://createsomething.ltd/patterns/crystallization" class="ecosystem-card" target="_blank" rel="noopener">
				<span class="property-tag">.ltd</span>
				<h3 class="property-name">Canon</h3>
				<p class="property-desc">The philosophical foundation. Crystallized judgment that guides all work.</p>
			</a>
		</div>
	</div>
</section>

<!-- Newsletter CTA -->
<NewsletterSignup
	headline="Get the monthly research digest"
	description="Papers, experiments, and patterns—delivered."
	source="io-homepage"
/>

<style>
	.ecosystem {
		padding: var(--space-2xl) var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.ecosystem-container {
		max-width: 1000px;
		margin: 0 auto;
		text-align: center;
	}

	.ecosystem-label {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.ecosystem-heading {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.ecosystem-description {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		max-width: 600px;
		margin: 0 auto var(--space-xl);
	}

	.ecosystem-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-lg);
	}

	.ecosystem-card {
		display: block;
		padding: var(--space-lg);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-align: left;
		transition: border-color var(--duration-micro) var(--ease-standard),
					background var(--duration-micro) var(--ease-standard);
	}

	.ecosystem-card:hover {
		border-color: var(--color-border-emphasis);
		background: var(--color-bg-surface);
	}

	.property-tag {
		font-size: var(--text-caption);
		font-family: monospace;
		color: var(--color-fg-muted);
	}

	.property-name {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: var(--space-xs) 0;
	}

	.property-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
	}

	@media (max-width: 768px) {
		.ecosystem-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
