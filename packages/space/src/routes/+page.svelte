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
		{ label: 'All Tutorials', href: '/experiments' },
		{ label: 'Methodology', href: '/methodology' },
		{ label: 'About', href: '/about' }
	];
</script>

<svelte:head>
	<title>CREATE SOMETHING SPACE | Interactive Tutorials for AI-Native Development</title>
	<meta
		name="description"
		content="Learn AI-native development by doing. Interactive tutorials with runnable code — fork, modify, and run directly in your browser. Research papers available on createsomething.io"
	/>
</svelte:head>

<!-- Hero Section -->
<HeroSection {featuredPapers} />

	<!-- Categories Section -->
	<CategorySection {categories} />

<!-- Papers Grid -->
<PapersGrid
	papers={latestPapers}
	title="Interactive Tutorials"
	subtitle="Learn by doing — fork these tutorials, run the code, modify and experiment"
/>

<Footer
	mode="space"
	showNewsletter={false}
	aboutText="Community playground for AI-native development experiments. Fork experiments, break things, learn in public."
	quickLinks={quickLinks}
	showSocial={true}
/>

