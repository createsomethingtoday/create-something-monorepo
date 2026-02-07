<script lang="ts">
	/**
	 * Team Page - The Stack Indoor Pickleball
	 *
	 * Simplified page:
	 * 1. Video hero - "Family Owned and Operated"
	 * 2. Two photo placeholders (portrait + landscape) with names
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

<!-- Photos Section -->
<section class="section background-color-white">
	<div class="container-large">
		<div class="photos-grid" use:inview>
			<!-- Portrait Photo -->
			<div class="photo-frame is-portrait reveal-element">
				<div class="photo-placeholder">
					<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
						<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
						<circle cx="9" cy="9" r="2"/>
						<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
					</svg>
				</div>
			</div>
			<!-- Landscape Photo -->
			<div class="photo-frame is-landscape reveal-element">
				<div class="photo-placeholder">
					<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
						<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
						<circle cx="9" cy="9" r="2"/>
						<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
					</svg>
				</div>
				<div class="photo-names">
					<p class="heading-style-h3">Ernie &amp; Family</p>
				</div>
			</div>
		</div>
	</div>
</section>

<BottomCTA />

<style>
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
		align-items: center;
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
		background-image: linear-gradient(0deg, rgba(0, 0, 0, 0.5), transparent);
		position: absolute;
		inset: 0;
	}

	.video-hero_content {
		position: relative;
		z-index: 3;
	}

	/* Photos Grid */
	.photos-grid {
		display: grid;
		grid-template-columns: 1fr 1.5fr;
		gap: 2rem;
		max-width: 56rem;
		margin: 0 auto;
		align-items: end;
	}

	.photo-frame {
		border-radius: var(--player-radius);
		overflow: hidden;
		position: relative;
	}

	.photo-frame.is-portrait {
		aspect-ratio: 3 / 4;
	}

	.photo-frame.is-landscape {
		aspect-ratio: 4 / 3;
	}

	.photo-placeholder {
		width: 100%;
		height: 100%;
		background-color: #f0ece6;
		display: flex;
		justify-content: center;
		align-items: center;
		color: var(--dark-grey);
	}

	.photo-names {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 1.5rem;
		background: linear-gradient(0deg, rgba(0,0,0,0.6), transparent);
		color: var(--white);
	}

	@media (max-width: 767px) {
		.photos-grid {
			grid-template-columns: 1fr;
			max-width: 24rem;
		}

		.photo-frame.is-portrait {
			aspect-ratio: 1;
		}
	}
</style>
