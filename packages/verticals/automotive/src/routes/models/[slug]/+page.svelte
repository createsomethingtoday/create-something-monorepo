<script lang="ts">
	/**
	 * Vehicle Detail Page
	 *
	 * Individual vehicle showcase with:
	 * - Hero image
	 * - Full specs
	 * - Features list
	 * - Test drive CTA
	 */

	import { siteConfig, formatPrice } from '$lib/config/site';
	import { SpecsGrid, Footer } from '$lib/components';

	let { data } = $props();
	const { vehicle } = data;
</script>

<svelte:head>
	<title>{vehicle.name} | {siteConfig.brand.name}</title>
	<meta name="description" content={vehicle.description} />
</svelte:head>

<!-- Header -->
<header class="absolute top-0 left-0 w-full z-20 py-6 px-8">
	<div class="max-w-7xl mx-auto flex justify-between items-center">
		<a href="/" class="flex items-center gap-2 text-white">
			<svg viewBox="0 0 50 50" width="24" height="24" fill="currentColor">
				<path d="M10 25 A 15 15 0 0 1 40 25" fill="none" stroke="currentColor" stroke-width="4"
				></path>
				<path d="M15 35 L 25 20 L 35 35" fill="none" stroke="currentColor" stroke-width="4"></path>
			</svg>
			<span class="font-bold text-xl tracking-widest">{siteConfig.brand.name}</span>
		</a>

		<nav class="hidden md:flex gap-8 text-sm font-medium text-white/90">
			{#each siteConfig.navLinks as link}
				<a href={link.href} class="hover:text-white transition-colors">
					{link.label}
				</a>
			{/each}
		</nav>

		<a href="/models" class="text-white text-sm font-medium hover:text-white/80 transition-colors">
			&larr; All Models
		</a>
	</div>
</header>

<!-- Hero Section -->
<section class="relative h-[70vh] min-h-[500px] w-full overflow-hidden">
	<div class="absolute inset-0 z-0">
		<img src={vehicle.heroImage} alt={vehicle.name} class="w-full h-full object-cover" />
		<div class="hero-overlay absolute inset-0"></div>
	</div>

	<div
		class="relative z-10 h-full flex flex-col justify-end items-start px-4 md:px-12 lg:px-20 pb-16"
	>
		<div class="max-w-7xl w-full">
			{#if vehicle.isNew}
				<span
					class="inline-block px-4 py-1 bg-primary text-white text-sm font-semibold rounded-full mb-4"
				>
					NEW
				</span>
			{/if}
			<h1 class="text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight mb-4">
				{vehicle.name}
			</h1>
			<p class="text-xl md:text-2xl text-white/80 font-light">
				{vehicle.tagline}
			</p>
		</div>
	</div>
</section>

<!-- Main Content -->
<main class="bg-white">
	<!-- Overview Section -->
	<section class="py-16 md:py-24 px-4 md:px-12 lg:px-20">
		<div class="max-w-7xl mx-auto">
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-16">
				<!-- Description -->
				<div>
					<h2 class="text-3xl md:text-4xl font-bold tracking-tight mb-6">Overview</h2>
					<p class="text-gray-600 text-lg leading-relaxed mb-8">
						{vehicle.description}
					</p>

					<div class="flex flex-col sm:flex-row gap-4">
						<a
							href="/contact?model={vehicle.slug}"
							class="px-8 py-4 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors text-center"
						>
							Schedule Test Drive
						</a>
						<a
							href="/configure?model={vehicle.slug}"
							class="px-8 py-4 border border-gray-300 text-black rounded-full font-medium hover:bg-gray-50 transition-colors text-center"
						>
							Configure Yours
						</a>
					</div>
				</div>

				<!-- Specs Grid -->
				<div>
					<h3 class="text-xl font-bold mb-6">Key Specifications</h3>
					<SpecsGrid specs={vehicle.specs} />

					<!-- Price -->
					<div class="mt-8 p-6 bg-gray-100 rounded-2xl">
						<p class="text-sm text-gray-500 mb-1">Starting from</p>
						<p class="text-3xl font-bold">
							{formatPrice(vehicle.price.startingFrom, vehicle.price.currency)}
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Features Section -->
	<section class="py-16 md:py-24 px-4 md:px-12 lg:px-20 bg-gray-50">
		<div class="max-w-7xl mx-auto">
			<h2 class="text-3xl md:text-4xl font-bold tracking-tight mb-12 text-center">
				Key Features
			</h2>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{#each vehicle.features as feature, index}
					<div class="bg-white p-8 rounded-2xl shadow-sm">
						<span class="text-gray-400 text-sm font-mono block mb-4">
							{String(index + 1).padStart(2, '0')}
						</span>
						<h3 class="text-lg font-bold">{feature}</h3>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="py-24 px-4 md:px-12 lg:px-20 bg-black text-white">
		<div class="max-w-4xl mx-auto text-center">
			<h2 class="text-4xl md:text-5xl font-bold mb-6">Experience the {vehicle.name}</h2>
			<p class="text-gray-400 mb-8 max-w-xl mx-auto">
				Schedule a test drive today and discover what makes the {vehicle.name} the future of electric
				mobility.
			</p>
			<a
				href="/contact?model={vehicle.slug}"
				class="inline-block px-8 py-4 bg-white text-black rounded-full font-semibold hover:bg-gray-100 transition-colors"
			>
				Book Your Test Drive
			</a>
		</div>
	</section>
</main>

<!-- Footer -->
<Footer
	brandName={siteConfig.brand.name}
	sections={siteConfig.footer.sections}
	social={siteConfig.footer.social}
	copyright={siteConfig.footer.copyright}
	watermark={siteConfig.footer.watermark}
/>
