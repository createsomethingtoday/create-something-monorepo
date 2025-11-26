<script lang="ts">
	import type { PageData } from './$types';
	import { PapersGrid } from '@create-something/components';

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
	<title>All Experiments ({papers.length}) | CREATE SOMETHING</title>
	<meta
		name="description"
		content="Browse tracked experiments with real data — time, costs, errors, and learnings from building production systems with AI-native development."
	/>
</svelte:head>

<!-- Hero Section -->
<section class="relative pt-16 pb-12 px-6">
	<div class="max-w-7xl mx-auto">
		<div class="text-center space-y-4">
			<h1 class="text-4xl md:text-6xl font-bold text-white">All Experiments</h1>
			<p class="text-lg text-white/60">
				{papers.length} tracked experiments with real data — time, costs, errors, and learnings
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
