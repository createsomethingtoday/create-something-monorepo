<script lang="ts">
	/**
	 * ProductShowcase Component
	 *
	 * Featured vehicle with image and specs grid
	 * Includes model line filter tabs
	 */

	import type { Vehicle, ModelLine } from '$lib/config/site';
	import SpecsGrid from './SpecsGrid.svelte';

	interface Props {
		headline: string;
		subheadline: string;
		vehicle: Vehicle;
		modelLines: ModelLine[];
		modelLineLabels: Record<ModelLine, string>;
		activeFilter?: ModelLine | 'all';
		onFilterChange?: (filter: ModelLine | 'all') => void;
	}

	let {
		headline,
		subheadline,
		vehicle,
		modelLines,
		modelLineLabels,
		activeFilter = 'all',
		onFilterChange
	}: Props = $props();
</script>

<section class="py-24 md:py-32 bg-white px-4 md:px-12 lg:px-20" id="product-showcase">
	<div class="max-w-7xl mx-auto">
		<!-- Section Header -->
		<div class="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
			<div>
				<h2 class="text-3xl md:text-5xl font-bold tracking-tight mb-2">{headline}</h2>
				<p class="text-gray-500">{subheadline}</p>
			</div>

			<!-- Tab Filters -->
			<div class="flex space-x-2 bg-gray-100 p-1 rounded-full">
				<button
					class={activeFilter === 'all' ? 'filter-tab-active' : 'filter-tab'}
					onclick={() => onFilterChange?.('all')}
				>
					ALL
				</button>
				{#each modelLines as line}
					<button
						class={activeFilter === line ? 'filter-tab-active' : 'filter-tab'}
						onclick={() => onFilterChange?.(line)}
					>
						{modelLineLabels[line].toUpperCase()}
					</button>
				{/each}
			</div>
		</div>

		<!-- Content Grid -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
			<!-- Left: Car Image -->
			<div class="relative group cursor-pointer">
				<div
					class="absolute inset-0 bg-blue-50/50 rounded-2xl transform rotate-1 transition-transform group-hover:rotate-0"
				></div>
				<a href="/models/{vehicle.slug}">
					<img
						src={vehicle.heroImage}
						alt={vehicle.name}
						class="relative rounded-2xl w-full h-auto object-cover shadow-xl transition-transform duration-500 group-hover:scale-[1.02]"
					/>
				</a>
			</div>

			<!-- Right: Specs Grid -->
			<div class="flex flex-col gap-8">
				<SpecsGrid specs={vehicle.specs} />

				<div class="mt-4">
					<a
						href="/models"
						class="w-full md:w-auto px-8 py-4 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors inline-flex items-center justify-center gap-2"
					>
						See Our Models
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							class="w-4 h-4"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
							/>
						</svg>
					</a>
				</div>
			</div>
		</div>
	</div>
</section>
