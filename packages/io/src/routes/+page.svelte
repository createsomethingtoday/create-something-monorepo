<script lang="ts">
	import type { PageData } from './$types';
	import HeroSection from '$lib/components/HeroSection.svelte';
	import { PapersGrid, SEO } from '@create-something/components';

	let { data }: { data: PageData } = $props();
	const { papers } = data;

	// Featured papers sorted by newest first
	const featuredPapers = papers
		.filter((p) => p.featured)
		.sort((a, b) => {
			const aDate = new Date(a.published_at || a.created_at || 0).getTime();
			const bDate = new Date(b.published_at || b.created_at || 0).getTime();
			return bDate - aDate;
		})
		.slice(0, 3);

	// Exclude featured papers and sort by newest first
	const latestPapers = papers
		.filter((p) => !p.featured)
		.sort((a, b) => {
			const aDate = new Date(a.published_at || a.created_at || 0).getTime();
			const bDate = new Date(b.published_at || b.created_at || 0).getTime();
			return bDate - aDate;
		})
		.slice(0, 12);
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

<!-- Papers Grid -->
<PapersGrid
	papers={latestPapers}
	title="Research Papers"
	subtitle="Rigorous methodology with tracked metrics — time, costs, errors, and learnings"
/>

<!-- Footer -->
