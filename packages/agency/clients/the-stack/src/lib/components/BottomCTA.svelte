<script lang="ts">
	/**
	 * BottomCTA Component
	 *
	 * Full-width CTA with background image and scroll-based scale animation.
	 */

	import { onMount } from 'svelte';
	import Button from './Button.svelte';
	import { inview } from '$lib/actions/inview';

	interface Props {
		title?: string;
		ctaText?: string;
		ctaHref?: string;
		image?: string;
	}

	let {
		title = 'Ready to become a member?',
		ctaText = 'Become a member now',
		ctaHref = '/contact',
		image = '/images/tennis-image-08_1tennis-image-08.avif'
	}: Props = $props();

	let scale = $state(0.85);
	let ctaBox: HTMLElement;

	onMount(() => {
		const handleScroll = () => {
			if (!ctaBox) return;

			const rect = ctaBox.getBoundingClientRect();
			const viewportHeight = window.innerHeight;

			// Scale from 0.85 to 1 as element comes into view
			// Start scaling when element is 80% down the viewport
			const startPoint = viewportHeight * 0.8;
			const endPoint = viewportHeight * 0.3;

			if (rect.top > startPoint) {
				scale = 0.85;
			} else if (rect.top < endPoint) {
				scale = 1;
			} else {
				const progress = (startPoint - rect.top) / (startPoint - endPoint);
				scale = 0.85 + (progress * 0.15);
			}
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		handleScroll();

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});
</script>

<section class="section is-bottom-cta">
	<div class="container-large">
		<div class="bottom-cta_wrap" use:inview>
			<div class="max-width-700 cta-heading">
				<h2 class="heading-style-h1">
					<span class="is-word is-1">Ready</span>
					<span class="is-word is-2">to</span>
					<br />
					<span class="is-word is-3">become a member?</span>
				</h2>
			</div>

			<div
				class="bottom-cta_box"
				bind:this={ctaBox}
				style="transform: scale({scale}); will-change: transform;"
			>
				<div class="video_bg">
					<div class="video_bg_overlay"></div>
					<img src={image} loading="lazy" alt="" class="img-cover" />
				</div>
			</div>

			<div class="max-width-full">
				<Button href={ctaHref} variant="secondary" showArrow>{ctaText}</Button>
			</div>
		</div>
	</div>
</section>

<style>
	.section.is-bottom-cta {
		padding-top: 7.5rem;
		padding-bottom: 5rem;
	}

	.bottom-cta_wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 3rem;
	}

	.cta-heading {
		position: relative;
		z-index: 10;
	}

	.bottom-cta_box {
		border-radius: var(--bottom-cta-radius);
		width: 100%;
		aspect-ratio: 16 / 9;
		max-height: 500px;
		position: relative;
		overflow: hidden;
		transform-style: preserve-3d;
	}

	.video_bg {
		z-index: 1;
		display: flex;
		justify-content: flex-start;
		align-items: flex-end;
		width: 100%;
		height: 100%;
		position: absolute;
		inset: 0;
	}

	.video_bg_overlay {
		z-index: 2;
		background-image: linear-gradient(0deg, rgba(0, 0, 0, 0.25), transparent);
		position: absolute;
		inset: 0;
	}

	.max-width-full {
		width: 100%;
		display: flex;
		justify-content: center;
	}

	@media (max-width: 991px) {
		.section.is-bottom-cta {
			padding-top: 5rem;
			padding-bottom: 3rem;
		}
	}
</style>
