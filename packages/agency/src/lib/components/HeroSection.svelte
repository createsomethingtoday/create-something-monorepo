<script lang="ts">
	import PaperCard from './PaperCard.svelte';
	import type { Paper } from '$lib/types/paper';

	interface Props {
		featuredPapers: Paper[];
	}

	let { featuredPapers }: Props = $props();
</script>

<section class="hero relative pt-32 pb-24 px-6 overflow-hidden">
	<div class="max-w-7xl mx-auto">
		<!-- Newsletter Signup - Top -->
		<div class="flex justify-center mb-12 animate-reveal" style="--delay: 0">
			<a href="#newsletter" class="newsletter-cta inline-flex items-center gap-2 px-6 py-3">
				<span>Get weekly updates with our Newsletter</span>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
				</svg>
			</a>
		</div>

		<!-- Featured Cards - Horizontal Layout -->
		{#if featuredPapers.length > 0}
			<div class="mt-11 mb-16 hidden md:flex justify-center items-center gap-6 max-w-6xl mx-auto">
				{#each featuredPapers.slice(0, 3) as paper, index (paper.id)}
					<div class="flex-1 max-w-xs animate-reveal" style="--delay: {1 + index}">
						<PaperCard {paper} rotation={0} {index} />
					</div>
				{/each}
			</div>
		{/if}

		<!-- Mobile Featured Cards - Simple Stack -->
		{#if featuredPapers.length > 0}
			<div class="grid grid-cols-1 gap-6 mb-16 md:hidden">
				{#each featuredPapers.slice(0, 2) as paper, index (paper.id)}
					<div class="animate-reveal" style="--delay: {1 + index}">
						<PaperCard {paper} rotation={0} {index} />
					</div>
				{/each}
			</div>
		{/if}

		<!-- Hero Text -->
		<div class="text-center space-y-6 mt-16">
			<div class="hero-label animate-reveal" style="--delay: 4">
				CREATE SOMETHING SPACE
			</div>

			<h1 class="hero-title animate-reveal" style="--delay: 5">
				The Experimental Layer
			</h1>

			<p class="hero-description max-w-3xl mx-auto animate-reveal" style="--delay: 6">
				Community playground for testing ideas. Fork experiments, break things, learn in public.
				Every experiment here feeds back into the research at <a href="https://createsomething.io" class="hero-link">createsomething.io</a>
			</p>

			<!-- CTA to Research -->
			<div class="mt-8 animate-reveal" style="--delay: 7">
				<a href="https://createsomething.io" target="_blank" rel="noopener noreferrer" class="research-link group inline-flex items-center gap-2">
					<span>See the research methodology</span>
					<svg class="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
					</svg>
				</a>
			</div>
		</div>
	</div>

	<!-- Background Gradient -->
	<div class="hero-bg absolute inset-0 -z-10"></div>
</section>

<style>
	.hero {
		background: var(--color-bg-pure);
	}

	.newsletter-cta {
		background: var(--color-active);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-full);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.newsletter-cta:hover {
		background: var(--color-border-emphasis);
		border-color: var(--color-border-strong);
	}

	.hero-label {
		font-size: clamp(1rem, 2vw, 1.125rem);
		font-weight: 500;
		color: var(--color-fg-secondary);
	}

	.hero-title {
		font-size: var(--text-display);
		font-weight: 700;
		color: var(--color-fg-primary);
		line-height: 1.1;
	}

	.hero-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
	}

	.hero-link {
		color: var(--color-fg-primary);
		text-decoration: underline;
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.hero-link:hover {
		color: var(--color-fg-secondary);
	}

	.research-link {
		color: var(--color-fg-muted);
		font-size: clamp(0.875rem, 1.5vw, 1rem);
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.research-link:hover {
		color: var(--color-fg-primary);
	}

	.hero-bg {
		background: linear-gradient(to bottom, var(--color-bg-pure), var(--color-bg-pure), var(--color-bg-elevated));
	}

	/* Staggered reveal animation - CSS only */
	.animate-reveal {
		opacity: 0;
		transform: translateY(16px);
		animation: reveal 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
		animation-delay: calc(var(--delay, 0) * 100ms);
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
