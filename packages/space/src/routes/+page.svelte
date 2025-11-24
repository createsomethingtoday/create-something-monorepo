<script lang="ts">
	import type { PageData } from './$types';
	import HeroSection from '$lib/components/HeroSection.svelte';
	import CategorySection from '$lib/components/CategorySection.svelte';
	import { SEO } from '@create-something/components';

	export let data: PageData;
	const { papers, categories } = data;

	// Get featured papers for hero section
	const featuredPapers = papers.filter((p) => p.featured).slice(0, 3);
</script>

<SEO
	title="Interactive AI Development Tutorials"
	description="Learn AI-native development by doing. Interactive tutorials with runnable code — fork, modify, and run directly in your browser. Research papers available on createsomething.io"
	keywords="AI-native development, interactive tutorials, Claude Code, Cloudflare Workers, runnable code, hands-on learning, developer education"
	ogImage="/og-image.svg"
	propertyName="space"
/>

<!-- Hero Section with Featured Tutorials -->
<HeroSection {featuredPapers} />

<!-- Categories Section -->
<CategorySection {categories} />

