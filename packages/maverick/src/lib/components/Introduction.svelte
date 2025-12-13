<script lang="ts">
	/**
	 * Introduction Component - 3-column showcase grid
	 * Maverick X Design System
	 */

	import { inview } from '$lib/actions/inview';

	interface ShowcaseItem {
		href: string;
		image: string;
		title: string;
		accentColor: 'petrox' | 'lithx' | 'dme';
	}

	interface Props {
		headline?: string;
		showcaseImages?: ShowcaseItem[];
	}

	let { headline, showcaseImages }: Props = $props();

	let visible = $state(false);

	const defaultHeadline = 'Breakthrough chemical solutions across the most critical resource markets';

	const defaultShowcase: ShowcaseItem[] = [
		{
			href: '/oil-gas',
			image: '/images/oil-splash.png',
			title: 'Oil & Gas',
			accentColor: 'petrox'
		},
		{
			href: '/mining',
			image: '/images/metal-nuggets.png',
			title: 'Mining & Metals',
			accentColor: 'lithx'
		},
		{
			href: '/water-treatment',
			image: '/images/water-splash.png',
			title: 'Water Treatment',
			accentColor: 'dme'
		}
	];

	// Use provided showcaseImages only if it's a valid non-empty array with complete items
	const items = (showcaseImages && showcaseImages.length > 0 && showcaseImages[0]?.href)
		? showcaseImages
		: defaultShowcase;

	const displayHeadline = headline || defaultHeadline;
</script>

<section
	use:inview
	oninview={() => (visible = true)}
	class="intro-section"
>
	<div class="container">
		<!-- Headline -->
		<div
			class="scroll-reveal"
			class:scroll-reveal-hidden={!visible}
		>
			<h2 class="intro-headline">
				{displayHeadline}
			</h2>
		</div>

		<!-- 3-Column Showcase Grid -->
		<div class="showcase-grid">
			{#each items as item, index}
				<article
					class="group showcase-item scroll-reveal"
					class:scroll-reveal-hidden={!visible}
					class:stagger-1={index === 0}
					class:stagger-2={index === 1}
					class:stagger-3={index === 2}
				>
					<a href={item.href} class="showcase-link">
						<div class="showcase-image-wrapper">
							<div
								class="showcase-image showcase-image-{item.accentColor}"
								style="background-image: url({item.image})"
							></div>
						</div>
						<h3 class="showcase-title showcase-title-{item.accentColor}">
							{item.title}
						</h3>
					</a>
				</article>
			{/each}
		</div>
	</div>
</section>

<style>
	.intro-section {
		position: relative;
		padding: 5rem 0;
		background: #ffffff;
		overflow: hidden;
	}

	.intro-headline {
		max-width: 56rem;
		margin-bottom: 4rem;
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 3.5rem;
		font-weight: 500;
		color: #212121;
		line-height: 1.2;
	}

	@media (max-width: 1179px) {
		.intro-headline {
			font-size: 3rem;
			margin-bottom: 3rem;
		}
	}

	@media (max-width: 1023px) {
		.intro-headline {
			font-size: 2.5rem;
			margin-bottom: 2.5rem;
		}
	}

	@media (max-width: 767px) {
		.intro-headline {
			font-size: 2rem;
			margin-bottom: 2rem;
		}
	}

	.showcase-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 4rem;  /* gap-16 */
	}

	@media (max-width: 1179px) {
		.showcase-grid {
			gap: 3rem;  /* xl:gap-12 */
		}
	}

	@media (max-width: 1023px) {
		.showcase-grid {
			grid-template-columns: 1fr;  /* lg:grid-cols-1 */
			gap: 2.5rem;  /* lg:gap-10 */
		}
	}

	.showcase-item {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.showcase-link {
		display: block;
		width: 100%;
	}

	.showcase-image-wrapper {
		position: relative;
		aspect-ratio: 1 / 1;
		width: 100%;
		max-width: 28rem;
		margin: 0 auto 1.5rem;
		transition: transform 0.5s ease;
	}

	:global(.group:hover) .showcase-image-wrapper {
		transform: scale(1.05);
	}

	.showcase-image {
		position: absolute;
		inset: 0;
		background-size: contain;
		background-position: center;
		background-repeat: no-repeat;
	}

	/* Gradient fallbacks when images don't load */
	.showcase-image-petrox {
		background-color: transparent;
	}

	.showcase-image-lithx {
		background-color: transparent;
	}

	.showcase-image-dme {
		background-color: transparent;
	}

	.showcase-title {
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 1.25rem;
		font-weight: 600;
		color: #212121;
		text-align: center;
		letter-spacing: 0.025em;
		transition: color 0.3s ease;
	}

	/* Hover colors */
	:global(.group:hover) .showcase-title-petrox {
		color: #FF7A00;
	}

	:global(.group:hover) .showcase-title-lithx {
		color: #00C2A8;
	}

	:global(.group:hover) .showcase-title-dme {
		color: #06B6D4;
	}
</style>
