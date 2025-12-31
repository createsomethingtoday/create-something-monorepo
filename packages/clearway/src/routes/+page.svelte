<script lang="ts">
	// CLEARWAY Landing Page
	// The infrastructure disappears; courts get booked.

	import { onMount } from 'svelte';
	import {
		HeroSection,
		ProblemSection,
		StackShowcase,
		ValueGrid,
		PricingSection,
		ProgressiveForm,
		Footer
	} from '$lib/components/landing';

	// Scroll-triggered section reveals (Canon: --duration-slow = 700ms max)
	onMount(() => {
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (prefersReducedMotion) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						entry.target.classList.add('revealed');
						observer.unobserve(entry.target);
					}
				});
			},
			{ threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
		);

		document.querySelectorAll('.reveal-section').forEach((el) => observer.observe(el));
		return () => observer.disconnect();
	});
</script>

<svelte:head>
	<title>CLEARWAY - Autonomous Court Scheduling</title>
	<meta
		name="description"
		content="The infrastructure disappears; courts get booked. AI-powered court reservation that handles scheduling, waitlists, and optimization autonomously."
	/>
	<meta property="og:title" content="CLEARWAY - Autonomous Court Scheduling" />
	<meta
		property="og:description"
		content="The infrastructure disappears; courts get booked."
	/>
	<meta property="og:type" content="website" />
</svelte:head>

<main>
	<HeroSection />
	<div class="reveal-section">
		<ProblemSection />
	</div>
	<div class="reveal-section">
		<StackShowcase />
	</div>
	<div class="reveal-section">
		<ValueGrid />
	</div>
	<div class="reveal-section">
		<PricingSection />
	</div>
	<div class="reveal-section" id="request-demo">
		<ProgressiveForm />
	</div>
	<Footer />
</main>

<style>
	main {
		min-height: 100vh;
	}

	/* Scroll-triggered reveals (Canon: --duration-slow = 700ms max) */
	.reveal-section {
		opacity: 0;
		transform: translateY(24px);
		transition:
			opacity var(--duration-slow, 700ms) var(--ease-decelerate, cubic-bezier(0.0, 0.0, 0.2, 1)),
			transform var(--duration-slow, 700ms) var(--ease-decelerate, cubic-bezier(0.0, 0.0, 0.2, 1));
	}

	.reveal-section.revealed {
		opacity: 1;
		transform: translateY(0);
	}

	/* Respect reduced motion preference */
	@media (prefers-reduced-motion: reduce) {
		.reveal-section {
			opacity: 1;
			transform: none;
			transition: none;
		}
	}
</style>
