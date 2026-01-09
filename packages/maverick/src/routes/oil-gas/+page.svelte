<script lang="ts">
	/**
	 * PetroX - Oil & Gas Solutions
	 * Maverick X
	 *
	 * Content fetched from CMS at request time (not build time)
	 */

	import KineticHero from '$lib/components/KineticHero.svelte';
	import TabbedSolutions from '$lib/components/TabbedSolutions.svelte';
	import OperationsHotspot from '$lib/components/OperationsHotspot.svelte';
	import { inview } from '$lib/actions/inview';
	import {
		petroxSolutions,
		petroxSolutionsHeader,
		petroxOperations,
		petroxOperationsHeader,
		petroxOperationsImages
	} from '$lib/data/petrox';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	const content = data.content;

	// Hero content with CMS overrides
	const heroTitle = content?.hero?.title ?? 'Targeted Non-Hazmat Chemistry';
	const heroSubtitle = content?.hero?.subtitle ?? 'Boost production and slash costs with PetroX—advanced chelation chemistry for enhanced oil recovery, sludge remediation, and water treatment';
	const heroVideo = content?.hero?.video ?? 'https://pub-fb87e05654104f5fbb33989fc4dca65b.r2.dev/videos/082466515-oil-rig-pumpjack-working-natur.mp4';
	const heroCta = content?.hero?.cta ?? 'Learn More';

	// Why PetroX section with CMS overrides
	const whyTitle = content?.why?.title ?? 'Why PetroX?';
	const whySubtitle = content?.why?.subtitle ?? 'Industry-leading oilfield chemistry that delivers results without the downsides of traditional treatments.';
	const whyFeatures = content?.whyFeatures ?? [
		{ icon: 'thermometer', title: 'Room Temperature Operation' },
		{ icon: 'shield-check', title: 'Non-Hazardous' },
		{ icon: 'wrench', title: 'Infrastructure-Safe' },
		{ icon: 'clock', title: 'Non-Disruptive' }
	];

	// Section headers with CMS overrides
	const solutionsHeadline = content?.solutionsHeader?.headline ?? petroxSolutionsHeader.headline;
	const operationsHeadline = content?.operationsHeader?.headline ?? petroxOperationsHeader.headline;

	// Transform petrox solutions to TabbedSolutions format
	const tabbedSolutions = petroxSolutions.map(solution => ({
		id: solution.id,
		name: solution.name,
		headline: solution.headline,
		description: solution.description,
		details: solution.details,
		image: solution.image,
		features: solution.features,
		stats: solution.stats
	}));

	let whyVisible = $state(false);
</script>

<svelte:head>
	<title>PetroX | Oil & Gas Chemistry Solutions | Maverick X</title>
	<meta name="description" content="Advanced oilfield chemistry solutions for enhanced recovery, sludge remediation, production optimization, and well stimulation. PetroX delivers proven results for the oil & gas industry." />
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
	productPrefix="PetroX"
	accentColor="petrox"
	labelType="name"
/>

<!-- Features: Why PetroX Section -->
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
		<source src="https://pub-fb87e05654104f5fbb33989fc4dca65b.r2.dev/videos/oil-pump-field.mp4" type="video/mp4" />
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
							{#if feature.icon === 'thermometer'}
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="why-icon">
									<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"></path>
								</svg>
							{:else if feature.icon === 'shield-check'}
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="why-icon">
									<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
									<path d="m9 12 2 2 4-4"></path>
								</svg>
							{:else if feature.icon === 'wrench'}
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="why-icon">
									<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"></path>
								</svg>
							{:else}
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="why-icon">
									<path d="M12 6v6l4 2"></path>
									<circle cx="12" cy="12" r="10"></circle>
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

<!-- Operations Hotspot Section -->
<OperationsHotspot
	headline={operationsHeadline}
	hotspots={petroxOperations}
	imageUrl={petroxOperationsImages.desktop}
	mobileImageUrl={petroxOperationsImages.mobile}
/>

<style>
	/* Why PetroX Section - matches React exactly */
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
		background: rgba(255, 122, 0, 0.1);  /* bg-petrox/10 */
	}

	.why-icon {
		width: 3rem;  /* w-12 */
		height: 3rem;  /* h-12 */
		color: #FF7A00;
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
