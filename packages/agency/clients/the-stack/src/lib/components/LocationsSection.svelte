<script lang="ts">
	/**
	 * LocationsSection Component
	 *
	 * Single location view with:
	 * - Parallax background image
	 * - Left: address and contact info
	 * - Right: embedded Google Map
	 */

	import { parallax } from '$lib/actions/parallax';
	import { inview } from '$lib/actions/inview';
	import Button from './Button.svelte';
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
			<!-- Left: Address & Contact -->
			<div class="location-text max-width-440">
				<div class="margin-bottom-16">
					<h2>
						<span class="is-word is-1">Our</span>
						<span class="is-word is-2">Location</span>
					</h2>
				</div>
				<div class="text-color-lightgrey location-details">
					<div class="location-info-block">
						<p class="text-size-medium location-address-text">
							Burleson, Texas
						</p>
					</div>
					<div class="location-info-block">
						<p class="text-size-eyebrow location-info-label">Contact</p>
						<p class="text-size-medium">Ernie</p>
						<p class="text-size-medium">
							<a href="tel:8172524555" class="location-link">(817) 252-4555</a>
						</p>
						<p class="text-size-medium">
							<a href="mailto:ernie.thestack@gmail.com" class="location-link">ernie.thestack@gmail.com</a>
						</p>
					</div>
				</div>
				<div class="margin-top-32">
					<Button href="/contact" variant="primary" showArrow>become a member</Button>
				</div>
			</div>

			<!-- Right: Google Map -->
			<div class="location-map">
				<iframe
					src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d107064.25498988564!2d-97.38!3d32.54!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x864e624e1e1cfa03%3A0x39582c7e3d4e0e97!2sBurleson%2C%20TX!5e0!3m2!1sen!2sus!4v1700000000000!5m2!1sen!2sus"
					width="100%"
					height="100%"
					style="border:0; border-radius: 1.5rem;"
					allowfullscreen
					loading="lazy"
					referrerpolicy="no-referrer-when-downgrade"
					title="The Stack Indoor Pickleball Location"
				></iframe>
			</div>
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

	.location-details {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		margin-top: 1rem;
	}

	.location-info-block {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.location-info-label {
		margin-bottom: 0.25rem;
		color: var(--green);
	}

	.location-address-text {
		font-size: 1.25rem;
	}

	.location-link {
		color: var(--light-grey);
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.location-link:hover {
		color: var(--white);
	}

	.location-map {
		flex: 1;
		min-height: 24rem;
		border-radius: 1.5rem;
		overflow: hidden;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
	}

	@media (max-width: 991px) {
		.locations_wrap {
			flex-direction: column;
			gap: 3rem;
		}

		.location-map {
			width: 100%;
			min-height: 20rem;
		}
	}

	@media (max-width: 767px) {
		.location-map {
			min-height: 16rem;
		}
	}
</style>
