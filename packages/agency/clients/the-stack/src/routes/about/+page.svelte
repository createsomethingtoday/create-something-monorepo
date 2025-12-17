<script lang="ts">
	/**
	 * About Page - The Stack Indoor Pickleball
	 *
	 * Sections:
	 * 1. Hero with large title
	 * 2. History section with parallax
	 * 3. Values/mission
	 * 4. CTA
	 */

	import { inview } from '$lib/actions/inview';
	import { parallax } from '$lib/actions/parallax';
	import Button from '$lib/components/Button.svelte';
	import BottomCTA from '$lib/components/BottomCTA.svelte';
</script>

<svelte:head>
	<title>About Us - The Stack Indoor Pickleball</title>
	<meta
		name="description"
		content="Learn about The Stack - a family owned and operated indoor pickleball facility committed to excellence."
	/>
</svelte:head>

<!-- Hero Section -->
<section class="section is-about-hero">
	<div class="container-large">
		<div class="about-hero_wrap" use:inview>
			<div class="max-width-700">
				<h1 class="heading-style-h1">
					<span class="is-word is-1">About</span>
					<span class="is-word is-2">us</span>
				</h1>
			</div>
			<div class="about-hero_image">
				<img
					src="/images/tennis-about_1tennis-about.avif"
					alt="The Stack facility"
					class="img-cover"
					loading="lazy"
				/>
			</div>
		</div>
	</div>
</section>

<!-- History Section -->
<section class="section is-history">
	<div class="parallax-wrap">
		<img
			src="/images/tennis-location-background2x_1tennis-location-background@2x.avif"
			alt=""
			class="parallax-img is-full"
			use:parallax={{ speed: 0.1 }}
			loading="lazy"
		/>
		<div class="parallax-overlay is-full"></div>
	</div>
	<div class="container-large">
		<div class="history_wrap" use:inview>
			<div class="max-width-700">
				<div class="margin-bottom-24">
					<p class="text-size-eyebrow text-color-lightgrey">Our Story</p>
				</div>
				<h2 class="heading-style-h2 reveal-element">
					Founded with a passion for bringing people together through the sport of pickleball.
				</h2>
				<div class="margin-top-32">
					<p class="text-size-medium text-color-lightgrey reveal-element">
						The Stack was born from a simple idea: create a world-class indoor pickleball facility
						where players of all skill levels could come together, improve their game, and build
						lasting friendships. Our family has been in the racquet sports industry for over 30
						years, and we saw the incredible growth of pickleball as an opportunity to share our
						passion with a new generation of players.
					</p>
				</div>
				<div class="margin-top-32">
					<Button href="/contact" variant="primary" showArrow>Join Our Community</Button>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Values Section -->
<section class="section background-color-white">
	<div class="container-large">
		<div class="values_wrap" use:inview>
			<div class="margin-bottom-48">
				<h2 class="heading-style-h2">
					<span class="is-word is-1">Our</span>
					<span class="is-word is-2">Values</span>
				</h2>
			</div>
			<ul class="values_list">
				<li class="values_item reveal-element">
					<h3 class="heading-style-h4">Community First</h3>
					<p class="text-size-medium">
						We believe in building a welcoming environment where everyone feels at home.
					</p>
				</li>
				<li class="values_item reveal-element">
					<h3 class="heading-style-h4">Excellence</h3>
					<p class="text-size-medium">
						From our courts to our coaching, we maintain the highest standards.
					</p>
				</li>
				<li class="values_item reveal-element">
					<h3 class="heading-style-h4">Sustainability</h3>
					<p class="text-size-medium">
						Our facilities are designed with environmental responsibility in mind.
					</p>
				</li>
			</ul>
		</div>
	</div>
</section>

<BottomCTA />

<style>
	.section.is-about-hero {
		margin-top: var(--nav-height);
		padding-top: 5rem;
		padding-bottom: 6rem;
	}

	.about-hero_wrap {
		display: flex;
		flex-direction: column;
		gap: 3rem;
	}

	.about-hero_image {
		width: 100%;
		aspect-ratio: 16 / 9;
		border-radius: var(--hero-video-radius);
		overflow: hidden;
		position: relative;
	}

	.section.is-history {
		background-image: linear-gradient(0deg, var(--black), transparent);
		color: var(--white);
		position: relative;
		overflow: hidden;
		padding-top: 10rem;
		padding-bottom: 10rem;
	}

	.parallax-wrap {
		z-index: 1;
		background-color: var(--black);
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		position: absolute;
		inset: 0;
	}

	.parallax-img.is-full {
		opacity: 1;
	}

	.parallax-overlay.is-full {
		background-image: linear-gradient(0deg, var(--black), transparent);
	}

	.history_wrap {
		position: relative;
		z-index: 2;
	}

	.values_wrap {
		text-align: center;
	}

	.values_list {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 3rem;
	}

	.values_item {
		text-align: left;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	@media (max-width: 991px) {
		.values_list {
			grid-template-columns: 1fr;
		}
	}
</style>
