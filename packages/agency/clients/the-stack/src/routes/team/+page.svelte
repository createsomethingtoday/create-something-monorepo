<script lang="ts">
	/**
	 * Team Page - The Stack Indoor Pickleball
	 *
	 * Refined layout:
	 * 1. Video hero - "Family Owned and Operated"
	 * 2. Intro text + staggered photo composition with names
	 * 3. CTA
	 */

	import { inview } from '$lib/actions/inview';
	import BottomCTA from '$lib/components/BottomCTA.svelte';
</script>

<svelte:head>
	<title>Family Owned and Operated - The Stack Indoor Pickleball</title>
	<meta
		name="description"
		content="The Stack Indoor Pickleball is family owned and operated in Burleson, Texas."
	/>
</svelte:head>

<!-- Video Hero Section -->
<section class="section is-video-hero">
	<div class="video-hero_wrap">
		<div class="video-hero_bg">
			<div class="video_bg_overlay"></div>
			<video autoplay loop muted playsinline class="video-hero_video">
				<source src="/videos/team-video.mp4" type="video/mp4" />
				<source src="/videos/team-video.webm" type="video/webm" />
			</video>
		</div>
		<div class="container-large">
			<div class="video-hero_content" use:inview>
				<h1 class="heading-style-h1 text-color-white">
					<span class="is-word is-1">Family</span>
					<span class="is-word is-2">Owned</span>
					<span class="is-word is-3">and</span>
					<span class="is-word is-4">Operated</span>
				</h1>
			</div>
		</div>
	</div>
</section>

<!-- Story Section -->
<section class="section is-story background-color-white">
	<div class="container-large">
		<!-- Intro -->
		<div class="story-intro" use:inview>
			<p class="text-size-eyebrow story-eyebrow reveal-element">Burleson, Texas</p>
			<h2 class="heading-style-h2 story-heading">
				<span class="is-word is-1">Built by family,</span>
				<span class="is-word is-2">for the community.</span>
			</h2>
			<p class="text-size-medium story-body reveal-element">
				The Stack isn't just a pickleball facility — it's a gathering place. We built this
				space because we believe in what the sport brings out in people: connection, healthy
				competition, and joy at every skill level.
			</p>
		</div>

		<!-- Photo Composition -->
		<div class="story-photos" use:inview>
			<div class="photo-portrait reveal-element">
				<img src="/images/team-portrait.jpg" alt="Ernie, owner of The Stack" class="img-cover" loading="lazy" />
			</div>
			<div class="photo-landscape reveal-element">
				<img src="/images/team-landscape.jpg" alt="Family playing pickleball at The Stack" class="img-cover" loading="lazy" />
				<div class="photo-caption">
					<p class="caption-name">Ernie &amp; Family</p>
					<p class="caption-role">Founders</p>
				</div>
			</div>
		</div>
	</div>
</section>

<BottomCTA />

<style>
	/* Hero */
	.section.is-video-hero {
		margin-top: var(--nav-height);
		padding: 0;
		height: 60vh;
		min-height: 400px;
	}

	.video-hero_wrap {
		position: relative;
		height: 100%;
		display: flex;
		align-items: flex-end;
		padding-bottom: 4rem;
	}

	.video-hero_bg {
		position: absolute;
		inset: 0;
		background-color: var(--black);
	}

	.video-hero_video {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.video_bg_overlay {
		z-index: 2;
		background-image: linear-gradient(0deg, rgba(0, 0, 0, 0.6), transparent 60%);
		position: absolute;
		inset: 0;
	}

	.video-hero_content {
		position: relative;
		z-index: 3;
	}

	/* Story Section */
	.section.is-story {
		padding-top: 5rem;
		padding-bottom: 2rem;
	}

	/* Intro */
	.story-intro {
		max-width: 36rem;
		margin-bottom: 4rem;
	}

	.story-eyebrow {
		color: var(--green);
		margin-bottom: 1.25rem;
	}

	.story-heading {
		line-height: 1.08;
		margin-bottom: 1.5rem;
	}

	.story-body {
		color: var(--dark-grey);
		line-height: 1.7;
	}

	/* Photo Composition: overlapping stagger */
	.story-photos {
		display: grid;
		grid-template-columns: 5fr 7fr;
		gap: 2rem;
		max-width: 64rem;
		margin: 0 auto;
		align-items: start;
	}

	.photo-portrait {
		aspect-ratio: 3 / 4;
		border-radius: var(--player-radius);
		overflow: hidden;
		position: relative;
		margin-top: 3rem;
		will-change: transform;
		transform: translate3d(0, 0, 0);
		transition: transform 0.8s var(--ease-reveal);
	}

	.photo-portrait:hover {
		transform: translate3d(0, -4px, 0);
	}

	.photo-landscape {
		aspect-ratio: 4 / 3;
		border-radius: var(--player-radius);
		overflow: hidden;
		position: relative;
		will-change: transform;
		transform: translate3d(0, 0, 0);
		transition: transform 0.8s var(--ease-reveal);
	}

	.photo-landscape:hover {
		transform: translate3d(0, -4px, 0);
	}

	/* Staggered reveal delays */
	.story-photos .photo-portrait {
		transition-delay: 0s;
	}

	.story-photos .photo-landscape {
		transition-delay: 0.12s;
	}

	/* Caption overlay */
	.photo-caption {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 2rem;
		background: linear-gradient(0deg, rgba(0, 0, 0, 0.65), transparent);
		color: var(--white);
	}

	.caption-name {
		font-family: var(--font-coolvetica);
		font-size: var(--text-h3);
		text-transform: uppercase;
		letter-spacing: 0.02em;
		line-height: 1;
		margin-bottom: 0.25rem;
	}

	.caption-role {
		font-family: var(--font-satoshi);
		font-size: var(--text-eyebrow);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--green);
	}

	/* Responsive */
	@media (max-width: 991px) {
		.story-intro {
			max-width: 100%;
		}

		.photo-portrait {
			margin-top: 0;
		}
	}

	@media (max-width: 767px) {
		.story-photos {
			grid-template-columns: 1fr;
			max-width: 28rem;
		}

		.photo-portrait {
			aspect-ratio: 1;
		}

		.section.is-story {
			padding-top: 3.5rem;
		}
	}
</style>
