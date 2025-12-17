<script lang="ts">
	/**
	 * VideoHero Component
	 *
	 * Full-width video hero with:
	 * - Scale-in animation on scroll
	 * - CTA button overlay
	 * - Title text at bottom
	 * - Video background with poster
	 */

	import { onMount } from 'svelte';
	import { inview } from '$lib/actions/inview';

	interface Props {
		title?: string;
		ctaText?: string;
		ctaHref?: string;
		subtitle?: string;
	}

	let {
		title = 'premiere pickleball',
		ctaText = 'Win a free month of membership',
		ctaHref = '#intro',
		subtitle = 'become a member - limited availability'
	}: Props = $props();

	let isInView = $state(false);
</script>

<section class="section is-video">
	<div class="container-large">
		<div class="flex-center">
			<div class="max-width-700">
				<h1 class="heading-style-h1">{title}</h1>
			</div>
		</div>
	</div>

	<div class="video_wall">
		<div class="video_section">
			<div class="video_wrap">
				<div
					class="video_box"
					class:is-visible={isInView}
					use:inview={{ threshold: 0.1 }}
					onanimationend={() => (isInView = true)}
				>
					<!-- CTA Button -->
					<a href={ctaHref} class="video_btn">
						<p class="heading-style-h3">{ctaText}</p>
						<div class="video_play">
							<img src="/icons/icon-arrow-down.svg" alt="" class="icon-16" />
						</div>
					</a>

					<!-- Title Overlay -->
					<div class="video_title">
						<p class="heading-style-h2 is-title">
							<span class="is-word is-1" class:is-visible={isInView}>{subtitle}</span>
						</p>
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
	.video_wall {
		position: relative;
		width: 100%;
	}

	.video_section {
		position: relative;
	}

	.video_wrap {
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: center;
		text-align: center;
		width: 100vw;
		height: 100vh;
		gap: 2rem;
		margin-left: auto;
		margin-right: auto;
	}

	.video_box {
		z-index: 1;
		border-radius: var(--hero-video-radius);
		background-color: var(--black);
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 100%;
		position: relative;
		overflow: hidden;
		/* Initial state - scaled up */
		transform: translate3d(0, 15%, 0) scale3d(1.5, 1.5, 1);
		opacity: 0;
		transition:
			transform 1s var(--ease-stack),
			opacity 0.8s ease-out;
	}

	.video_box.is-visible {
		transform: translate3d(0, 0, 0) scale3d(1, 1, 1);
		opacity: 1;
	}

	.video_btn {
		z-index: 2;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		color: var(--white);
		text-decoration: none;
		padding: 2rem;
		position: relative;
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
		position: relative;
	}

	.video_title {
		z-index: 2;
		color: var(--white);
		position: absolute;
		bottom: 5%;
	}

	.is-title {
		font-style: normal;
	}

	.is-title em {
		font-style: italic;
	}

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
		background-image: linear-gradient(0deg, rgba(0, 0, 0, 0.25), transparent);
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

	@media (max-width: 991px) {
		.video_wrap {
			transform: scale(0.9);
		}
	}
</style>
