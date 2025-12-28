<script lang="ts">
	import type { PageData } from './$types';
	import HeroSection from '$lib/components/HeroSection.svelte';
	import RelatedResearch from '$lib/components/RelatedResearch.svelte';
	import LearningPathsSection from '$lib/components/LearningPathsSection.svelte';
	import { SEO } from '@create-something/components';

	let { data }: { data: PageData } = $props();
	const { papers } = data;

	// Sort all papers by date (newest first) for hero display
	const sortedPapers = [...papers].sort((a, b) => {
		const aDate = new Date(a.published_at || a.created_at || 0).getTime();
		const bDate = new Date(b.published_at || b.created_at || 0).getTime();
		return bDate - aDate;
	});
</script>

<SEO
	title="Interactive AI Development Tutorials"
	description="Learn AI-native development by doing. Interactive tutorials with runnable code — fork, modify, and run directly in your browser. Research papers available on createsomething.io"
	keywords="AI-native development, interactive tutorials, Claude Code, Cloudflare Workers, runnable code, hands-on learning, developer education"
	ogImage="/og-image.svg"
	propertyName="space"
/>

<!-- Hero Section with All Tutorials -->
<HeroSection featuredPapers={sortedPapers} />

<!-- Cross-property links to .io Research -->
<RelatedResearch />

<!-- Cross-property links to .lms Learning -->
<LearningPathsSection />

<!-- Ecosystem Navigation -->
<section class="ecosystem">
	<div class="ecosystem-container">
		<p class="ecosystem-label">The Hermeneutic Circle</p>
		<h2 class="ecosystem-heading">Practice becomes application</h2>
		<p class="ecosystem-description">
			.space teaches through doing. .io provides the research. .agency applies it professionally. .ltd defines the standards.
		</p>

		<div class="ecosystem-grid">
			<a href="https://createsomething.io" class="ecosystem-card" target="_blank" rel="noopener">
				<span class="property-tag">.io</span>
				<h3 class="property-name">Research</h3>
				<p class="property-desc">Papers and experiments. The theory behind what you're learning.</p>
			</a>

			<a href="https://createsomething.agency" class="ecosystem-card" target="_blank" rel="noopener">
				<span class="property-tag">.agency</span>
				<h3 class="property-name">Apply</h3>
				<p class="property-desc">See these patterns in production. Client work at the highest standard.</p>
			</a>

			<a href="https://createsomething.ltd/patterns/crystallization" class="ecosystem-card" target="_blank" rel="noopener">
				<span class="property-tag">.ltd</span>
				<h3 class="property-name">Canon</h3>
				<p class="property-desc">The philosophy of crystallization. Human judgment encoded for AI execution.</p>
			</a>
		</div>
	</div>
</section>

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
