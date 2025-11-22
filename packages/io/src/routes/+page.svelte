<script lang="ts">
	import type { PageData } from './$types';
	import HeroSection from '$lib/components/HeroSection.svelte';
	import { CategorySection, PapersGrid } from '@create-something/components';

	export let data: PageData;
	const { papers, categories } = data;

	// Split papers for different sections
	const featuredPapers = papers.filter((p) => p.featured).slice(0, 3);
	const latestPapers = papers.slice(0, 12);

	const quickLinks = [
		{ label: 'Home', href: '/' },
		{ label: 'All Experiments', href: '/experiments' },
		{ label: 'Methodology', href: '/methodology' },
		{ label: 'About', href: '/about' }
	];
</script>

<svelte:head>
	<title>CREATE SOMETHING | Systems Thinking for AI-Native Development</title>
	<meta
		name="description"
		content="Systematic evaluation of AI-native development with real data. Tracked experiments using Claude Code + Cloudflare — not just blog posts, but honest results with precise metrics."
	/>
</svelte:head>

<!-- Hero Section -->
<HeroSection {featuredPapers} />

<!-- Categories Section -->
<CategorySection {categories} />

<!-- Papers Grid -->
<PapersGrid
	papers={latestPapers}
	title="Experiments"
	subtitle="Tracked experiments with real data — time, costs, errors, and learnings"
/>

<!-- Footer -->
