<script lang="ts">
	import type { PageData } from './$types';
	import HeroSection from '$lib/components/HeroSection.svelte';
	import { CategorySection, PapersGrid, SEO } from '@create-something/components';

	export let data: PageData;
	const { papers, categories } = data;

	// Split papers for different sections
	const featuredPapers = papers.filter((p) => p.featured).slice(0, 3);
	// Exclude featured papers from latest (they're in HeroSection) and sort by date
	const latestPapers = papers
		.filter((p) => !p.featured)
		.slice(0, 12);

	const quickLinks = [
		{ label: 'Home', href: '/' },
		{ label: 'All Research', href: '/experiments' },
		{ label: 'Methodology', href: '/methodology' },
		{ label: 'About', href: '/about' }
	];
</script>

<SEO
	title="AI-Native Development Research"
	description="Systematic evaluation of AI-native development with real data. Tracked experiments using Claude Code + Cloudflare — not just blog posts, but honest results with precise metrics."
	keywords="AI-native development, Claude Code, Cloudflare Workers, tracked experiments, research papers, systems thinking, development metrics"
	ogImage="/og-image.svg"
	propertyName="io"
/>

<!-- Hero Section -->
<HeroSection {featuredPapers} />

<!-- Categories Section -->
<CategorySection {categories} />

<!-- Papers Grid -->
<PapersGrid
	papers={latestPapers}
	title="Research Papers"
	subtitle="Rigorous methodology with tracked metrics — time, costs, errors, and learnings"
/>

<!-- Footer -->
