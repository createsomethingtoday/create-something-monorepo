<script lang="ts">
	/**
	 * FeatureGrid Component
	 *
	 * Alternating editorial layout: image and text swap sides per row.
	 * Each row is a full-width two-column block for visual rhythm.
	 */

	import { inview } from '$lib/actions/inview';
	import Button from './Button.svelte';

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
				image: '/images/feature-events.jpg',
				eyebrow: 'for large groups',
				title: 'events',
				description:
					'The Stack is quickly becoming the go-to venue for private events. We already have a waiting list of groups wanting to host at our facility. Call Ernie at (817) 252-4555 to learn more about hosting your next event.',
				showCta: false
			},
			{
				image: '/images/feature-tournaments.jpg',
				eyebrow: 'For the competitors',
				title: 'Tournaments',
				description:
					'The Stack will be offering regular tournaments for all age and skill levels. Our events are designed to improve community and foster healthy competition among players.',
				showCta: false
			},
			{
				image: '/images/feature-courts.jpg',
				eyebrow: 'Indirect lighting and PPA qualified spacing',
				title: 'designed for optimal play',
				description:
					'All courts feature PPA-qualified spacing for tournament-level play. Our new indirect lighting system dramatically reduces glare and shadows, providing optimal visibility for every match.'
			},
			{
				image: '/images/feature-sustainability.jpg',
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

		<div class="features-stack">
			{#each features as feature, i}
				<div class="feature-row" class:is-reversed={i % 2 !== 0} use:inview>
					<!-- Image -->
					<div class="feature-image reveal-element">
						<img src={feature.image} loading="lazy" alt="" class="img-cover" />
					</div>

					<!-- Text -->
					<div class="feature-text reveal-element">
						<p class="text-size-eyebrow feature-eyebrow">{feature.eyebrow}</p>
						<h3 class="heading-style-h2 feature-title">{feature.title}</h3>
						<p class="text-size-medium feature-description">{feature.description}</p>
						{#if feature.showCta !== false}
							<Button href={feature.href ?? '/about'} variant="secondary" showArrow>
								{feature.ctaText ?? 'Learn More'}
							</Button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.section-header {
		text-align: center;
		max-width: 40rem;
		margin: 0 auto 5rem;
	}

	.section-subtitle {
		font-family: var(--font-satoshi);
		font-size: var(--text-body-lg);
		color: var(--dark-grey);
		margin-top: 1.5rem;
		line-height: 1.6;
	}

	/* Stacked rows */
	.features-stack {
		display: flex;
		flex-direction: column;
		gap: 6rem;
	}

	/* Each feature row: two columns, alternating */
	.feature-row {
		display: grid;
		grid-template-columns: 1.1fr 1fr;
		gap: 4rem;
		align-items: center;
	}

	.feature-row.is-reversed {
		grid-template-columns: 1fr 1.1fr;
	}

	.feature-row.is-reversed .feature-image {
		order: 2;
	}

	.feature-row.is-reversed .feature-text {
		order: 1;
	}

	/* Image */
	.feature-image {
		aspect-ratio: 16 / 10;
		border-radius: var(--player-radius);
		overflow: hidden;
		position: relative;
		will-change: transform;
		transform: translate3d(0, 0, 0) scale(1);
		transition: transform 0.8s var(--ease-reveal);
	}

	.feature-row:hover .feature-image {
		transform: translate3d(0, -4px, 0) scale(1.01);
	}

	/* Text */
	.feature-text {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 1rem;
	}

	.feature-eyebrow {
		font-family: var(--font-satoshi);
		color: var(--green);
		letter-spacing: 0.1em;
	}

	.feature-title {
		font-family: var(--font-coolvetica);
		line-height: 1;
	}

	.feature-description {
		font-family: var(--font-satoshi);
		color: var(--dark-grey);
		line-height: 1.7;
		max-width: 28rem;
	}

	/* Responsive: Tablet */
	@media (max-width: 991px) {
		.features-stack {
			gap: 4rem;
		}

		.feature-row {
			grid-template-columns: 1fr;
			gap: 2rem;
		}

		.feature-row.is-reversed {
			grid-template-columns: 1fr;
		}

		.feature-row.is-reversed .feature-image,
		.feature-row.is-reversed .feature-text {
			order: unset;
		}

		.section-header {
			margin-bottom: 3rem;
		}
	}

	/* Responsive: Mobile */
	@media (max-width: 767px) {
		.feature-image {
			aspect-ratio: 16 / 9;
			border-radius: 2rem;
		}

		.features-stack {
			gap: 3.5rem;
		}
	}
</style>
