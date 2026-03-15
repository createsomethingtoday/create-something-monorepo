<script lang="ts">
	/**
	 * KineticHero Component - Full-viewport video background hero
	 * Maverick X Design System
	 */

	import { browser } from '$app/environment';
	import Button from './Button.svelte';

	interface Props {
		videoSrc?: string;
		backgroundImage?: string;
		title: string;
		subtitle: string;
		ctaText?: string;
		ctaHref?: string;
		onCtaClick?: () => void;
	}

	let {
		videoSrc,
		backgroundImage,
		title,
		subtitle,
		ctaText,
		ctaHref,
		onCtaClick
	}: Props = $props();

	function handleScrollToNext() {
		if (!browser) return;
		const heroElement = document.querySelector('.kinetic-hero');
		if (heroElement) {
			const nextElement = heroElement.nextElementSibling;
			if (nextElement) {
				nextElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		}
	}

	function handleCTAClick() {
		if (ctaText === 'Learn More' && onCtaClick) {
			onCtaClick();
		} else if (!ctaHref) {
			handleScrollToNext();
		}
	}
</script>

<div class="kinetic-hero">
	<!-- Background - Video or Image -->
	{#if videoSrc}
		<video
			class="absolute inset-0 w-full h-full object-cover"
			autoplay
			loop
			muted
			playsinline
		>
			<source src={videoSrc} type="video/mp4" />
		</video>
	{:else if backgroundImage}
		<div
			style="background-image: url({backgroundImage})"
			class="absolute inset-0 w-full h-full bg-cover bg-center"
		></div>
	{:else}
		<div class="hero-fallback-bg"></div>
	{/if}

	<!-- Content -->
	<div class="container relative z-3 flex items-center justify-center min-h-svh hero-container">
		<div class="max-w-[70rem] text-center">
			<!-- Title -->
			<h1 class="mb-6 hero-title tracking-wide">
				{title}
			</h1>

			<!-- Subtitle -->
			<p class="mb-10 hero-description max-w-[42rem] mx-auto md:max-w-[28rem]">
				{subtitle}
			</p>

			<!-- CTA -->
			{#if ctaText}
				<div class="flex justify-center">
					<Button
						class="min-w-[11rem] opacity-90 hover:opacity-100 transition-opacity md:min-w-min"
						title={ctaText}
						light
						arrow
						href={ctaText !== 'Learn More' && ctaHref ? ctaHref : undefined}
						onclick={handleCTAClick}
					/>
				</div>
			{/if}
		</div>
	</div>

	<!-- Scroll Indicator -->
	<button
		onclick={handleScrollToNext}
		class="scroll-indicator"
		aria-label="Scroll down"
	>
		<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="1.5"
				d="M19 9l-7 7-7-7"
			/>
		</svg>
	</button>
</div>

<style>
	.kinetic-hero {
		position: relative;
		min-height: 100svh;
		max-height: 80vh;
	}

	.kinetic-hero::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 2;
		background: linear-gradient(
			to bottom,
			rgba(0, 0, 0, 0.7) 0%,
			rgba(0, 0, 0, 0.5) 50%,
			rgba(0, 0, 0, 0.6) 100%
		);
	}

	.hero-fallback-bg {
		position: absolute;
		inset: 0;
		background: linear-gradient(to bottom right, #212121, #000000);
	}

	.scroll-indicator {
		position: absolute;
		bottom: 2rem;
		right: 2rem;
		z-index: 4;
		opacity: 0.4;
		cursor: pointer;
		transition: opacity 0.2s;
		color: var(--color-fg-primary);
	}

	.scroll-indicator:hover {
		opacity: 1;
	}

	@media (max-width: 1023px) {
		.kinetic-hero {
			max-height: 90vh;
		}
		.scroll-indicator {
			display: none;
		}
	}

	@media (max-width: 767px) {
		.kinetic-hero {
			max-height: none;
		}
	}
</style>
