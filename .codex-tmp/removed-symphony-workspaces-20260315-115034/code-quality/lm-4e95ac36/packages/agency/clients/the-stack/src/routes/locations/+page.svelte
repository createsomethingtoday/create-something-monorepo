<script lang="ts">
	import { inview } from '$lib/actions/inview';
	import Button from '$lib/components/Button.svelte';
	import BottomCTA from '$lib/components/BottomCTA.svelte';
</script>

<svelte:head>
	<title>Our Location - The Stack Indoor Pickleball</title>
	<meta name="description" content="Visit The Stack Indoor Pickleball in Burleson, Texas. Contact Ernie at (817) 252-4555." />
</svelte:head>

<!-- Hero Section -->
<section class="section is-location-hero" use:inview>
	<div class="container-large">
		<div class="hero-content">
			<div class="hero-text">
				<div class="margin-bottom-16">
					<h1 class="heading-style-h1">
						<span class="is-word is-1">Our</span>
						<span class="is-word is-2">Location</span>
					</h1>
				</div>
				<div class="margin-bottom-24">
					<p class="text-size-medium">
						Come visit us in Burleson, Texas. Our state-of-the-art indoor facility features PPA-qualified courts, indirect lighting, and a welcoming community for players of all levels.
					</p>
				</div>
				<Button href="/contact" showArrow>Become a Member</Button>
			</div>
		</div>

		<!-- Location Details + Map -->
		<div class="location-layout reveal-element">
			<!-- Contact Info -->
			<div class="location-info">
				<div class="info-block">
					<p class="info-label">Address</p>
					<p class="info-text">Burleson, Texas</p>
				</div>
				<div class="info-block">
					<p class="info-label">Contact</p>
					<p class="info-text info-name">Ernie</p>
					<p class="info-text">
						<a href="tel:8172524555" class="info-link">(817) 252-4555</a>
					</p>
					<p class="info-text">
						<a href="mailto:ernie.thestack@gmail.com" class="info-link">ernie.thestack@gmail.com</a>
					</p>
				</div>
				<div class="info-block">
					<p class="info-label">Hours</p>
					<p class="info-text">Open 7 days a week</p>
				</div>
			</div>

			<!-- Map -->
			<div class="location-map">
				<iframe
					src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d26766.06!2d-97.3308!3d32.5421!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x864e624e1e1cfa03%3A0x39582c7e3d4e0e97!2sBurleson%2C%20TX!5e0!3m2!1sen!2sus!4v1700000000000!5m2!1sen!2sus"
					width="100%"
					height="100%"
					style="border:0;"
					allowfullscreen
					loading="lazy"
					referrerpolicy="no-referrer-when-downgrade"
					title="The Stack Indoor Pickleball Location"
				></iframe>
			</div>
		</div>
	</div>
</section>

<BottomCTA />

<style>
	.section.is-location-hero {
		padding-top: 10rem;
		padding-bottom: 5rem;
		background-color: var(--black);
		color: var(--white);
	}

	.hero-content {
		margin-bottom: 4rem;
	}

	.hero-text {
		max-width: 36rem;
	}

	.margin-bottom-16 {
		margin-bottom: 1rem;
	}

	.margin-bottom-24 {
		margin-bottom: 1.5rem;
	}

	.text-size-medium {
		font-family: var(--font-satoshi);
		font-size: 1.125rem;
		line-height: 1.6;
		color: var(--light-grey);
	}

	/* Location Layout */
	.location-layout {
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: 3rem;
		align-items: stretch;
	}

	/* Contact Info */
	.location-info {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		padding: 2.5rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 1.5rem;
	}

	.info-block {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.info-label {
		font-family: var(--font-coolvetica);
		font-size: var(--text-eyebrow);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--green);
		margin-bottom: 0.375rem;
	}

	.info-text {
		font-family: var(--font-satoshi);
		font-size: 1rem;
		color: var(--light-grey);
	}

	.info-name {
		font-weight: 500;
		color: var(--white);
	}

	.info-link {
		color: var(--light-grey);
		text-decoration: none;
		transition: color var(--duration-hover) var(--ease-hover);
	}

	.info-link:hover {
		color: var(--white);
	}

	/* Map */
	.location-map {
		border-radius: 1.5rem;
		overflow: hidden;
		min-height: 24rem;
		box-shadow:
			0 25px 50px -12px rgba(0, 0, 0, 0.5),
			0 0 0 1px rgba(255, 255, 255, 0.08);
	}

	.location-map iframe {
		display: block;
		width: 100%;
		height: 100%;
		min-height: 24rem;
	}

	/* Responsive */
	@media (max-width: 991px) {
		.section.is-location-hero {
			padding-top: 8rem;
		}

		.location-layout {
			grid-template-columns: 1fr;
		}

		.location-map {
			min-height: 20rem;
		}

		.location-map iframe {
			min-height: 20rem;
		}
	}

	@media (max-width: 479px) {
		.section.is-location-hero {
			padding-top: 6rem;
			padding-bottom: 4rem;
		}

		.location-info {
			padding: 2rem 1.5rem;
		}

		.location-map {
			min-height: 16rem;
		}

		.location-map iframe {
			min-height: 16rem;
		}
	}
</style>
