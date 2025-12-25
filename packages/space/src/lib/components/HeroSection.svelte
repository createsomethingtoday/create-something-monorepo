<script lang="ts">
	/**
	 * Hero Section for createsomething.space
	 *
	 * Embodies Zuhandenheit (ready-to-hand) — tutorials are tools that recede into use.
	 * When learning, you don't think about the interface; you engage with the material.
	 *
	 * HERMENEUTIC REVEAL SEQUENCE:
	 * Identity (CREATE SOMETHING SPACE) → Offer (Interactive Tutorials) →
	 * Explanation (Learn by doing) → Affordance (CTA) → Content (Featured cards)
	 *
	 * This sequence respects cognitive temporality per Gadamer's fusion of horizons.
	 */
	import PaperCard from './PaperCard.svelte';
	import type { Paper } from '$lib/types/paper';

	interface Props {
		featuredPapers: Paper[];
	}

	let { featuredPapers }: Props = $props();
</script>

<section class="hero relative pt-32 pb-24 px-6 overflow-hidden">
	<div class="max-w-7xl mx-auto">
		<!-- Hero Text - Now First -->
		<div class="text-center space-y-6 mb-16">
			<div class="eyebrow animate-reveal" style="--delay: 0">
				CREATE SOMETHING SPACE
			</div>

			<h1 class="headline animate-reveal" style="--delay: 1">
				Interactive Tutorials for AI-Native Development
			</h1>

			<p class="description max-w-3xl mx-auto animate-reveal" style="--delay: 2">
				Learn by doing with runnable code examples and hands-on experiments. Fork, modify, and run these tutorials directly in your browser. Research methodology and full papers available on <a href="https://createsomething.io" class="link">createsomething.io</a>
			</p>

			<!-- CTA to Research -->
			<div class="mt-8 animate-reveal" style="--delay: 3">
				<a
					href="https://createsomething.io"
					target="_blank"
					rel="noopener noreferrer"
					class="cta-link inline-flex items-center gap-2 group"
				>
					<span class="cta-text">See the research methodology</span>
					<svg class="cta-arrow w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
					</svg>
				</a>
			</div>
		</div>

		<!-- Featured Tutorials Section -->
		{#if featuredPapers.length > 0}
			<div class="text-center mb-8 animate-reveal" style="--delay: 4">
				<h2 class="section-title">Featured Tutorials</h2>
				<p class="section-description mt-2">Start with these hands-on experiments</p>
			</div>

			<!-- Desktop Layout - Horizontal -->
			<div class="hidden md:flex justify-center items-center gap-6 max-w-6xl mx-auto">
				{#each featuredPapers.slice(0, 3) as paper, index (paper.id)}
					<div class="flex-1 max-w-xs animate-reveal" style="--delay: {5 + index}">
						<PaperCard {paper} rotation={0} {index} />
					</div>
				{/each}
			</div>

			<!-- Mobile Layout - Simple Stack -->
			<div class="grid grid-cols-1 gap-6 md:hidden">
				{#each featuredPapers.slice(0, 2) as paper, index (paper.id)}
					<div class="animate-reveal" style="--delay: {5 + index}">
						<PaperCard {paper} rotation={0} {index} />
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Background Gradient -->
	<div class="hero-background absolute inset-0 -z-10"></div>
</section>

<style>
	.hero {
		/* Layout only - keep Tailwind classes */
	}

	.eyebrow {
		font-size: var(--text-body);
		font-weight: 500;
		color: var(--color-fg-secondary);
		text-align: center;
	}

	@media (min-width: 768px) {
		.eyebrow {
			font-size: var(--text-body-lg);
		}
	}

	.headline {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
		line-height: 1.2;
		text-align: center;
	}

	.description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		text-align: center;
	}

	@media (min-width: 768px) {
		.description {
			font-size: 1.25rem;
		}
	}

	.link {
		color: var(--color-fg-secondary);
		text-decoration: underline;
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.link:hover {
		color: var(--color-fg-primary);
	}

	.cta-link {
		color: var(--color-fg-tertiary);
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.cta-link:hover {
		color: var(--color-fg-primary);
	}

	.cta-text {
		font-size: var(--text-body-sm);
	}

	@media (min-width: 768px) {
		.cta-text {
			font-size: var(--text-body);
		}
	}

	/* CTA Arrow: Explicit Canon motion token (not Tailwind default) */
	.cta-arrow {
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.cta-link:hover .cta-arrow {
		transform: translateX(4px);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
		text-align: center;
	}

	.section-description {
		color: var(--color-fg-tertiary);
		text-align: center;
	}

	.hero-background {
		background: linear-gradient(to bottom, var(--color-bg-pure), var(--color-bg-pure), var(--color-bg-elevated));
	}

	/* ==========================================================================
	   STAGGERED REVEAL: Hermeneutic Scaffolding
	   Identity → Offer → Explanation → Affordance → Content
	   Understanding unfolds temporally; this sequence respects cognitive load.
	   ========================================================================== */

	.animate-reveal {
		opacity: 0;
		transform: translateY(16px);
		animation: reveal var(--duration-complex) var(--ease-standard) forwards;
		animation-delay: calc(var(--delay, 0) * 100ms);
	}

	@keyframes reveal {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Respect reduced motion preference */
	@media (prefers-reduced-motion: reduce) {
		.animate-reveal {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
