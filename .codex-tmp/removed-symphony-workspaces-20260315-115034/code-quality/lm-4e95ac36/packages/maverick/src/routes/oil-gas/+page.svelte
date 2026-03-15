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
	import WhySection from '$lib/components/WhySection.svelte';
	import SEO from '$lib/components/SEO.svelte';
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

	type PetroxFeature = {
		icon: string;
		title: string;
	};

	let { data }: Props = $props();
	const content = $derived(data.content);

	// Hero content with CMS overrides
	const heroTitle = $derived(content?.hero?.title ?? 'Targeted Non-Hazmat Chemistry');
	const heroSubtitle = $derived(content?.hero?.subtitle ?? 'Boost production and slash costs with PetroX™ — Advanced non-hazmat chemistry for superior oilfield operations');
	const heroVideo = $derived(content?.hero?.video ?? 'https://pub-fb87e05654104f5fbb33989fc4dca65b.r2.dev/videos/082466515-oil-rig-pumpjack-working-natur.mp4');
	const heroCta = $derived(content?.hero?.cta ?? 'Learn More');

	// Why PetroX section with CMS overrides
	const whyTitle = $derived(content?.why?.title ?? 'Why PetroX™?');
	const whySubtitle = $derived(content?.why?.subtitle ?? 'Industry-leading oilfield chemistry that delivers results without the downsides of traditional treatments.');
	const whyFeatures = $derived(content?.whyFeatures ?? [
		{ icon: 'zap', title: 'Superior Performance' },
		{ icon: 'shield-check', title: 'Non-Hazmat' },
		{ icon: 'wrench', title: 'Infrastructure-Safe' },
		{ icon: 'clock', title: 'Minimal Downtime' }
	]);

	// Section headers with CMS overrides
	const solutionsHeadline = $derived(content?.solutionsHeader?.headline ?? petroxSolutionsHeader.headline);
	const operationsHeadline = $derived(content?.operationsHeader?.headline ?? petroxOperationsHeader.headline);

	// Transform petrox solutions to TabbedSolutions format
	const tabbedSolutions = petroxSolutions.map(solution => ({
		id: solution.id,
		name: solution.name,
		headline: solution.headline,
		description: solution.description,
		details: solution.details,
		image: solution.image,
		youtubeId: solution.youtubeId,
		features: solution.features,
		stats: solution.stats
	}));

	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "Product",
		"name": "PetroX",
		"brand": {
			"@type": "Brand",
			"name": "Maverick X"
		},
		"description": "Advanced oilfield chemistry solutions for enhanced oil recovery, sludge remediation, production optimization, and well stimulation",
		"category": "Oilfield Chemistry",
		"offers": {
			"@type": "AggregateOffer",
			"availability": "https://schema.org/InStock",
			"priceCurrency": "USD"
		}
	};
</script>

<SEO
	title="PetroX | Oil & Gas Chemistry Solutions"
	description="Advanced oilfield chemistry solutions for enhanced recovery, sludge remediation, production optimization, and well stimulation. PetroX delivers proven results for the oil & gas industry."
	canonical="https://maverickx.com/oil-gas"
	ogType="product"
	{jsonLd}
/>

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
{#snippet petroxIcons(feature: PetroxFeature)}
	{#if feature.icon === 'zap'}
		<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="why-icon">
			<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path>
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
{/snippet}

<WhySection
	title={whyTitle}
	subtitle={whySubtitle}
	features={whyFeatures}
	videoUrl="https://pub-fb87e05654104f5fbb33989fc4dca65b.r2.dev/videos/oil-pump-field.mp4"
	accentColor="petrox"
	iconSnippet={petroxIcons}
/>

<!-- Operations Hotspot Section -->
<OperationsHotspot
	headline={operationsHeadline}
	hotspots={petroxOperations}
	imageUrl={petroxOperationsImages.desktop}
	mobileImageUrl={petroxOperationsImages.mobile}
/>
