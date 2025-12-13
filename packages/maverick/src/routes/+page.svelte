<script lang="ts">
	/**
	 * Homepage - Maverick X
	 * "Chemistry That Outperforms"
	 *
	 * Sections flow: Hero → Introduction → Explainer → ProductShowcase
	 * Content fetched from KV at request time (not build time)
	 */

	import type { PageData } from './$types';
	import KineticHero from '$lib/components/KineticHero.svelte';
	import Introduction from '$lib/components/Introduction.svelte';
	import Explainer from '$lib/components/Explainer.svelte';
	import ProductShowcase from '$lib/components/ProductShowcase.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	const content = data.content;
</script>

<svelte:head>
	<title>Maverick X | Chemistry That Outperforms</title>
	<meta name="description" content="Breakthrough chemical solutions across oil & gas, mining & metals, and water treatment. More oil. More metals. Smarter chemistry." />
</svelte:head>

<!-- Hero Section -->
<KineticHero
	videoSrc={content?.hero?.videoSrc ?? 'https://pub-fb87e05654104f5fbb33989fc4dca65b.r2.dev/videos/089014528-smokestack-and-american-flag-o.mp4'}
	title={content?.hero?.title ?? 'Chemistry That Outperforms'}
	subtitle={content?.hero?.subtitle ?? 'More oil. More metals. Smarter chemistry.'}
	ctaText={content?.hero?.cta ?? 'Learn More'}
/>

<!-- Introduction Section -->
<Introduction
	headline={content?.introduction?.headline}
	showcaseImages={content?.showcaseImages}
/>

<!-- Explainer Section -->
<Explainer
	headline={content?.explainer?.headline}
	points={content?.explainerPoints}
/>

<!-- Product Showcase Section -->
<ProductShowcase
	solutions={content?.solutions}
/>
