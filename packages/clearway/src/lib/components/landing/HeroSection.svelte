<script lang="ts">
	// CLEARWAY Hero Section
	// The path opens; obstruction dissolves
	// Court lines draw → CLEAR slides left, WAY slides right → they meet
	import { onMount } from 'svelte';

	let phase: 'lines' | 'title' | 'content' = 'lines';

	onMount(() => {
		// Respect reduced motion preference
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (prefersReducedMotion) {
			phase = 'content';
			return;
		}

		// Sequence:
		// 0-2s: Lines draw in
		// 2s: Lines fade, CLEAR←  →WAY converge
		// 2.7s: Tagline + CTA fade in
		const titleTimer = setTimeout(() => {
			phase = 'title';
		}, 2000);

		const contentTimer = setTimeout(() => {
			phase = 'content';
		}, 2700);

		return () => {
			clearTimeout(titleTimer);
			clearTimeout(contentTimer);
		};
	});
</script>

<section class="hero">
	<!-- Court lines SVG - draws in then fades -->
	<div class="court-lines" class:fade-out={phase !== 'lines'}>
		<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
			<!-- Outer boundary - 4 separate lines for proper animation -->
			<line x1="20" y1="20" x2="380" y2="20" stroke="rgba(255,255,255,0.3)" stroke-width="2" class="line line-1a"/>
			<line x1="380" y1="20" x2="380" y2="280" stroke="rgba(255,255,255,0.3)" stroke-width="2" class="line line-1b"/>
			<line x1="380" y1="280" x2="20" y2="280" stroke="rgba(255,255,255,0.3)" stroke-width="2" class="line line-1c"/>
			<line x1="20" y1="280" x2="20" y2="20" stroke="rgba(255,255,255,0.3)" stroke-width="2" class="line line-1d"/>
			<!-- Center lines -->
			<line x1="200" y1="20" x2="200" y2="280" stroke="rgba(255,255,255,0.3)" stroke-width="2" class="line line-2"/>
			<line x1="20" y1="150" x2="380" y2="150" stroke="rgba(255,255,255,0.3)" stroke-width="2" class="line line-3"/>
			<!-- Service line left -->
			<line x1="80" y1="80" x2="80" y2="220" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" class="line line-4"/>
			<!-- Service line right -->
			<line x1="320" y1="80" x2="320" y2="220" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" class="line line-5"/>
			<!-- Kitchen/non-volley (pickleball) -->
			<line x1="20" y1="100" x2="380" y2="100" stroke="rgba(255,255,255,0.15)" stroke-width="1" class="line line-6"/>
			<line x1="20" y1="200" x2="380" y2="200" stroke="rgba(255,255,255,0.15)" stroke-width="1" class="line line-7"/>
		</svg>
	</div>

	<div class="hero-content">
		<h1 class="hero-title">
			<span class="title-clear" class:visible={phase !== 'lines'}>CLEAR</span><span class="title-way" class:visible={phase !== 'lines'}>WAY</span>
		</h1>
		<p class="hero-tagline" class:visible={phase === 'content'}>
			When scheduling works, you forget it exists.
		</p>
		<p class="hero-subtitle" class:visible={phase === 'content'}>
			CLEARWAY doesn't automate court booking. It removes the need to think about it.
		</p>
		<div class="hero-cta" class:visible={phase === 'content'}>
			<a href="#showcase" class="btn btn-primary">See It Disappear</a>
			<a href="#request-demo" class="btn btn-secondary">Start Free</a>
		</div>
	</div>
</section>

<style>
	.hero {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-xl, 4rem) var(--space-md, 1.5rem);
		background: var(--color-bg-pure, #000);
		position: relative;
		overflow: hidden;
	}

	/* Court lines - draws in then fades */
	.court-lines {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: opacity 700ms cubic-bezier(0.0, 0.0, 0.2, 1);
	}

	.court-lines svg {
		width: 100%;
		height: 100%;
		max-width: 80vw;
		max-height: 60vh;
	}

	.court-lines.fade-out {
		opacity: 0;
	}

	/* SVG line draw animation - builds in over ~1.8s */
	.line {
		stroke-dasharray: 1000;
		stroke-dashoffset: 1000;
		animation: drawLine 1s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
	}

	/* Staggered reveal - boundary traces around, then inner details */
	.line-1a { animation-delay: 0ms; }     /* Top boundary */
	.line-1b { animation-delay: 150ms; }   /* Right boundary */
	.line-1c { animation-delay: 300ms; }   /* Bottom boundary */
	.line-1d { animation-delay: 450ms; }   /* Left boundary */
	.line-2 { animation-delay: 600ms; }    /* Center vertical */
	.line-3 { animation-delay: 750ms; }    /* Center horizontal */
	.line-4 { animation-delay: 1000ms; }   /* Service line left */
	.line-5 { animation-delay: 1100ms; }   /* Service line right */
	.line-6 { animation-delay: 1300ms; }   /* Kitchen line top */
	.line-7 { animation-delay: 1400ms; }   /* Kitchen line bottom */

	@keyframes drawLine {
		to {
			stroke-dashoffset: 0;
		}
	}

	/* Hero content */
	.hero-content {
		text-align: center;
		max-width: 48rem;
		position: relative;
		z-index: 1;
	}

	.hero-title {
		font-size: clamp(4rem, 12vw, 9rem);
		font-weight: 700;
		letter-spacing: 0.08em;
		margin: 0 0 var(--space-lg, 2rem);
		color: var(--color-fg-primary, #fff);
		line-height: 1;
		display: flex;
		justify-content: center;
		/* Allow space for slide-in animation */
		padding: 0 120px;
		margin-left: -120px;
		margin-right: -120px;
	}

	/* CLEAR slides in from left */
	.title-clear {
		display: inline-block;
		opacity: 0;
		transform: translateX(-100px);
		transition: opacity 700ms cubic-bezier(0.0, 0.0, 0.2, 1),
					transform 700ms cubic-bezier(0.0, 0.0, 0.2, 1);
	}

	.title-clear.visible {
		opacity: 1;
		transform: translateX(0);
	}

	/* WAY slides in from right */
	.title-way {
		display: inline-block;
		opacity: 0;
		transform: translateX(100px);
		transition: opacity 700ms cubic-bezier(0.0, 0.0, 0.2, 1),
					transform 700ms cubic-bezier(0.0, 0.0, 0.2, 1);
	}

	.title-way.visible {
		opacity: 1;
		transform: translateX(0);
	}

	.hero-tagline {
		font-size: clamp(1.25rem, 2.5vw, 1.5rem);
		line-height: 1.6;
		color: var(--color-fg-secondary, rgba(255,255,255,0.7));
		margin: 0 0 var(--space-xl, 3rem);
		opacity: 0;
		transform: translateY(20px);
		transition: opacity 700ms cubic-bezier(0.0, 0.0, 0.2, 1),
					transform 700ms cubic-bezier(0.0, 0.0, 0.2, 1);
	}

	.hero-tagline.visible {
		opacity: 1;
		transform: translateY(0);
	}

	.hero-subtitle {
		font-size: clamp(1rem, 1.5vw, 1.125rem);
		line-height: 1.6;
		color: var(--color-fg-muted, rgba(255,255,255,0.46));
		margin: 0 0 var(--space-xl, 3rem);
		opacity: 0;
		transform: translateY(20px);
		transition: opacity 700ms cubic-bezier(0.0, 0.0, 0.2, 1) 150ms,
					transform 700ms cubic-bezier(0.0, 0.0, 0.2, 1) 150ms;
	}

	.hero-subtitle.visible {
		opacity: 1;
		transform: translateY(0);
	}

	.hero-cta {
		display: flex;
		gap: var(--space-sm, 1rem);
		justify-content: center;
		flex-wrap: wrap;
		opacity: 0;
		transform: translateY(20px);
		transition: opacity 700ms cubic-bezier(0.0, 0.0, 0.2, 1) 100ms,
					transform 700ms cubic-bezier(0.0, 0.0, 0.2, 1) 100ms;
	}

	.hero-cta.visible {
		opacity: 1;
		transform: translateY(0);
	}

	/* Button styles */
	.btn {
		display: inline-block;
		padding: 1rem 2rem;
		border-radius: var(--radius-md, 8px);
		font-size: clamp(1rem, 1.5vw, 1.125rem);
		font-weight: 600;
		text-decoration: none;
		transition: opacity 200ms cubic-bezier(0.4, 0.0, 0.2, 1),
					transform 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
	}

	.btn:hover {
		opacity: 0.85;
		transform: translateY(-1px);
	}

	.btn-primary {
		background: var(--color-fg-primary, #fff);
		color: var(--color-bg-pure, #000);
	}

	.btn-secondary {
		background: transparent;
		color: var(--color-fg-primary, #fff);
		border: 1px solid rgba(255, 255, 255, 0.3);
	}

	.btn-secondary:hover {
		border-color: rgba(255, 255, 255, 0.5);
	}

	/* Reduced motion - skip animations, show content immediately */
	@media (prefers-reduced-motion: reduce) {
		.court-lines {
			display: none;
		}
		.hero-content {
			opacity: 1;
			transform: none;
			transition: none;
		}
		.line {
			animation: none;
			stroke-dashoffset: 0;
		}
	}
</style>
