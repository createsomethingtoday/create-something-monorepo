<script lang="ts">
	// Court Lines Background
	// Subtle parallax court lines that follow the scroll
	// Zuhandenheit: The infrastructure recedes; the atmosphere remains
	import { onMount } from 'svelte';

	let scrollY = $state(0);
	let windowHeight = $state(1000);
	let documentHeight = $state(2000);

	// Calculate scroll progress (0 to 1)
	let scrollProgress = $derived(
		Math.min(1, scrollY / (documentHeight - windowHeight))
	);

	// Parallax offset - lines move slower than scroll (creates depth)
	let parallaxOffset = $derived(scrollY * 0.15);

	// Rotation based on scroll (very subtle)
	let rotation = $derived(scrollProgress * 3);

	// Opacity fades slightly as you scroll deeper
	let opacity = $derived(0.04 + (1 - scrollProgress) * 0.03);

	onMount(() => {
		// Respect reduced motion
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (prefersReducedMotion) {
			return;
		}

		windowHeight = window.innerHeight;
		documentHeight = document.documentElement.scrollHeight;

		const handleScroll = () => {
			scrollY = window.scrollY;
			documentHeight = document.documentElement.scrollHeight;
		};

		const handleResize = () => {
			windowHeight = window.innerHeight;
			documentHeight = document.documentElement.scrollHeight;
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		window.addEventListener('resize', handleResize, { passive: true });

		return () => {
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('resize', handleResize);
		};
	});
</script>

<div
	class="court-lines-bg"
	style="
		--parallax-offset: {parallaxOffset}px;
		--rotation: {rotation}deg;
		--opacity: {opacity};
	"
>
	<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
		<!-- Outer boundary -->
		<line x1="20" y1="20" x2="380" y2="20" stroke="currentColor" stroke-width="1"/>
		<line x1="380" y1="20" x2="380" y2="280" stroke="currentColor" stroke-width="1"/>
		<line x1="380" y1="280" x2="20" y2="280" stroke="currentColor" stroke-width="1"/>
		<line x1="20" y1="280" x2="20" y2="20" stroke="currentColor" stroke-width="1"/>

		<!-- Center lines -->
		<line x1="200" y1="20" x2="200" y2="280" stroke="currentColor" stroke-width="1"/>
		<line x1="20" y1="150" x2="380" y2="150" stroke="currentColor" stroke-width="1"/>

		<!-- Service lines -->
		<line x1="80" y1="80" x2="80" y2="220" stroke="currentColor" stroke-width="0.75"/>
		<line x1="320" y1="80" x2="320" y2="220" stroke="currentColor" stroke-width="0.75"/>

		<!-- Kitchen/non-volley lines -->
		<line x1="20" y1="100" x2="380" y2="100" stroke="currentColor" stroke-width="0.5"/>
		<line x1="20" y1="200" x2="380" y2="200" stroke="currentColor" stroke-width="0.5"/>
	</svg>
</div>

<style>
	.court-lines-bg {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		overflow: hidden;
		color: rgba(255, 255, 255, var(--opacity, 0.05));
	}

	.court-lines-bg svg {
		position: absolute;
		width: 150%;
		height: 150%;
		top: 50%;
		left: 50%;
		transform:
			translate(-50%, calc(-50% + var(--parallax-offset, 0px)))
			rotate(var(--rotation, 0deg));
		transition: color 300ms ease;
	}

	/* Hide on hero section (hero has its own animated lines) */
	:global(body:has(.hero:not(.hero-complete))) .court-lines-bg {
		opacity: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.court-lines-bg svg {
			transform: translate(-50%, -50%);
			transition: none;
		}
	}

	/* Fade out background lines when viewport is narrow (mobile) */
	@media (max-width: 768px) {
		.court-lines-bg {
			opacity: 0.5;
		}
	}
</style>
