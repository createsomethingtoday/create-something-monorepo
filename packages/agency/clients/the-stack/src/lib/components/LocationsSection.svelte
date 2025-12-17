<script lang="ts">
	/**
	 * LocationsSection Component
	 *
	 * Section with:
	 * - Parallax background image
	 * - Left text column
	 * - Right grid of location cards
	 */

	import { parallax } from '$lib/actions/parallax';
	import { inview } from '$lib/actions/inview';
	import LocationCard from './LocationCard.svelte';
	import Button from './Button.svelte';

	interface Location {
		image: string;
		name: string;
		address: string;
	}

	interface Props {
		locations?: Location[];
	}

	let {
		locations = [
			{
				image: '/images/tennis-location-022x_2tennis-location-02@2x.avif',
				name: 'Grandview Park Tennis Center',
				address: '123 Maplewood Drive, Riverton'
			},
			{
				image: '/images/tennis-location-032x_2tennis-location-03@2x.avif',
				name: 'Oakridge Sports Complex',
				address: '456 Oakridge Lane, Brookfield'
			},
			{
				image: '/images/tennis-location-032x_1tennis-location-03@2x.avif',
				name: 'Riverview Tennis Academy',
				address: '789 Pinecrest Avenue, Hillside'
			},
			{
				image: '/images/tennis-image-082x_1tennis-image-08@2x.avif',
				name: 'Pinecrest Court Club',
				address: '101 Grandview Road, Lakeshore'
			}
		]
	}: Props = $props();
</script>

<section class="section is-location">
	<!-- Parallax Background -->
	<div class="parallax-wrap">
		<img
			src="/images/tennis-location-background2x_1tennis-location-background@2x.avif"
			alt=""
			class="parallax-img"
			use:parallax={{ speed: 0.1 }}
			loading="lazy"
		/>
		<div class="parallax-overlay"></div>
	</div>

	<div class="container-large">
		<div class="locations_wrap" use:inview>
			<!-- Left Text Column -->
			<div class="location-text max-width-440">
				<div class="margin-bottom-16">
					<h2>
						<span class="is-word is-1">Our</span>
						<span class="is-word is-2">Locations</span>
					</h2>
				</div>
				<div class="text-color-lightgrey">
					<p class="text-size-medium reveal-element">
						Ready to take your tennis game to the next level? Experience world-class coaching,
						state-of-the-art facilities, and a vibrant tennis community. Enroll today and become
						part of a legacy of excellence.
					</p>
				</div>
				<div class="margin-top-32">
					<Button href="/contact" variant="primary" showArrow>become a member</Button>
				</div>
			</div>

			<!-- Right Location Grid -->
			<ul class="locations_list">
				{#each locations as location}
					<LocationCard image={location.image} name={location.name} address={location.address} />
				{/each}
			</ul>
		</div>
	</div>
</section>

<style>
	.section.is-location {
		color: var(--white);
		padding-top: 5rem;
		padding-bottom: 5rem;
		position: relative;
		overflow: hidden;
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

	.parallax-img {
		opacity: 0.7;
		object-fit: cover;
		flex: none;
		width: 100%;
		height: 120%;
		position: relative;
	}

	.parallax-overlay {
		z-index: 2;
		background-image: linear-gradient(90deg, rgba(0, 0, 0, 0.7), transparent);
		position: absolute;
		inset: 0;
	}

	.locations_wrap {
		z-index: 2;
		display: flex;
		justify-content: flex-start;
		align-items: center;
		gap: 4.75rem;
		position: relative;
	}

	.location-text {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.locations_list {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.5rem 2rem;
		flex: 1;
	}

	@media (max-width: 991px) {
		.locations_wrap {
			flex-direction: column;
			gap: 3rem;
		}

		.locations_list {
			width: 100%;
		}
	}

	@media (max-width: 767px) {
		.locations_list {
			grid-template-columns: 1fr;
		}
	}
</style>
