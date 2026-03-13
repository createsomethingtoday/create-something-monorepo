<script lang="ts">
	import { inview } from '$lib/actions/inview';
	import BottomCTA from '$lib/components/BottomCTA.svelte';
</script>

<svelte:head>
	<title>Book a Court - The Stack Indoor Pickleball</title>
	<meta
		name="description"
		content="Reserve your court at The Stack Indoor Pickleball. Easy online booking for all locations."
	/>
</svelte:head>

<!-- Hero Section -->
<section class="section is-book-hero" use:inview>
	<div class="container-large">
		<div class="section-header text-center margin-bottom-48">
			<div class="margin-bottom-16">
				<h1 class="heading-style-h1">
					<span class="is-word is-1">Book</span>
					<span class="is-word is-2">A</span>
					<span class="is-word is-3">Court</span>
				</h1>
			</div>
			<p class="text-size-medium reveal-element">
				<strong>Reserve Your Court</strong> – Choose your preferred location, date, and time.
				Book instantly and get ready to play at The Stack.
			</p>
		</div>

		<!-- Booking Widget -->
		<div class="booking-widget">
			<iframe
				src="https://clearway.pages.dev/embed?facility=thestack&theme=dark"
				title="Book a Court"
				frameborder="0"
				scrolling="yes"
			></iframe>
		</div>
	</div>
</section>

<!-- Bottom CTA -->
<BottomCTA />

<style>
	.section.is-book-hero {
		padding-top: 10rem;
		padding-bottom: 6rem;
		background-color: var(--black);
		min-height: 100vh;
	}

	.container-large {
		max-width: 82rem;
		margin-left: auto;
		margin-right: auto;
		padding-left: 2rem;
		padding-right: 2rem;
	}

	.section-header {
		max-width: 48rem;
		margin-left: auto;
		margin-right: auto;
	}

	.text-center {
		text-align: center;
	}

	.margin-bottom-48 {
		margin-bottom: 3rem;
	}

	.margin-bottom-16 {
		margin-bottom: 1rem;
	}

	.reveal-element {
		opacity: 0;
		transform: translateY(1rem);
		animation: fadeUp 0.6s var(--ease-stack) 0.4s forwards;
	}

	.heading-style-h1 {
		font-family: var(--font-coolvetica);
		font-size: clamp(4rem, 10vw, 11.25rem);
		line-height: 0.95;
		letter-spacing: -0.02em;
		text-transform: uppercase;
		color: var(--white);
		margin: 0;
	}

	.heading-style-h1 .is-word {
		display: inline-block;
		opacity: 0;
		transform: translateY(0.5em);
		animation: wordReveal 0.8s var(--ease-stack) forwards;
	}

	.heading-style-h1 .is-word.is-1 {
		animation-delay: 0.1s;
	}

	.heading-style-h1 .is-word.is-2 {
		animation-delay: 0.2s;
	}

	.heading-style-h1 .is-word.is-3 {
		animation-delay: 0.3s;
	}

	@keyframes wordReveal {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.text-size-medium {
		font-family: var(--font-satoshi);
		font-size: 1.125rem;
		line-height: 1.6;
		color: var(--light-grey);
	}

	.text-size-medium strong {
		color: var(--white);
	}

	/* Booking Widget */
	.booking-widget {
		max-width: 900px;
		margin: 0 auto;
		border-radius: 12px;
		overflow: hidden;
		background: var(--dark-grey);
		opacity: 0;
		transform: translateY(1rem);
		animation: fadeUp 0.8s var(--ease-stack) 0.4s forwards;
	}

	.booking-widget iframe {
		display: block;
		width: 100%;
		min-height: calc(100vh - 12rem);
		height: calc(100vh - 12rem);
		border: none;
		border-radius: 12px;
	}

	@keyframes fadeUp {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Responsive */
	@media (max-width: 991px) {
		.section.is-book-hero {
			padding-top: 8rem;
		}
	}

	@media (max-width: 479px) {
		.section.is-book-hero {
			padding-top: 6rem;
			padding-bottom: 4rem;
		}

		.margin-bottom-48 {
			margin-bottom: 2rem;
		}
	}
</style>
