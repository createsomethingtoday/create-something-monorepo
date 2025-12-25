<script lang="ts">
	import type { AssessmentResult } from '$lib/services/assessment';
	import { offeringMetadata } from '$lib/services/assessment';

	interface Props {
		result: AssessmentResult;
		sessionId: string;
	}

	let { result, sessionId }: Props = $props();

	// Triad level icons (ASCII-style)
	const triadIcons: Record<string, string> = {
		implementation: '{ }',
		artifact: '[ ]',
		system: '( )'
	};

	// Get the offering metadata for richer display
	const offering = $derived(offeringMetadata[result.recommendation.offering]);
	const isProduct = $derived(result.recommendation.isProductized);
</script>

<!-- Orchestrated reveal: arrival, not completion -->
<div class="insight-container">
	<!-- 1. Triad icon emerges first -->
	<span class="triad-icon animate-reveal" style="--delay: 0">
		{triadIcons[result.analysis.triadLevel]}
	</span>

	<!-- 2. Headline -->
	<h2 class="insight-headline animate-reveal" style="--delay: 2">
		{result.recommendation.headline}
	</h2>

	<!-- 3. Insight paragraph -->
	<p class="insight-text animate-reveal" style="--delay: 4">
		{result.recommendation.insight}
	</p>

	<!-- 4. Recommendation card - single offering -->
	<div class="recommendation-card animate-reveal" style="--delay: 6">
		<span class="recommendation-label">We recommend</span>
		<h3 class="recommendation-title">{result.recommendation.offeringName}</h3>
		<p class="recommendation-description">{offering.description}</p>
	</div>

	<!-- 5. Case study link (context) -->
	<a
		href={result.recommendation.caseStudy}
		class="case-study-link animate-reveal"
		style="--delay: 8"
	>
		See how this works: {result.recommendation.caseStudyName} →
	</a>

	<!-- 6. Primary CTA - different based on tier -->
	{#if isProduct}
		<a
			href="/products/{result.recommendation.offering}?assessment={sessionId}"
			class="primary-cta animate-reveal"
			style="--delay: 10"
		>
			Get started with {result.recommendation.offeringName}
		</a>
	{:else}
		<a
			href="/contact?service={result.recommendation.offering}&assessment={sessionId}"
			class="primary-cta animate-reveal"
			style="--delay: 10"
		>
			Let's discuss your situation
		</a>
	{/if}

	<!-- 7. Alternative path -->
	<p class="alternative-text animate-reveal" style="--delay: 12">
		{#if isProduct}
			Looking for deeper partnership? <a href="/services" class="alt-link">Explore consulting services</a>
		{:else}
			Want to start smaller? <a href="/products" class="alt-link">View products</a>
		{/if}
	</p>
</div>

<style>
	.insight-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-lg);
		width: 100%;
		max-width: 480px;
		text-align: center;
	}

	.triad-icon {
		font-family: var(--font-mono);
		font-size: var(--text-h1);
		color: var(--color-fg-tertiary);
		letter-spacing: 0.2em;
	}

	.insight-headline {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		max-width: 24ch;
		line-height: var(--leading-tight);
		letter-spacing: var(--tracking-tight);
	}

	.insight-text {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		max-width: 48ch;
	}

	.recommendation-card {
		width: 100%;
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-align: center;
	}

	.recommendation-label {
		display: block;
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
	}

	.recommendation-title {
		font-size: var(--text-h3);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.recommendation-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.case-study-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.case-study-link:hover {
		color: var(--color-fg-primary);
	}

	.primary-cta {
		display: block;
		padding: var(--space-sm) var(--space-lg);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		border-radius: var(--radius-full);
		text-align: center;
		transition: opacity var(--duration-standard) var(--ease-standard);
		margin-top: var(--space-sm);
	}

	.primary-cta:hover {
		opacity: 0.9;
	}

	.alternative-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.alt-link {
		color: var(--color-fg-tertiary);
		text-decoration: underline;
		text-underline-offset: 2px;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.alt-link:hover {
		color: var(--color-fg-primary);
	}

	/* Staggered reveal animation - CSS only */
	.animate-reveal {
		opacity: 0;
		transform: translateY(12px);
		animation: reveal 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
		animation-delay: calc(var(--delay, 0) * 150ms);
	}

	@keyframes reveal {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-reveal {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
