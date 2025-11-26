<script lang="ts">
	import type { PageData } from './$types';
	import PapersGrid from '$lib/components/PapersGrid.svelte';

	let { data }: { data: PageData } = $props();
	const { papers } = data;

	type SortOption = 'newest' | 'oldest' | 'featured';
	let sortBy: SortOption = $state('newest');

	const sortedPapers = $derived.by(() => {
		const sorted = [...papers];
		switch (sortBy) {
			case 'newest':
				return sorted.sort((a, b) => {
					const aDate = new Date(a.published_at || a.created_at || 0).getTime();
					const bDate = new Date(b.published_at || b.created_at || 0).getTime();
					return bDate - aDate;
				});
			case 'oldest':
				return sorted.sort((a, b) => {
					const aDate = new Date(a.published_at || a.created_at || 0).getTime();
					const bDate = new Date(b.published_at || b.created_at || 0).getTime();
					return aDate - bDate;
				});
			case 'featured':
				return sorted.sort((a, b) => {
					const aFeatured = a.featured ?? 0;
					const bFeatured = b.featured ?? 0;
					if (bFeatured !== aFeatured) return bFeatured - aFeatured;
					const aDate = new Date(a.published_at || a.created_at || 0).getTime();
					const bDate = new Date(b.published_at || b.created_at || 0).getTime();
					return bDate - aDate;
				});
			default:
				return sorted;
		}
	});
</script>

<svelte:head>
	<title>All Experiments ({papers.length}) | CREATE SOMETHING AGENCY</title>
	<meta
		name="description"
		content="Browse agency experiments and case studies. Real projects, real results."
	/>
</svelte:head>

<div class="min-h-screen bg-black">
	<!-- Navigation -->
	<nav class="fixed top-0 left-0 right-0 z-50 bg-black border-b border-white/10">
		<div class="max-w-7xl mx-auto px-6">
			<div class="flex items-center justify-between py-4">
				<a href="/" class="flex items-center">
					<div class="text-2xl font-bold text-white hover:text-white/80 transition-colors">
						CREATE SOMETHING AGENCY
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
						class="group relative px-6 py-2 bg-white text-black text-sm font-semibold rounded-full hover:bg-white/90 transition-all"
					>
						<span class="relative z-10">Contact</span>
					</a>
				</div>
			</div>
		</div>
	</nav>

	<!-- Hero Section -->
	<section class="relative pt-32 pb-12 px-6">
		<div class="max-w-7xl mx-auto">
			<div class="text-center space-y-4">
				<h1 class="text-4xl md:text-6xl font-bold text-white">All Experiments</h1>
				<p class="text-lg text-white/60">
					{papers.length} agency experiments — real projects, real results
				</p>
			</div>

			<!-- Sort Control -->
			<div class="flex justify-center mt-8">
				<div class="inline-flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-lg">
					<button
						onclick={() => sortBy = 'newest'}
						class="px-4 py-2 text-sm font-medium rounded-md transition-all {sortBy === 'newest'
							? 'bg-white text-black'
							: 'text-white/70 hover:text-white hover:bg-white/10'}"
					>
						Newest
					</button>
					<button
						onclick={() => sortBy = 'oldest'}
						class="px-4 py-2 text-sm font-medium rounded-md transition-all {sortBy === 'oldest'
							? 'bg-white text-black'
							: 'text-white/70 hover:text-white hover:bg-white/10'}"
					>
						Oldest
					</button>
					<button
						onclick={() => sortBy = 'featured'}
						class="px-4 py-2 text-sm font-medium rounded-md transition-all {sortBy === 'featured'
							? 'bg-white text-black'
							: 'text-white/70 hover:text-white hover:bg-white/10'}"
					>
						Featured
					</button>
				</div>
			</div>
		</div>
	</section>

	<!-- Experiments Grid -->
	<PapersGrid papers={sortedPapers} title="" subtitle="" />

	<!-- Footer -->
	<footer class="bg-black border-t border-white/10 py-6 px-6">
		<div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
			<p class="text-white/40 text-sm">
				© {new Date().getFullYear()} Micah Johnson. All rights reserved.
			</p>
			<div class="flex items-center gap-6">
				<a href="/privacy" class="text-white/40 hover:text-white/60 text-sm transition-colors">
					Privacy Policy
				</a>
				<a href="/terms" class="text-white/40 hover:text-white/60 text-sm transition-colors">
					Terms of Service
				</a>
			</div>
		</div>
	</footer>
</div>

<style>
	:global(.text-terminal-green) {
		color: #00ff00;
	}
</style>
