<script lang="ts">
	/**
	 * Models Inventory Page
	 *
	 * Grid display of all vehicles with filtering by model line
	 */

	import { siteConfig, type ModelLine } from '$lib/config/site';
	import { VehicleCard, VehicleFilter, Footer } from '$lib/components';

	// Active filter state
	let activeFilter = $state<ModelLine | 'all'>('all');

	// Get unique model lines from vehicles
	const modelLines = [...new Set(siteConfig.vehicles.map((v) => v.modelLine))] as ModelLine[];

	// Filtered vehicles based on active filter
	let filteredVehicles = $derived(
		activeFilter === 'all'
			? siteConfig.vehicles
			: siteConfig.vehicles.filter((v) => v.modelLine === activeFilter)
	);
</script>

<svelte:head>
	<title>Models | {siteConfig.brand.name}</title>
	<meta name="description" content="Explore our lineup of premium electric vehicles." />
</svelte:head>

<!-- Header -->
<header class="bg-black text-white py-6 px-8">
	<div class="max-w-7xl mx-auto flex justify-between items-center">
		<a href="/" class="flex items-center gap-2">
			<svg viewBox="0 0 50 50" width="24" height="24" fill="currentColor">
				<path d="M10 25 A 15 15 0 0 1 40 25" fill="none" stroke="currentColor" stroke-width="4"
				></path>
				<path d="M15 35 L 25 20 L 35 35" fill="none" stroke="currentColor" stroke-width="4"></path>
			</svg>
			<span class="font-bold text-xl tracking-widest">{siteConfig.brand.name}</span>
		</a>

		<nav class="hidden md:flex gap-8 text-sm font-medium text-white/90">
			{#each siteConfig.navLinks as link}
				<a
					href={link.href}
					class="hover:text-white transition-colors"
					class:text-white={link.href === '/models'}
				>
					{link.label}
				</a>
			{/each}
		</nav>
	</div>
</header>

<main class="min-h-screen bg-white">
	<div class="max-w-7xl mx-auto px-4 md:px-12 lg:px-20 py-16">
		<!-- Page Header -->
		<div class="mb-12">
			<h1 class="text-4xl md:text-5xl font-bold tracking-tight mb-4">Our Models</h1>
			<p class="text-gray-600 max-w-2xl">
				Discover our complete lineup of premium electric vehicles. Each model is designed to deliver
				exceptional performance, cutting-edge technology, and uncompromising luxury.
			</p>
		</div>

		<!-- Filters -->
		<VehicleFilter
			{modelLines}
			modelLineLabels={siteConfig.modelLineLabels}
			{activeFilter}
			onFilterChange={(filter) => (activeFilter = filter)}
			vehicleCount={filteredVehicles.length}
		/>

		<!-- Vehicle Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
			{#each filteredVehicles as vehicle (vehicle.slug)}
				<VehicleCard {vehicle} />
			{/each}
		</div>

		<!-- Empty State -->
		{#if filteredVehicles.length === 0}
			<div class="text-center py-16">
				<p class="text-gray-500">No vehicles found for this filter.</p>
				<button
					class="mt-4 text-primary hover:underline"
					onclick={() => (activeFilter = 'all')}
				>
					View all models
				</button>
			</div>
		{/if}
	</div>
</main>

<!-- Footer -->
<Footer
	brandName={siteConfig.brand.name}
	sections={siteConfig.footer.sections}
	social={siteConfig.footer.social}
	copyright={siteConfig.footer.copyright}
	watermark={siteConfig.footer.watermark}
/>
