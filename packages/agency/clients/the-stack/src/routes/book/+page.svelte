<script lang="ts">
	import { onMount } from 'svelte';
	import { inview } from '$lib/actions/inview';
	import BottomCTA from '$lib/components/BottomCTA.svelte';

	// Widget will be loaded via script tag
	let widgetContainer: HTMLElement;
	let widgetReady = $state(false);
	let widgetError = $state<string | null>(null);

	onMount(() => {
		// Load the Court Reserve widget script
		const script = document.createElement('script');
		script.src =
			import.meta.env.MODE === 'development'
				? 'http://localhost:5173/embed.js'
				: 'https://courtreserve.createsomething.space/embed.js';
		script.async = true;

		script.onload = () => {
			// Initialize widget when script loads
			try {
				if (typeof (window as any).CourtReserve !== 'undefined') {
					(window as any).CourtReserve.createWidget({
						facilitySlug: 'thestack',
						container: '#booking-widget',
						theme: 'dark',
						onReservationComplete: (reservation: any) => {
							console.log('Reservation completed:', reservation);
							// Could trigger analytics event here
							if (typeof gtag !== 'undefined') {
								(window as any).gtag('event', 'booking', {
									event_category: 'court_reserve',
									event_label: reservation.courtName,
									value: reservation.price
								});
							}
						},
						onReady: () => {
							widgetReady = true;
						},
						onError: (error: Error) => {
							widgetError = error.message;
							console.error('Widget error:', error);
						}
					});
				}
			} catch (err) {
				widgetError = err instanceof Error ? err.message : 'Failed to load booking widget';
				console.error('Widget initialization error:', err);
			}
		};

		script.onerror = () => {
			widgetError = 'Failed to load booking widget';
		};

		document.head.appendChild(script);

		return () => {
			// Cleanup on unmount
			if (script.parentNode) {
				script.parentNode.removeChild(script);
			}
		};
	});
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
		<div class="margin-bottom-48">
			<div class="max-width-720">
				<div class="margin-bottom-16">
					<h1 class="heading-style-h1">
						<span class="is-word is-1">Book</span>
						<span class="is-word is-2">A</span>
						<span class="is-word is-3">Court</span>
					</h1>
				</div>
				<div class="margin-bottom-24">
					<p class="text-size-medium">
						<strong>Reserve Your Court</strong> – Choose your preferred location, date, and time.
						Book instantly and get ready to play at The Stack.
					</p>
				</div>
			</div>
		</div>

		<!-- Widget Container -->
		<div id="booking-widget" class="widget-wrapper" bind:this={widgetContainer}>
			{#if widgetError}
				<div class="widget-error">
					<p>Unable to load booking widget</p>
					<p class="error-detail">{widgetError}</p>
					<p class="error-fallback">
						Please contact us directly at <a href="mailto:hello@thestackpickleball.com"
							>hello@thestackpickleball.com</a
						> to book your court.
					</p>
				</div>
			{:else if !widgetReady}
				<div class="widget-loading">
					<div class="spinner"></div>
					<p>Loading booking widget...</p>
				</div>
			{/if}
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

	.margin-bottom-48 {
		margin-bottom: 3rem;
	}

	.max-width-720 {
		max-width: 45rem;
	}

	.margin-bottom-16 {
		margin-bottom: 1rem;
	}

	.margin-bottom-24 {
		margin-bottom: 1.5rem;
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

	/* Widget Wrapper */
	.widget-wrapper {
		min-height: 600px;
		opacity: 0;
		transform: translateY(1rem);
		animation: fadeUp 0.8s var(--ease-stack) 0.4s forwards;
	}

	@keyframes fadeUp {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Widget Loading State */
	.widget-loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 400px;
		gap: 1rem;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(255, 255, 255, 0.1);
		border-top-color: rgba(255, 255, 255, 0.5);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.widget-loading p {
		font-family: var(--font-satoshi);
		font-size: 1rem;
		color: var(--light-grey);
		margin: 0;
	}

	/* Widget Error State */
	.widget-error {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 400px;
		gap: 1rem;
		text-align: center;
		padding: 2rem;
		background: rgba(212, 77, 77, 0.1);
		border: 1px solid rgba(212, 77, 77, 0.3);
		border-radius: var(--hero-video-radius);
	}

	.widget-error p {
		font-family: var(--font-satoshi);
		font-size: 1rem;
		color: var(--light-grey);
		margin: 0;
	}

	.widget-error p:first-child {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--white);
	}

	.error-detail {
		font-size: 0.875rem !important;
		color: rgba(212, 77, 77, 1) !important;
		font-family: 'Courier New', monospace;
	}

	.error-fallback a {
		color: var(--white);
		text-decoration: underline;
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
