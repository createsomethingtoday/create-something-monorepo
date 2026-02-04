<script lang="ts">
	import type { PageData } from './$types';
	import HeroSection from '$lib/components/HeroSection.svelte';
	import { RelatedResearch, LearningPathsSection } from '@create-something/canon/domains/space';
	import { SEO } from '@create-something/canon';

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
		<p class="ecosystem-label">The Creation Moat</p>
		<h2 class="ecosystem-heading">MCP integration experiments</h2>
		<p class="ecosystem-description">
			.space validates MCP patterns through experimentation. .io documents them. .agency builds custom MCPs for clients.
		</p>

		<div class="ecosystem-grid highlight-grid">
			<a href="https://createsomething.io" class="ecosystem-card highlight-item" style="--index: 0" target="_blank" rel="noopener">
				<span class="property-tag">.io</span>
				<h3 class="property-name">Patterns</h3>
				<p class="property-desc">MCP reference implementations. Validated patterns for builders.</p>
			</a>

			<a href="https://createsomething.agency" class="ecosystem-card highlight-item" style="--index: 1" target="_blank" rel="noopener">
				<span class="property-tag">.agency</span>
				<h3 class="property-name">Build</h3>
				<p class="property-desc">Custom MCP development. The creation moat applied to your business.</p>
			</a>

			<a href="https://createsomething.ltd" class="ecosystem-card highlight-item" style="--index: 2" target="_blank" rel="noopener">
				<span class="property-tag">.ltd</span>
				<h3 class="property-name">Philosophy</h3>
				<p class="property-desc">Why creation matters more than consumption. MCP as the chassis.</p>
			</a>
		</div>
	</div>
</section>

<style>
	.ecosystem {
		padding: var(--space-xl) var(--space-lg);
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
		/* Cascade entrance */
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
