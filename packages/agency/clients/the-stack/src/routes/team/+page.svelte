<script lang="ts">
	/**
	 * Team Page - The Stack Indoor Pickleball
	 *
	 * Sections:
	 * 1. Video hero
	 * 2. Team intro
	 * 3. Team members grid
	 * 4. CTA
	 */

	import { inview } from '$lib/actions/inview';
	import Button from '$lib/components/Button.svelte';
	import BottomCTA from '$lib/components/BottomCTA.svelte';

	const teamMembers = [
		{
			name: 'Sarah Mitchell',
			role: 'Head Coach',
			bio: 'With 18 years of coaching under her belt, Sarah is known for her ability to develop young talent.',
			image: '/images/tennis-square-01_1tennis-square-01.avif'
		},
		{
			name: 'Jessica Chen',
			role: 'Senior Coach',
			bio: 'Jessica brings 22 years of experience, specializing in advanced techniques and mental toughness.',
			image: '/images/tennis-square-02_1tennis-square-02.avif'
		},
		{
			name: 'Martina Lopez',
			role: 'Junior Program Director',
			bio: 'A former collegiate athlete with 15 years of experience, praised for her dynamic coaching style.',
			image: '/images/tennis-square-03_1tennis-square-03.avif'
		},
		{
			name: 'Kevin Williams',
			role: 'Strategy Coach',
			bio: "With 20 years of experience, Kevin's passion for tennis has made him a favorite among players.",
			image: '/images/tennis-square-04_1tennis-square-04.avif'
		}
	];
</script>

<svelte:head>
	<title>Meet Our Team - The Stack Indoor Pickleball</title>
	<meta
		name="description"
		content="Meet the experienced coaching staff at The Stack Indoor Pickleball."
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
					<span class="is-word is-1">Meet</span>
					<span class="is-word is-2">Our</span>
					<span class="is-word is-3">Team</span>
				</h1>
			</div>
		</div>
	</div>
</section>

<!-- Team Intro -->
<section class="section background-color-white">
	<div class="container-large">
		<div class="team-intro" use:inview>
			<div class="max-width-700">
				<h2 class="heading-style-h2 reveal-element">
					World-class coaching from professionals who care about your game.
				</h2>
				<div class="margin-top-24">
					<p class="text-size-medium reveal-element">
						Our team of certified coaches brings decades of combined experience in competitive
						pickleball. From beginners to tournament players, we have the expertise to help you
						reach your goals.
					</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Team Grid -->
<section class="section background-color-white" style="padding-top: 0;">
	<div class="container-large">
		<ul class="team_list" use:inview>
			{#each teamMembers as member}
				<li class="team_item reveal-element">
					<div class="team_visual">
						<img src={member.image} alt={member.name} class="img-cover" loading="lazy" />
					</div>
					<div class="team_content">
						<p class="text-size-eyebrow text-color-darkgrey">{member.role}</p>
						<h3 class="heading-style-h3">{member.name}</h3>
						<p class="text-size-medium">{member.bio}</p>
					</div>
				</li>
			{/each}
		</ul>
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

	.team-intro {
		text-align: center;
		display: flex;
		justify-content: center;
	}

	.team_list {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 4rem;
	}

	.team_item {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.team_visual {
		aspect-ratio: 1;
		border-radius: var(--player-radius);
		overflow: hidden;
		position: relative;
	}

	.team_content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	@media (max-width: 991px) {
		.team_list {
			grid-template-columns: 1fr;
		}
	}
</style>
