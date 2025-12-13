<script lang="ts">
	/**
	 * createsomething.io Landing Page
	 *
	 * The entry point presents two paths:
	 *   - Experiments (Zuhandenheit) → Engaged practice
	 *   - Papers (Vorhandenheit) → Detached analysis
	 *
	 * Featured experiments are showcased below the hero.
	 */
	import type { PageData } from './$types';
	import HeroSection from '$lib/components/HeroSection.svelte';
	import { PapersGrid, SEO } from '@create-something/components';

	let { data }: { data: PageData } = $props();
	const { papers } = data;

	// Featured experiments sorted by newest first
	const featuredExperiments = papers
		.filter((p) => p.featured || p.is_file_based)
		.sort((a, b) => {
			const aDate = new Date(a.published_at || a.created_at || 0).getTime();
			const bDate = new Date(b.published_at || b.created_at || 0).getTime();
			return bDate - aDate;
		})
		.slice(0, 6);
</script>

<SEO
	title="AI-Native Development Research"
	description="Systems thinking for AI-native development. Experiments demonstrate through practice; papers ground through analysis. Both paths connect through the hermeneutic circle."
	keywords="AI-native development, Claude Code, Cloudflare Workers, experiments, research papers, systems thinking, Zuhandenheit, Vorhandenheit"
	ogImage="/og-image.svg"
	propertyName="io"
/>

<!-- Hero Section with Two Paths -->
<HeroSection />

<!-- Featured Experiments -->
{#if featuredExperiments.length > 0}
	<PapersGrid
		papers={featuredExperiments}
		title="Featured Experiments"
		subtitle="Interactive demonstrations where tools recede into use"
	/>
{/if}
