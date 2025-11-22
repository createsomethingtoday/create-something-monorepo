<script lang="ts">
	import type { PageData } from './$types';
	import HeroSection from '$lib/components/HeroSection.svelte';
	import CategorySection from '$lib/components/CategorySection.svelte';
	import PapersGrid from '$lib/components/PapersGrid.svelte';
	import { Footer } from '@create-something/components';

	export let data: PageData;
	const { papers, categories } = data;

	// Split papers for different sections
	const featuredPapers = papers.filter((p) => p.featured).slice(0, 3);
	const latestPapers = papers.slice(0, 12);

	const quickLinks = [
		{ label: 'All Experiments', href: '/experiments' },
		{ label: 'Methodology', href: '/methodology' },
		{ label: 'About', href: '/about' }
	];
</script>

<svelte:head>
	<title>CREATE SOMETHING SPACE | The Experimental Layer</title>
	<meta
		name="description"
		content="Community playground for testing AI-native development ideas. Fork experiments, break things, learn in public. Every experiment feeds back into createsomething.io research."
	/>
</svelte:head>

<!-- Hero Section -->
<HeroSection {featuredPapers} />

	<!-- Categories Section -->
	<CategorySection {categories} />

<!-- Papers Grid -->
<PapersGrid
	papers={latestPapers}
	title="Community Experiments"
	subtitle="Real experiments from the community — fork them, try them, break them, learn from them"
/>

<Footer
	mode="space"
	showNewsletter={false}
	aboutText="Community playground for AI-native development experiments. Fork experiments, break things, learn in public."
	quickLinks={quickLinks}
	showSocial={true}
/>

