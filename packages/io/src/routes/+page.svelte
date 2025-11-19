<script lang="ts">
	import type { PageData } from './$types';
	import HeroSection from '$lib/components/HeroSection.svelte';
	import { CategorySection, PapersGrid } from '@create-something/components';
	import Footer from '$lib/components/Footer.svelte';

	export let data: PageData;
	const { papers, categories } = data;

	// Split papers for different sections
	const featuredPapers = papers.filter((p) => p.featured).slice(0, 3);
	const latestPapers = papers.slice(0, 12);
</script>

<svelte:head>
	<title>CREATE SOMETHING | Systems Thinking for AI-Native Development</title>
	<meta
		name="description"
		content="Systematic evaluation of AI-native development with real data. Tracked experiments using Claude Code + Cloudflare — not just blog posts, but honest results with precise metrics."
	/>
</svelte:head>

<div class="min-h-screen bg-black">
	<!-- Navigation -->
	<nav class="fixed top-0 left-0 right-0 z-50 bg-black border-b border-white/10">
		<div class="max-w-7xl mx-auto px-6">
			<div class="flex items-center justify-between py-4">
				<a href="/" class="flex items-center">
					<div class="text-2xl font-bold text-white hover:text-white/80 transition-colors">
						CREATE SOMETHING
					</div>
				</a>

				<div class="hidden md:flex items-center gap-8">
					<a href="/" class="text-white/80 hover:text-white transition-colors text-sm font-medium">
						Home
					</a>
					<a
						href="/experiments"
						class="text-white/80 hover:text-white transition-colors text-sm font-medium"
					>
						Experiments
					</a>
					<a
						href="/methodology"
						class="text-white/80 hover:text-white transition-colors text-sm font-medium"
					>
						Methodology
					</a>
					<a
						href="/about"
						class="text-white/80 hover:text-white transition-colors text-sm font-medium"
					>
						About
					</a>
					<a
						href="/contact"
						class="group relative px-6 py-2 bg-white text-black text-sm font-semibold rounded-full hover:bg-white/90 transition-all overflow-hidden"
					>
						<span class="relative z-10">Contact</span>
					</a>
				</div>
			</div>
		</div>
	</nav>

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
	<Footer />
</div>
