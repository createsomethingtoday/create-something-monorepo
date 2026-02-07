<script lang="ts">
	/**
	 * FeatureGrid Component
	 *
	 * 2x2 grid of feature cards with section header.
	 */

	import FeatureCard from './FeatureCard.svelte';
	import { inview } from '$lib/actions/inview';

	interface Feature {
		image: string;
		eyebrow: string;
		title: string;
		description: string;
		showCta?: boolean;
		ctaText?: string;
		href?: string;
	}

	interface Props {
		title?: string;
		subtitle?: string;
		features?: Feature[];
	}

	let {
		title = 'Family owned and operated',
		subtitle = 'The Stack is built on a foundation of passion for pickleball and commitment to our community. We take pride in creating a welcoming space for players of all skill levels.',
		features = [
			{
				image: '/images/Paddle.jpeg',
				eyebrow: 'for large groups',
				title: 'events',
				description:
					'The Stack is quickly becoming the go-to venue for private events. We already have a waiting list of groups wanting to host at our facility. Call Ernie at (817) 252-4555 to learn more about hosting your next event.',
				showCta: false
			},
			{
				image: '/images/Paddle.jpeg',
				eyebrow: 'For the competitors',
				title: 'Tournaments',
				description:
					'The Stack will be offering regular tournaments for all age and skill levels. Our events are designed to improve community and foster healthy competition among players.',
				showCta: false
			},
			{
				image: '/images/Paddle.jpeg',
				eyebrow: 'Indirect lighting and PPA qualified spacing',
				title: 'designed for optimal play',
				description:
					'All courts feature PPA-qualified spacing for tournament-level play. Our new indirect lighting system dramatically reduces glare and shadows, providing optimal visibility for every match.'
			},
			{
				image: '/images/Paddle.jpeg',
				eyebrow: 'Off the grid',
				title: 'committed to sustainability',
				description:
					'Our facility is fully supported by solar panels and battery backup, keeping The Stack operational even during power outages. We are committed to sustainable energy and reducing our environmental footprint.',
				showCta: false
			}
		]
	}: Props = $props();
</script>

<section id="intro" class="section background-color-white">
	<div class="container-large">
		<div class="section-header" use:inview>
			<h2 class="heading-style-h2">
				<span class="is-word is-1">{title}</span>
			</h2>
			<p class="section-subtitle reveal-element">{subtitle}</p>
		</div>

		<ul class="player_list">
			{#each features as feature}
				<FeatureCard
					image={feature.image}
					eyebrow={feature.eyebrow}
					title={feature.title}
					description={feature.description}
					showCta={feature.showCta}
					ctaText={feature.ctaText}
					href={feature.href}
				/>
			{/each}
		</ul>
	</div>
</section>

<style>
	.section-header {
		text-align: center;
		max-width: 40rem;
		margin: 0 auto 4rem;
	}

	.section-subtitle {
		font-family: var(--font-satoshi);
		font-size: var(--text-body-lg);
		color: var(--dark-grey);
		margin-top: 1.5rem;
		line-height: 1.6;
	}

	.player_list {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 6rem;
	}

	@media (max-width: 991px) {
		.player_list {
			grid-template-columns: 1fr;
			gap: 4rem;
		}

		.section-header {
			margin-bottom: 3rem;
		}
	}
</style>
