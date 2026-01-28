<script lang="ts">
	/**
	 * createsomething.io Landing Page
	 *
	 * Two paths to the same understanding:
	 *   - Experiments: Try it yourself, see what happens
	 *   - Papers: Read the analysis, understand the patterns
	 *
	 * Featured experiments are showcased below the hero.
	 */
	import type { PageData } from './$types';
	import { HeroSection } from '@create-something/canon/domains/io';
	import { PapersGrid, SEO, NewsletterSignup } from '@create-something/canon';

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
	description="47 tracked experiments. 15 research papers. Real data on what works in AI-native development—time, cost, and outcomes."
	keywords="AI-native development, Claude Code, Cloudflare Workers, experiments, research papers, systems thinking"
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
		subtitle="Try these yourself—each tracks time, cost, and what actually worked"
	/>
{/if}

<!-- Ecosystem Navigation -->
<section class="ecosystem">
	<div class="ecosystem-container">
		<p class="ecosystem-label">The CREATE SOMETHING Ecosystem</p>
		<h2 class="ecosystem-heading">Research flows into practice</h2>
		<p class="ecosystem-description">
			.io documents what works. .space teaches it. .agency applies it to client work.
		</p>

		<div class="ecosystem-grid highlight-grid">
			<a href="https://createsomething.space" class="ecosystem-card highlight-item" style="--index: 0" target="_blank" rel="noopener">
				<span class="property-tag">.space</span>
				<h3 class="property-name">Learn</h3>
				<p class="property-desc">Step-by-step tutorials. Build what we've researched.</p>
			</a>

			<a href="https://createsomething.agency" class="ecosystem-card highlight-item" style="--index: 1" target="_blank" rel="noopener">
				<span class="property-tag">.agency</span>
				<h3 class="property-name">Apply</h3>
				<p class="property-desc">Client projects using these methods. Real results, real timelines.</p>
			</a>

			<a href="https://createsomething.ltd/patterns/crystallization" class="ecosystem-card highlight-item" style="--index: 2" target="_blank" rel="noopener">
				<span class="property-tag">.ltd</span>
				<h3 class="property-name">Why</h3>
				<p class="property-desc">The principles behind the methodology. Design philosophy made explicit.</p>
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
		transition: all var(--duration-micro) var(--ease-standard);
		/* Cascade entrance animation */
		opacity: 0;
		animation: cardReveal var(--duration-standard) var(--ease-standard) forwards;
		animation-delay: calc(var(--index, 0) * var(--cascade-step));
	}

	.ecosystem-card:hover {
		transform: scale(var(--scale-micro));
		border-color: var(--color-border-emphasis);
		background: var(--color-bg-surface);
	}

	.ecosystem-card:active {
		transform: scale(var(--scale-subtle));
	}

	@keyframes cardReveal {
		from {
			opacity: 0;
			transform: translateY(16px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.ecosystem-card {
			animation: none;
			opacity: 1;
		}
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
