<script lang="ts">
	import type { PageData } from './$types';
	import HeroSection from '$lib/components/HeroSection.svelte';
	import RelatedResearch from '$lib/components/RelatedResearch.svelte';
	import { SEO } from '@create-something/components';

	let { data }: { data: PageData } = $props();
	const { papers } = data;

	// Sort all papers by date (newest first) for hero display
	const sortedPapers = [...papers].sort((a, b) => {
		const aDate = new Date(a.published_at || a.created_at || 0).getTime();
		const bDate = new Date(b.published_at || b.created_at || 0).getTime();
		return bDate - aDate;
	});
</script>

<SEO
	title="Interactive AI Development Tutorials"
	description="Learn AI-native development by doing. Interactive tutorials with runnable code — fork, modify, and run directly in your browser. Research papers available on createsomething.io"
	keywords="AI-native development, interactive tutorials, Claude Code, Cloudflare Workers, runnable code, hands-on learning, developer education"
	ogImage="/og-image.svg"
	propertyName="space"
/>

<!-- Hero Section with All Tutorials -->
<HeroSection featuredPapers={sortedPapers} />

<!-- Cross-property links to .io Research -->
<RelatedResearch />
