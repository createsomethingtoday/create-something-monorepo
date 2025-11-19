<script lang="ts">
	import MasterCard from '$lib/components/MasterCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Masters — CREATE SOMETHING.ltd</title>
	<meta
		name="description"
		content="Explore the masters who define 'less, but better' — from Dieter Rams to Mies van der Rohe."
	/>
</svelte:head>

<!-- Header -->
<section class="pt-24 pb-16 px-6 border-b border-white/10">
	<div class="max-w-7xl mx-auto">
		<p class="text-sm tracking-widest uppercase opacity-60 mb-4">The Canon</p>
		<h1 class="mb-6">Masters</h1>
		<p class="text-xl opacity-70 max-w-3xl leading-relaxed">
			Curated creators who proved that simplicity is the ultimate sophistication. Their principles
			guide everything we build.
		</p>
	</div>
</section>

<!-- Masters Grid -->
<section class="py-16 px-6">
	<div class="max-w-7xl mx-auto">
		{#if data.masters && data.masters.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
				{#each data.masters as master}
					<MasterCard {master} />
				{/each}
			</div>
		{:else}
			<div class="text-center py-24">
				<p class="text-lg opacity-60">Masters coming soon...</p>
				<p class="text-sm opacity-40 mt-2">Database migration pending.</p>
			</div>
		{/if}
	</div>
</section>
