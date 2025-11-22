<script lang="ts">
	import type { PageData } from './$types';
	import { PapersGrid } from '@create-something/components';

	export let data: PageData;
	const { papers } = data;

	const quickLinks = [
		{ label: 'Home', href: '/' },
		{ label: 'All Experiments', href: '/experiments' },
		{ label: 'Methodology', href: '/methodology' },
		{ label: 'About', href: '/about' }
	];
</script>

<svelte:head>
	<title>All Experiments ({papers.length}) | CREATE SOMETHING</title>
	<meta
		name="description"
		content="Browse tracked experiments with real data — time, costs, errors, and learnings from building production systems with AI-native development."
	/>
</svelte:head>

<!-- Hero Section -->
<section class="relative pt-16 pb-16 px-6">
	<div class="max-w-7xl mx-auto">
		<div class="text-center space-y-4">
			<h1 class="text-4xl md:text-6xl font-bold text-white">All Experiments</h1>
			<p class="text-lg text-white/60">
				{papers.length} tracked experiments with real data — time, costs, errors, and learnings
			</p>
		</div>
	</div>
</section>

<!-- Experiments Grid -->
<PapersGrid {papers} title="" subtitle="" />

<!-- Footer -->
