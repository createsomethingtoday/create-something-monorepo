<script lang="ts">
	/**
	 * WhySection - Shared "Why [Product]" section for product pages
	 * Used by oil-gas (PetroX) and mining (LithX) pages
	 */

	import { inview } from '$lib/actions/inview';

	interface WhyFeature {
		title: string;
		icon: string;
	}

	interface Props {
		title: string;
		subtitle: string;
		features: WhyFeature[];
		videoUrl: string;
		accentColor: 'petrox' | 'lithx';
		iconSnippet: import('svelte').Snippet<[WhyFeature]>;
	}

	let { title, subtitle, features, videoUrl, accentColor, iconSnippet }: Props = $props();

	let visible = $state(false);
</script>

<section
	use:inview={{ onInView: () => (visible = true) }}
	class="why-section"
>
	<video
		class="why-video"
		autoplay
		loop
		muted
		playsinline
		preload="auto"
	>
		<source src={videoUrl} type="video/mp4" />
	</video>
	<div class="why-overlay"></div>
	<div class="container relative z-10">
		<div
			class="why-header scroll-reveal"
			class:scroll-reveal-hidden={!visible}
		>
			<h2 class="why-title">{title}</h2>
			<p class="why-subtitle">{subtitle}</p>
		</div>
		<div class="why-grid">
			{#each features as feature, index}
				<div
					class="why-card scroll-reveal"
					class:scroll-reveal-hidden={!visible}
					class:stagger-1={index === 0}
					class:stagger-2={index === 1}
					class:stagger-3={index === 2}
					class:stagger-4={index === 3}
				>
					<div class="why-icon-wrapper">
						<div class="why-icon-bg {accentColor}">
							{@render iconSnippet(feature)}
						</div>
					</div>
					<h3 class="why-card-title">{feature.title}</h3>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.why-section {
		position: relative;
		padding: 7.5rem 0;
		background: #000000;
		overflow: hidden;
	}

	.why-video {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0.4;
	}

	.why-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
	}

	.why-header {
		max-width: 48rem;
		margin: 0 auto 4rem;
		text-align: center;
	}

	@media (max-width: 1179px) {
		.why-header {
			margin-bottom: 3rem;
		}
	}

	@media (max-width: 767px) {
		.why-header {
			margin-bottom: 2.5rem;
		}
	}

	.why-title {
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 2.5rem;
		line-height: 3.125rem;
		font-weight: 500;
		color: #ffffff;
		margin-bottom: 1rem;
	}

	@media (max-width: 1179px) {
		.why-title {
			font-size: 1.875rem;
			line-height: 2.34rem;
		}
	}

	.why-subtitle {
		font-size: 1rem;
		line-height: 1.5rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.why-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 2rem;
	}

	@media (max-width: 1179px) {
		.why-grid {
			gap: 1.5rem;
		}
	}

	@media (max-width: 1023px) {
		.why-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (max-width: 767px) {
		.why-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 480px) {
		.why-grid {
			grid-template-columns: 1fr;
		}
	}

	.why-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 1rem;
		aspect-ratio: 1 / 1;
		justify-content: center;
		background: var(--glass-bg-subtle);
		backdrop-filter: blur(var(--glass-blur-sm)) var(--glass-saturate-sm);
		border: 1px solid var(--glass-border-medium);
		border-radius: 0;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.why-card:hover {
		background: var(--glass-bg-medium);
		border-color: var(--glass-border-strong);
	}

	.why-icon-wrapper {
		margin-bottom: 1.5rem;
		width: 5rem;
		height: 5rem;
	}

	.why-icon-bg {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0;
	}

	.why-icon-bg.petrox {
		background: rgba(255, 122, 0, 0.1);
	}

	.why-icon-bg.lithx {
		background: rgba(0, 194, 168, 0.1);
	}

	.why-icon-bg :global(.why-icon) {
		width: 3rem;
		height: 3rem;
	}

	.why-icon-bg.petrox :global(.why-icon) {
		color: #FF7A00;
	}

	.why-icon-bg.lithx :global(.why-icon) {
		color: #00C2A8;
	}

	.why-card-title {
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 1.25rem;
		line-height: 1.56rem;
		font-weight: 500;
		color: #ffffff;
	}

	@media (max-width: 1179px) {
		.why-card-title {
			font-size: 1.125rem;
			line-height: 1.41rem;
		}
	}
</style>
