<script lang="ts">
	import type { PageData } from './$types';
	import PapersGrid from '$lib/components/PapersGrid.svelte';

	export let data: PageData;
	const { papers } = data;
</script>

<svelte:head>
	<title>All Experiments ({papers.length}) | CREATE SOMETHING SPACE</title>
	<meta
		name="description"
		content="Browse community experiments from the playground. Fork them, try them, break them, learn from them."
	/>
</svelte:head>

<!-- Hero Section -->
<section class="relative pt-32 pb-16 px-6">
	<div class="max-w-7xl mx-auto">
		<div class="text-center space-y-4">
			<h1 class="text-4xl md:text-6xl font-bold text-white">All Experiments</h1>
			<p class="text-lg text-white/60">
				{papers.length} community experiments — fork them, try them, break them, learn from them
			</p>
		</div>
	</div>
</section>

<!-- Experiments Grid -->
<PapersGrid {papers} title="" subtitle="" />

