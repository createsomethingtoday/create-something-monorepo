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
	import WhySection from '$lib/components/WhySection.svelte';
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

	type LithxFeature = {
		icon: string;
		title: string;
	};

	let { data }: Props = $props();
	const content = $derived(data.content);

	// Hero content with CMS overrides
	const heroTitle = $derived(content?.hero?.title ?? 'Next Generation Recovery');
	const heroSubtitle = $derived(content?.hero?.subtitle ?? 'Valorize low-grade ores with LithX—advanced chelation technology for critical metals recovery from heaps, tailings, and complex mineralogy');
	const heroVideo = $derived(content?.hero?.video ?? 'https://pub-fb87e05654104f5fbb33989fc4dca65b.r2.dev/videos/168384056-deep-open-pit-mine-copper-ore-.mp4');
	const heroCta = $derived(content?.hero?.cta ?? 'Learn More');

	// Why section with CMS overrides
	const whyTitle = $derived(content?.why?.title ?? 'Advanced Chelation Technology');
	const whySubtitle = $derived(content?.why?.subtitle ?? 'Our proprietary chemistry platform enables efficient metal extraction with reduced environmental impact and operational complexity.');
	const whyFeatures = $derived(content?.whyFeatures ?? [
		{ icon: 'beaker', title: 'Ultra-Strong Chelators' },
		{ icon: 'thermometer', title: 'Ambient Temperature' },
		{ icon: 'leaf', title: 'Environmentally Friendly' },
		{ icon: 'plug', title: 'Drop-In Solution' }
	]);

	// Section headers with CMS overrides
	const solutionsHeadline = $derived(content?.solutionsHeader?.headline ?? lithxSolutionsHeader.headline);
	const methodsHeadline = $derived(content?.methodsHeader?.headline ?? lithxMethodsHeader.headline);

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
{#snippet lithxIcons(feature: LithxFeature)}
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
{/snippet}

<WhySection
	title={whyTitle}
	subtitle={whySubtitle}
	features={whyFeatures}
	videoUrl="https://pub-fb87e05654104f5fbb33989fc4dca65b.r2.dev/videos/mining-aerial.mp4"
	accentColor="lithx"
	iconSnippet={lithxIcons}
/>

<!-- Methods/Process Section -->
<ProcessSection
	headline={methodsHeadline}
	steps={processSteps}
	numbered={false}
	accentColor="lithx"
/>
