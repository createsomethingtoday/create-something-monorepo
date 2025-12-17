<script lang="ts">
	/**
	 * VideoHero Component
	 *
	 * Exact Webflow pattern:
	 * - video_wall: 300vh height creates scroll distance
	 * - video_section: sticky positioning
	 * - video_wrap: scale(.5) initial, scales to 1 on scroll
	 * - Gold "become a member" text at bottom
	 */

	import { onMount } from 'svelte';

	interface Props {
		title?: string;
		ctaText?: string;
		ctaHref?: string;
	}

	let {
		title = 'premiere pickleball',
		ctaText = 'Win a free month of membership',
		ctaHref = '#intro'
	}: Props = $props();

	let scale = $state(0.5);
	let innerScale = $derived(1 / scale);
	let videoWall: HTMLElement;

	onMount(() => {
		const handleScroll = () => {
			if (!videoWall) return;

			const rect = videoWall.getBoundingClientRect();
			const viewportHeight = window.innerHeight;

			// Video should reach scale(1) when the bottom of video_wall
			// reaches the bottom of the viewport (when next section appears)
			// Account for the -100vh margin-bottom by ending animation earlier
			const effectiveBottom = rect.bottom + viewportHeight; // Adjust for negative margin
			const scrollRange = viewportHeight * 2; // Animation happens over ~2 viewport heights

			// Progress: 0 when video_wall top is at viewport top, 1 when bottom reaches viewport bottom
			const progress = Math.max(0, Math.min(1, (viewportHeight - rect.top) / scrollRange));

			// Scale from 0.5 to 1
			scale = 0.5 + (progress * 0.5);
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		handleScroll(); // Initial call

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});
</script>

<section class="section is-video">
	<!-- Title above video -->
	<div class="container-large">
		<div class="flex-center">
			<div class="max-width-700">
				<h1 class="heading-style-h1">{title}</h1>
			</div>
		</div>
	</div>

	<!-- Video container with scroll effect -->
	<div class="video_wall" bind:this={videoWall}>
		<div class="video_section">
			<div class="video_wrap" style="transform: scale({scale});">
				<div class="video_box">
					<!-- CTA Button in center -->
					<a href={ctaHref} class="video_btn" style="transform: translate(-50%, -50%) scale({innerScale});">
						<p class="video_btn-text">{ctaText}</p>
						<div class="video_play">
							<img src="/icons/icon-arrow-down.svg" alt="" class="icon-arrow" />
						</div>
					</a>

					<!-- Gold title at bottom -->
					<div class="video_title" style="transform: translateX(-50%) scale({innerScale});">
						<h2 class="heading-style-h2 is-title">
							become a member - <em>limited availability</em>
						</h2>
					</div>

					<!-- Video Background -->
					<div class="video_bg">
						<div class="video_bg_overlay"></div>
						<video autoplay loop muted playsinline class="video_bg_video">
							<source src="/videos/hero-video.mp4" type="video/mp4" />
							<source src="/videos/hero-video.webm" type="video/webm" />
						</video>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	.section.is-video {
		margin-top: 6rem;
		padding-top: 5vh;
		padding-bottom: 0;
		background-color: var(--white);
	}

	.container-large {
		max-width: 82rem;
		margin-left: auto;
		margin-right: auto;
		padding-left: 2rem;
		padding-right: 2rem;
		position: relative;
		z-index: 10;
	}

	.flex-center {
		display: flex;
		justify-content: center;
		text-align: center;
		position: relative;
		z-index: 10;
	}

	.max-width-700 {
		max-width: 43.75rem;
	}

	.heading-style-h1 {
		font-family: var(--font-coolvetica);
		font-size: clamp(4rem, 12vw, 11.25rem);
		line-height: 0.95;
		letter-spacing: -0.02em;
		text-transform: uppercase;
		color: var(--black);
		margin: 0;
		position: relative;
		z-index: 10;
	}

	/* Exact Webflow pattern - creates scroll distance */
	.video_wall {
		height: 300vh;
		margin-top: -34vh;
		margin-bottom: -100vh;
		position: relative;
	}

	/* Sticky positioning for scroll effect */
	.video_section {
		height: 100vh;
		position: sticky;
		top: 0;
	}

	/* Container that scales - starts at 0.5, ends at 1 */
	.video_wrap {
		width: 100vw;
		height: 100vh;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: center;
		/* Scale is set via inline style for animation */
	}

	/* Video container */
	.video_box {
		border-radius: 3.125rem;
		background-color: var(--black);
		width: 100%;
		height: 100%;
		position: relative;
		overflow: hidden;
	}

	/* CTA Button */
	.video_btn {
		z-index: 3;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 1.5rem;
		color: var(--white);
		text-decoration: none;
		padding: 2rem;
		position: absolute;
		top: 50%;
		left: 50%;
		/* Transform is set via inline style for counter-scale animation */
	}

	.video_btn-text {
		font-family: var(--font-coolvetica);
		font-size: clamp(1rem, 2vw, 1.5rem);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
	}

	.video_play {
		z-index: 2;
		aspect-ratio: 1;
		background-color: var(--green);
		border-radius: 50%;
		display: flex;
		justify-content: center;
		align-items: center;
		width: 3.13rem;
		height: 3.13rem;
		transition: transform 0.3s var(--ease-stack);
	}

	.video_btn:hover .video_play {
		transform: scale(1.1);
	}

	.icon-arrow {
		width: 1rem;
		height: 1rem;
		filter: invert(1);
	}

	/* Gold title at bottom - exact Webflow pattern */
	.video_title {
		z-index: 2;
		color: var(--green);
		position: absolute;
		bottom: 5%;
		left: 50%;
		/* Transform is set via inline style for counter-scale animation */
		width: 100%;
		text-align: center;
		padding: 0 2rem;
	}

	.heading-style-h2.is-title {
		font-family: var(--font-coolvetica);
		font-size: clamp(1.5rem, 4vw, 4rem);
		text-transform: uppercase;
		letter-spacing: 0.02em;
		margin: 0;
	}

	.heading-style-h2.is-title em {
		font-style: italic;
	}

	/* Video Background */
	.video_bg {
		z-index: 1;
		display: flex;
		justify-content: flex-start;
		align-items: flex-end;
		width: 100%;
		height: 100%;
		position: absolute;
		inset: 0;
	}

	.video_bg_overlay {
		z-index: 2;
		background-image: linear-gradient(0deg, rgba(0, 0, 0, 0.4), transparent 50%);
		position: absolute;
		inset: 0;
	}

	.video_bg_video {
		width: 100%;
		height: 100%;
		object-fit: cover;
		position: absolute;
		inset: 0;
	}

	/* Responsive */
	@media (max-width: 991px) {
		.section.is-video {
			margin-top: 4.5rem;
			padding-top: 2.5rem;
		}

		.video_wall {
			height: 200vh;
			margin-top: -20vh;
			margin-bottom: -50vh;
		}
	}

	@media (max-width: 767px) {
		.video_wall {
			height: 150vh;
			margin-top: -10vh;
			margin-bottom: -30vh;
		}

		.video_box {
			border-radius: 2rem;
		}
	}

	@media (max-width: 479px) {
		.video_box {
			border-radius: 1.5rem;
		}
	}
</style>
