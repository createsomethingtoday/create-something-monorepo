<script lang="ts">
	/**
	 * LithX - Mining & Metals Solutions
	 * Maverick X
	 *
	 * Content fetched from CMS at request time (not build time)
	 */

	import KineticHero from '$lib/components/KineticHero.svelte';
	import TabbedSolutions from '$lib/components/TabbedSolutions.svelte';
	import ProcessSection from '$lib/components/ProcessSection.svelte';
	import { inview } from '$lib/actions/inview';
	import {
		lithxSolutions,
		lithxSolutionsHeader,
		lithxMethods,
		lithxMethodsHeader
	} from '$lib/data/lithx';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	const content = data.content;

	// Hero content with CMS overrides
	const heroTitle = content?.hero?.title ?? 'Next Generation Recovery';
	const heroSubtitle = content?.hero?.subtitle ?? 'Valorize low-grade ores with LithX—advanced chelation technology for critical metals recovery from heaps, tailings, and complex mineralogy';
	const heroVideo = content?.hero?.video ?? 'https://pub-fb87e05654104f5fbb33989fc4dca65b.r2.dev/videos/168384056-deep-open-pit-mine-copper-ore-.mp4';
	const heroCta = content?.hero?.cta ?? 'Learn More';

	// Why section with CMS overrides
	const whyTitle = content?.why?.title ?? 'Advanced Chelation Technology';
	const whySubtitle = content?.why?.subtitle ?? 'Our proprietary chemistry platform enables efficient metal extraction with reduced environmental impact and operational complexity.';
	const whyFeatures = content?.whyFeatures ?? [
		{ icon: 'beaker', title: 'Ultra-Strong Chelators' },
		{ icon: 'thermometer', title: 'Ambient Temperature' },
		{ icon: 'leaf', title: 'Environmentally Friendly' },
		{ icon: 'plug', title: 'Drop-In Solution' }
	];

	// Section headers with CMS overrides
	const solutionsHeadline = content?.solutionsHeader?.headline ?? lithxSolutionsHeader.headline;
	const methodsHeadline = content?.methodsHeader?.headline ?? lithxMethodsHeader.headline;

	// Transform lithx solutions to TabbedSolutions format
	const tabbedSolutions = lithxSolutions.map(solution => ({
		id: solution.id,
		name: solution.name,
		symbol: solution.symbol,
		description: solution.description,
		details: solution.details,
		image: solution.image,
		features: solution.features,
		stats: solution.stats
	}));

	// Transform lithx methods to ProcessSection format
	const processSteps = lithxMethods.map(method => ({
		id: method.id,
		title: method.name,
		description: method.details,
		image: method.image,
		ctaText: 'Learn More'
	}));

	let whyVisible = $state(false);
</script>

<svelte:head>
	<title>LithX | Mining & Metals Solutions | Maverick X</title>
	<meta name="description" content="Next-generation metal recovery chemistry for critical minerals extraction. LithX enables sustainable, high-yield processing for lithium, cobalt, and rare earth elements." />
</svelte:head>

<!-- Hero Section (Main) -->
<KineticHero
	videoSrc={heroVideo}
	title={heroTitle}
	subtitle={heroSubtitle}
	ctaText={heroCta}
/>

<!-- Tabbed Solutions Section -->
<TabbedSolutions
	headline={solutionsHeadline}
	solutions={tabbedSolutions}
	productPrefix="LithX"
	accentColor="lithx"
	labelType="symbol"
/>

<!-- Features: Advanced Chelation Technology Section -->
<section
	use:inview
	oninview={() => whyVisible = true}
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
		<source src="https://pub-fb87e05654104f5fbb33989fc4dca65b.r2.dev/videos/mining-aerial.mp4" type="video/mp4" />
	</video>
	<div class="why-overlay"></div>
	<div class="container relative z-10">
		<div
			class="why-header scroll-reveal"
			class:scroll-reveal-hidden={!whyVisible}
		>
			<h2 class="why-title">{whyTitle}</h2>
			<p class="why-subtitle">{whySubtitle}</p>
		</div>
		<div class="why-grid">
			{#each whyFeatures as feature, index}
				<div
					class="why-card scroll-reveal"
					class:scroll-reveal-hidden={!whyVisible}
					class:stagger-1={index === 0}
					class:stagger-2={index === 1}
					class:stagger-3={index === 2}
					class:stagger-4={index === 3}
				>
					<div class="why-icon-wrapper">
						<div class="why-icon-bg">
							{#if feature.icon === 'beaker'}
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="why-icon">
									<path d="M4.5 3h15"></path>
									<path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3"></path>
									<path d="M6 14h12"></path>
								</svg>
							{:else if feature.icon === 'thermometer'}
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="why-icon">
									<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"></path>
								</svg>
							{:else if feature.icon === 'leaf'}
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="why-icon">
									<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path>
									<path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
								</svg>
							{:else}
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="why-icon">
									<path d="M12 2v10"></path>
									<path d="M18.4 6.6a9 9 0 1 1-12.77.04"></path>
								</svg>
							{/if}
						</div>
					</div>
					<h3 class="why-card-title">{feature.title}</h3>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Methods/Process Section -->
<ProcessSection
	headline={methodsHeadline}
	steps={processSteps}
	numbered={false}
	accentColor="lithx"
/>

<style>
	/* Why LithX Section - matches React exactly */
	.why-section {
		position: relative;
		padding: 7.5rem 0;  /* py-30 */
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
		max-width: 48rem;  /* max-w-3xl */
		margin: 0 auto 4rem;  /* mb-16 */
		text-align: center;
	}

	@media (max-width: 1179px) {
		.why-header {
			margin-bottom: 3rem;  /* xl:mb-12 */
		}
	}

	@media (max-width: 767px) {
		.why-header {
			margin-bottom: 2.5rem;  /* md:mb-10 */
		}
	}

	.why-title {
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 2.5rem;  /* text-h2: 2.5rem */
		line-height: 3.125rem;
		font-weight: 500;
		color: #ffffff;
		margin-bottom: 1rem;
	}

	@media (max-width: 1179px) {
		.why-title {
			font-size: 1.875rem;  /* xl:text-h2 */
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
		gap: 2rem;  /* gap-8 */
	}

	@media (max-width: 1179px) {
		.why-grid {
			gap: 1.5rem;  /* xl:gap-6 */
		}
	}

	@media (max-width: 1023px) {
		.why-grid {
			grid-template-columns: repeat(3, 1fr);  /* lg:grid-cols-3 */
		}
	}

	@media (max-width: 767px) {
		.why-grid {
			grid-template-columns: repeat(2, 1fr);  /* md:grid-cols-2 */
		}
	}

	@media (max-width: 480px) {
		.why-grid {
			grid-template-columns: 1fr;  /* sm:grid-cols-1 */
		}
	}

	.why-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 1rem;  /* p-4 */
		aspect-ratio: 1 / 1;  /* aspect-square */
		justify-content: center;
		background: rgba(0, 0, 0, 0.4);  /* bg-black/40 */
		backdrop-filter: blur(4px);  /* backdrop-blur-sm */
		border: 1px solid rgba(255, 255, 255, 0.2);  /* border-white/20 */
		border-radius: 0;  /* Sharp corners - React has all radius = 0 */
		transition: all 0.3s ease;
	}

	.why-card:hover {
		background: rgba(0, 0, 0, 0.5);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.why-icon-wrapper {
		margin-bottom: 1.5rem;  /* mb-6 */
		width: 5rem;  /* w-20 */
		height: 5rem;  /* h-20 */
	}

	.why-icon-bg {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0;  /* Sharp corners - React rounded-xl = 0 */
		background: rgba(0, 194, 168, 0.1);  /* bg-lithx/10 */
	}

	.why-icon {
		width: 3rem;  /* w-12 */
		height: 3rem;  /* h-12 */
		color: #00C2A8;
	}

	.why-card-title {
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 1.25rem;  /* text-h5: 1.25rem */
		line-height: 1.56rem;
		font-weight: 500;
		color: #ffffff;
	}

	@media (max-width: 1179px) {
		.why-card-title {
			font-size: 1.125rem;  /* xl:text-h5 */
			line-height: 1.41rem;
		}
	}
</style>
