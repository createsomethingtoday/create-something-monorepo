<script lang="ts">
	/**
	 * HydroX - Water Treatment Solutions
	 * Maverick X
	 */

	import KineticHero from '$lib/components/KineticHero.svelte';
	import Button from '$lib/components/Button.svelte';
	import { inview } from '$lib/actions/inview';

	// Hero content - matches React dmeHero
	const heroContent = {
		title: 'Introducing HydroX',
		subtitle: 'Unlocking new domestic sources of critical minerals and industrial water',
		video: 'https://pub-fb87e05654104f5fbb33989fc4dca65b.r2.dev/videos/124452682-engineers-assessing-waste-wate.mp4',
		cta: 'Learn More'
	};

	// Statistics section - matches React dmeStatisticsContent
	const statisticsContent = {
		headline: 'HydroX is a process that cleans wastewater for industrial use while recovering and processing valuable byproducts',
		cta: 'Learn More'
	};

	// Metals of interest - matches React dmeMetalImages
	const metals = [
		{ id: 'gold', label: 'Gold', image: '/images/metals/gold.png', alt: 'Gold nuggets' },
		{ id: 'platinum', label: 'Platinum', image: '/images/metals/platinum.png', alt: 'Platinum metal' },
		{ id: 'iridium', label: 'Iridium', image: '/images/metals/iridium.png', alt: 'Iridium metal' },
		{ id: 'rare-earth', label: 'Rare Earth Elements', image: '/images/metals/rare-earth-elements.png', alt: 'Rare Earth Elements' },
		{ id: 'vanadium', label: 'Vanadium', image: '/images/metals/vanadium.png', alt: 'Vanadium metal' },
		{ id: 'other', label: 'Other', image: '/images/metals/other.png', alt: 'Other valuable metals' }
	];

	// Waste sources - matches React dmeWasteSources
	const wasteSources = [
		{
			id: 'produced-water',
			title: 'Produced Water',
			description: 'Water that emerges from oil and gas wells during extraction. Our HydroX technology recovers valuable metals while preparing water for safe disposal or beneficial reuse.',
			image: '/images/waste-sources/produced-water.png'
		},
		{
			id: 'mine-effluent',
			title: 'Mine Effluent',
			description: 'Wastewater discharged from active mining operations. We extract dissolved metals that would otherwise be lost, turning environmental liability into economic opportunity.',
			image: '/images/waste-sources/mine-effluent.png'
		},
		{
			id: 'acid-mine-drainage',
			title: 'Acid Mine Drainage',
			description: 'Acidic water flowing from abandoned mines laden with dissolved metals. Our chemistry neutralizes acidity while recovering valuable resources from legacy contamination.',
			image: '/images/waste-sources/acid-mine-drainage.png'
		},
		{
			id: 'sewage',
			title: 'Sewage',
			description: 'Municipal wastewater contains trace metals from industrial and domestic sources. HydroX enables recovery of these metals during treatment, creating new value streams for utilities.',
			image: '/images/waste-sources/sewage.png'
		},
		{
			id: 'industrial-wastewater',
			title: 'Other Industrial Wastewater',
			description: 'Manufacturing, electronics, and chemical processing generate metal-rich waste streams. Our technology adapts to diverse industrial sources for maximum metal recovery.',
			image: '/images/waste-sources/industrial-wastewater.png'
		}
	];

	let statisticsVisible = $state(false);
	let metalsVisible = $state(false);
	let activeSourceIndex = $state(0);
	let isTransitioning = $state(false);

	function goToSlide(index: number) {
		if (isTransitioning || index === activeSourceIndex) return;
		isTransitioning = true;
		activeSourceIndex = index;
		setTimeout(() => isTransitioning = false, 800);
	}

	function goToPrev() {
		if (activeSourceIndex > 0) goToSlide(activeSourceIndex - 1);
	}

	function goToNext() {
		if (activeSourceIndex < wasteSources.length - 1) goToSlide(activeSourceIndex + 1);
	}

	function openContactModal() {
		window.dispatchEvent(new CustomEvent('openContactModal', { detail: { categoryId: 'water' } }));
	}
</script>

<svelte:head>
	<title>HydroX | Water Treatment Solutions | Maverick X</title>
	<meta name="description" content="Transform industrial wastewater into revenue with HydroX technology. Recover valuable metals from produced water while purifying for safe discharge or reuse." />
</svelte:head>

<!-- Hero Section (Main) -->
<KineticHero
	videoSrc={heroContent.video}
	title={heroContent.title}
	subtitle={heroContent.subtitle}
	ctaText={heroContent.cta}
/>

<!-- Statistics Section - matches React (headline + CTA only, no stat cards) -->
<section
	use:inview
	oninview={() => statisticsVisible = true}
	class="statistics-section"
>
	<div class="container">
		<div class="statistics-content">
			<h2
				class="statistics-headline scroll-reveal"
				class:scroll-reveal-hidden={!statisticsVisible}
			>
				{statisticsContent.headline}
			</h2>
			<div
				class="statistics-cta scroll-reveal stagger-1"
				class:scroll-reveal-hidden={!statisticsVisible}
			>
				<Button
					title={statisticsContent.cta}
					arrow
					onclick={openContactModal}
				/>
			</div>
		</div>
	</div>
</section>

<!-- Metals of Interest Section -->
<section
	use:inview
	oninview={() => metalsVisible = true}
	class="metals-section"
>
	<div class="container">
		<h2
			class="metals-headline scroll-reveal"
			class:scroll-reveal-hidden={!metalsVisible}
		>
			Metals of interest
		</h2>
		<div class="metals-grid">
			{#each metals as metal, index}
				<article
					class="metal-card scroll-reveal"
					class:scroll-reveal-hidden={!metalsVisible}
					class:stagger-1={index === 0}
					class:stagger-2={index === 1}
					class:stagger-3={index === 2}
					class:stagger-4={index === 3}
					class:stagger-5={index === 4}
					class:stagger-6={index === 5}
				>
					<div class="metal-image-wrapper">
						<img
							src={metal.image}
							alt={metal.alt}
							class="metal-image"
							loading="lazy"
						/>
					</div>
					<h3 class="metal-label">{metal.label}</h3>
				</article>
			{/each}
		</div>
		<div
			class="metals-cta scroll-reveal stagger-3"
			class:scroll-reveal-hidden={!metalsVisible}
		>
			<Button
				title="Learn More"
				arrow
				onclick={openContactModal}
			/>
		</div>
	</div>
</section>

<!-- Waste Sources Carousel Section -->
<section class="waste-section">
	<div class="waste-content">
		<!-- Background Images -->
		{#each wasteSources as source, index}
			<div
				class="waste-bg"
				class:active={index === activeSourceIndex}
				aria-hidden={index !== activeSourceIndex}
			>
				<img
					src={source.image}
					alt={source.title}
					class="waste-bg-image"
					loading={index === 0 ? 'eager' : 'lazy'}
				/>
				<div class="waste-gradient"></div>
			</div>
		{/each}

		<!-- Static Title - Top Left -->
		<div class="waste-header">
			<h2 class="waste-title">Recover From</h2>
		</div>

		<!-- Content Overlay -->
		<div class="waste-info">
			<div class="waste-info-content">
				{#key activeSourceIndex}
					<h3 class="waste-source-title">{wasteSources[activeSourceIndex].title}</h3>
					<p class="waste-source-description">{wasteSources[activeSourceIndex].description}</p>
				{/key}

				<!-- Progress Bar -->
				<div class="waste-progress">
					<div class="waste-progress-bar">
						<div
							class="waste-progress-fill"
							style="width: {((activeSourceIndex + 1) / wasteSources.length) * 100}%"
						></div>
					</div>
					<span class="waste-progress-count">
						{String(activeSourceIndex + 1).padStart(2, '0')} / {String(wasteSources.length).padStart(2, '0')}
					</span>
				</div>

				<Button
					title="Learn More"
					light
					arrow
					onclick={openContactModal}
				/>
			</div>
		</div>

		<!-- Navigation - Bottom Right -->
		<div class="waste-nav">
			<button
				class="waste-nav-btn"
				onclick={goToPrev}
				disabled={activeSourceIndex === 0}
				aria-label="Previous waste source"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</button>
			<button
				class="waste-nav-btn"
				onclick={goToNext}
				disabled={activeSourceIndex === wasteSources.length - 1}
				aria-label="Next waste source"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</button>
		</div>
	</div>
</section>

<style>
	/* Statistics Section - matches React exactly (headline + CTA only) */
	.statistics-section {
		padding: 4rem 0;  /* section-md */
		background: #000000;
	}

	.statistics-content {
		max-width: 72rem;  /* max-w-6xl */
		margin: 0 auto;
		text-align: center;
	}

	.statistics-headline {
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 2.5rem;  /* text-h1 */
		line-height: 1.2;
		font-weight: 500;
		color: #ffffff;
		margin-bottom: 2.5rem;  /* mb-10 */
	}

	@media (max-width: 1179px) {
		.statistics-headline {
			font-size: 1.875rem;  /* xl:text-h2 */
		}
	}

	@media (max-width: 1023px) {
		.statistics-headline {
			font-size: 1.875rem;  /* lg:text-h2 */
			margin-bottom: 2rem;  /* lg:mb-8 */
		}
	}

	@media (max-width: 767px) {
		.statistics-headline {
			font-size: 1.5rem;  /* md:text-h3 */
			margin-bottom: 1.5rem;  /* md:mb-6 */
		}
	}

	.statistics-cta {
		display: flex;
		justify-content: center;
	}

	/* Metals of Interest Section - matches React exactly */
	.metals-section {
		padding: 3rem 0;  /* section-sm */
		background: #ffffff;
		overflow: hidden;
	}

	.metals-headline {
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 3.5rem;
		line-height: 1.2;
		font-weight: 500;
		color: #212121;  /* text-g-500 */
		max-width: 56rem;  /* max-w-4xl */
		margin-bottom: 4rem;  /* mb-16 */
	}

	@media (max-width: 1179px) {
		.metals-headline {
			font-size: 3rem;
			margin-bottom: 3rem;  /* xl:mb-12 */
		}
	}

	@media (max-width: 1023px) {
		.metals-headline {
			font-size: 2.5rem;
			margin-bottom: 2.5rem;  /* lg:mb-10 */
		}
	}

	@media (max-width: 767px) {
		.metals-headline {
			font-size: 2rem;
			margin-bottom: 2rem;  /* md:mb-8 */
		}
	}

	.metals-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 3rem;  /* gap-12 */
	}

	@media (max-width: 1179px) {
		.metals-grid {
			gap: 2.5rem;  /* xl:gap-10 */
		}
	}

	@media (max-width: 1023px) {
		.metals-grid {
			grid-template-columns: repeat(2, 1fr);  /* lg:grid-cols-2 */
			gap: 2rem;  /* lg:gap-8 */
		}
	}

	@media (max-width: 767px) {
		.metals-grid {
			grid-template-columns: 1fr;  /* md:grid-cols-1 */
			gap: 1.5rem;  /* md:gap-6 */
		}
	}

	.metal-card {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.metal-image-wrapper {
		position: relative;
		aspect-ratio: 1;
		width: 100%;
		max-width: 20rem;  /* max-w-xs */
		margin: 0 auto 1.5rem;  /* mx-auto mb-6 */
	}

	.metal-image {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.metal-label {
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 1.25rem;  /* text-h4 */
		font-weight: 600;
		color: #212121;  /* text-g-500 */
		text-align: center;
		letter-spacing: 0.025em;  /* tracking-wide */
	}

	.metals-cta {
		display: flex;
		justify-content: center;
		margin-top: 4rem;  /* mt-16 */
	}

	@media (max-width: 1179px) {
		.metals-cta {
			margin-top: 3rem;  /* xl:mt-12 */
		}
	}

	@media (max-width: 1023px) {
		.metals-cta {
			margin-top: 2.5rem;  /* lg:mt-10 */
		}
	}

	@media (max-width: 767px) {
		.metals-cta {
			margin-top: 2rem;  /* md:mt-8 */
		}
	}

	/* Waste Sources Section - matches React exactly */
	.waste-section {
		position: relative;
		background: #000000;
		overflow: hidden;
	}

	.waste-content {
		position: relative;
		min-height: 90vh;
	}

	@media (max-width: 1023px) {
		.waste-content {
			min-height: 80vh;  /* lg:min-h-[80vh] */
		}
	}

	@media (max-width: 767px) {
		.waste-content {
			min-height: 70vh;  /* md:min-h-[70vh] */
		}
	}

	.waste-bg {
		position: absolute;
		inset: 0;
		opacity: 0;
		transition: opacity 0.7s ease-out;
	}

	.waste-bg.active {
		opacity: 1;
	}

	.waste-bg-image {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.waste-gradient {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, rgba(0, 0, 0, 1), rgba(0, 0, 0, 0.6) 50%, rgba(0, 0, 0, 0.3));
	}

	/* Static Title - Top Left */
	.waste-header {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		z-index: 20;
		padding: 5rem 0 0;  /* pt-20 */
	}

	@media (max-width: 1179px) {
		.waste-header {
			padding-top: 4rem;  /* xl:pt-16 */
		}
	}

	@media (max-width: 1023px) {
		.waste-header {
			padding-top: 3rem;  /* lg:pt-12 */
		}
	}

	@media (max-width: 767px) {
		.waste-header {
			padding-top: 2rem;  /* md:pt-8 */
		}
	}

	.waste-title {
		max-width: 96rem;
		margin: 0 auto;
		padding: 0 3rem;
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 3.5rem;
		line-height: 1.2;
		font-weight: 500;
		color: #ffffff;
	}

	@media (max-width: 1179px) {
		.waste-title {
			font-size: 3rem;
		}
	}

	@media (max-width: 1023px) {
		.waste-title {
			font-size: 2.5rem;
		}
	}

	@media (max-width: 767px) {
		.waste-title {
			font-size: 2rem;
		}
	}

	/* Content Overlay */
	.waste-info {
		position: absolute;
		inset: 0;
		z-index: 10;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
	}

	.waste-info-content {
		max-width: 96rem;
		margin: 0 auto;
		padding: 0 3rem 5rem;  /* pb-20 */
		width: 100%;
	}

	@media (max-width: 1179px) {
		.waste-info-content {
			padding-bottom: 4rem;  /* xl:pb-16 */
		}
	}

	@media (max-width: 1023px) {
		.waste-info-content {
			padding-bottom: 3rem;  /* lg:pb-12 */
		}
	}

	@media (max-width: 767px) {
		.waste-info-content {
			padding-bottom: 2rem;  /* md:pb-8 */
		}
	}

	.waste-source-title {
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 2.5rem;  /* text-h1 */
		font-weight: 600;
		color: #06B6D4;  /* text-dme */
		margin-bottom: 1rem;  /* mb-4 */
		text-transform: uppercase;
		letter-spacing: 0.025em;  /* tracking-wide */
		animation: fadeUp 0.5s ease-out;
	}

	@media (max-width: 1179px) {
		.waste-source-title {
			font-size: 1.875rem;  /* xl:text-h2 */
		}
	}

	@media (max-width: 1023px) {
		.waste-source-title {
			font-size: 1.5rem;  /* lg:text-h3 */
		}
	}

	.waste-source-description {
		font-size: 1.125rem;  /* text-body-lg */
		line-height: 1.6;  /* leading-relaxed */
		color: rgba(255, 255, 255, 0.8);  /* text-white/80 */
		max-width: 42rem;  /* max-w-2xl */
		animation: fadeUp 0.5s ease-out 0.1s both;
	}

	@media (max-width: 1023px) {
		.waste-source-description {
			font-size: 1rem;  /* lg:text-body */
		}
	}

	@keyframes fadeUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Progress Bar */
	.waste-progress {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin: 2rem 0;  /* mt-8 mb-8 */
	}

	.waste-progress-bar {
		flex: 1;
		height: 4px;  /* h-1 */
		background: rgba(255, 255, 255, 0.2);  /* bg-white/20 */
		border-radius: 9999px;  /* rounded-full */
		overflow: hidden;
	}

	.waste-progress-fill {
		height: 100%;
		background: #06B6D4;  /* bg-dme */
		border-radius: 9999px;  /* rounded-full */
		transition: width 0.5s ease-out;
	}

	.waste-progress-count {
		font-size: 0.75rem;  /* text-caption */
		color: rgba(255, 255, 255, 0.6);  /* text-white/60 */
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	/* Navigation - Bottom Right */
	.waste-nav {
		position: absolute;
		bottom: 5rem;  /* bottom-20 */
		right: 0;
		z-index: 20;
		display: flex;
		gap: 1rem;  /* gap-4 */
		max-width: 96rem;
		margin: 0 auto;
		padding: 0 3rem;
		width: 100%;
		justify-content: flex-end;
		pointer-events: none;
	}

	@media (max-width: 1179px) {
		.waste-nav {
			bottom: 4rem;  /* xl:bottom-16 */
		}
	}

	@media (max-width: 1023px) {
		.waste-nav {
			bottom: 3rem;  /* lg:bottom-12 */
		}
	}

	@media (max-width: 767px) {
		.waste-nav {
			bottom: 2rem;  /* md:bottom-8 */
		}
	}

	.waste-nav-btn {
		width: 3.5rem;  /* w-14 */
		height: 3.5rem;  /* h-14 */
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;  /* rounded-full */
		border: 1px solid rgba(255, 255, 255, 0.3);  /* border-white/30 */
		color: #ffffff;
		transition: all 0.2s ease;
		pointer-events: auto;
		cursor: pointer;
	}

	@media (max-width: 1023px) {
		.waste-nav-btn {
			width: 3rem;  /* lg:w-12 */
			height: 3rem;  /* lg:h-12 */
		}
	}

	.waste-nav-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);  /* hover:bg-white/10 */
	}

	.waste-nav-btn:disabled {
		opacity: 0.3;  /* disabled:opacity-30 */
		cursor: default;
	}

	.waste-nav-btn svg {
		width: 1.5rem;  /* w-6 */
		height: 1.5rem;  /* h-6 */
	}

	@media (max-width: 1023px) {
		.waste-nav-btn svg {
			width: 1.25rem;  /* lg:w-5 */
			height: 1.25rem;  /* lg:h-5 */
		}
	}

	/* Stagger animations for metals grid */
	.stagger-5 { transition-delay: 200ms; }
	.stagger-6 { transition-delay: 250ms; }
</style>
