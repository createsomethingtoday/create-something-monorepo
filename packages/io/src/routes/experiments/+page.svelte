<script lang="ts">
	import type { PageData } from './$types';
	import { PapersGrid } from '@create-something/components';
	import Footer from '$lib/components/Footer.svelte';

	export let data: PageData;
	const { papers } = data;
</script>

<svelte:head>
	<title>All Experiments ({papers.length}) | CREATE SOMETHING</title>
	<meta
		name="description"
		content="Browse tracked experiments with real data — time, costs, errors, and learnings from building production systems with AI-native development."
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
						class="group relative px-6 py-2 bg-white text-black text-sm font-semibold rounded-full hover:bg-white/90 transition-all"
					>
						<span class="relative z-10">Contact</span>
					</a>
				</div>
			</div>
		</div>
	</nav>

	<!-- Hero Section -->
	<section class="relative pt-32 pb-16 px-6">
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
	<Footer />
</div>
