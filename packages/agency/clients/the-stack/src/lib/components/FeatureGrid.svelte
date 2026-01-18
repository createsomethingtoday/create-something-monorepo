<script lang="ts">
	/**
	 * FeatureGrid Component
	 *
	 * 2x2 grid of feature cards with section header.
	 */

	import FeatureCard from './FeatureCard.svelte';
	import Button from './Button.svelte';
	import { inview } from '$lib/actions/inview';

	interface Feature {
		image: string;
		eyebrow: string;
		title: string;
		description: string;
	}

	interface Props {
		title?: string;
		features?: Feature[];
	}

	let {
		title = 'Family owned and operated',
		features = [
			{
				image: '/images/Paddle.jpeg',
				eyebrow: 'for large groups',
				title: 'events',
				description:
					'With 18 years of coaching under her belt, Sarah is known for her ability to develop young talent, guiding players to reach their full potential on the court.'
			},
			{
				image: '/images/Paddle.jpeg',
				eyebrow: 'For the competitors',
				title: 'Tournaments',
				description:
					'Jessica brings 22 years of experience to the table, specializing in refining advanced techniques and mental toughness in competitive players.'
			},
			{
				image: '/images/Paddle.jpeg',
				eyebrow: 'Indirect lighting and PPA qualified spacing',
				title: 'designed for optimal play',
				description:
					'A former collegiate athlete with 15 years of coaching experience, Martina is praised for her dynamic coaching style and her success in training elite junior players.'
			},
			{
				image: '/images/Paddle.jpeg',
				eyebrow: 'Chicago, IL',
				title: 'committed to sustainability',
				description:
					"With 20 years of experience, Kevin's passion for tennis has made him a favorite among players seeking to improve both their technical skills and strategic thinking."
			}
		]
	}: Props = $props();
</script>

<section id="intro" class="section background-color-white">
	<div class="container-large">
		<div class="margin-bottom-48">
			<div class="wrap_flex is-align-bottom" use:inview>
				<div class="max-width-440"></div>
				<h2 class="heading-style-h2">
					<span class="is-word is-1">{title}</span>
				</h2>
				<Button href="#" variant="primary" showArrow>Meet our team</Button>
			</div>
		</div>

		<ul class="player_list">
			{#each features as feature}
				<FeatureCard
					image={feature.image}
					eyebrow={feature.eyebrow}
					title={feature.title}
					description={feature.description}
				/>
			{/each}
		</ul>
	</div>
</section>

<style>
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
	}
</style>
