<script lang="ts">
	import type { AssessmentResult } from '$lib/services/assessment';

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

	<!-- 4. Case study link (natural flow, no label) -->
	<a
		href={result.recommendation.caseStudy}
		class="case-study-link animate-reveal"
		style="--delay: 6"
	>
		{result.recommendation.caseStudyName} →
	</a>

	<!-- 5. Primary CTA last -->
	<a
		href="/contact?service={result.recommendation.service}&assessment={sessionId}"
		class="primary-cta animate-reveal"
		style="--delay: 8"
	>
		Let's discuss your situation
	</a>
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

	.case-study-link {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.case-study-link:hover {
		color: var(--color-fg-primary);
	}

	.primary-cta {
		display: block;
		padding: 0.875rem 2rem;
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
