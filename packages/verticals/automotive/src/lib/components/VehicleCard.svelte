<script lang="ts">
	/**
	 * VehicleCard Component
	 *
	 * Card displaying vehicle with image, name, key spec, and price
	 * Used in inventory grid and featured sections
	 */

	import type { Vehicle } from '$lib/config/site';
	import { formatPrice } from '$lib/config/site';

	interface Props {
		vehicle: Vehicle;
		showPrice?: boolean;
		showSpecs?: boolean;
	}

	let { vehicle, showPrice = true, showSpecs = true }: Props = $props();
</script>

<a href="/models/{vehicle.slug}" class="group block">
	<div class="relative overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-900 aspect-[4/3]">
		<!-- Vehicle Image -->
		<img
			src={vehicle.heroImage}
			alt={vehicle.name}
			class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
		/>

		<!-- Overlay on hover -->
		<div
			class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"
		></div>

		<!-- New Badge -->
		{#if vehicle.isNew}
			<span
				class="absolute top-4 left-4 px-3 py-1 bg-primary text-white text-xs font-semibold rounded-full"
			>
				NEW
			</span>
		{/if}
	</div>

	<div class="mt-4 flex justify-between items-start">
		<div>
			<h3 class="text-xl font-bold tracking-tight">{vehicle.name}</h3>
			<p class="text-sm text-gray-500">{vehicle.tagline}</p>
		</div>

		{#if showPrice}
			<div class="text-right">
				<p class="text-sm text-gray-500">From</p>
				<p class="font-semibold">{formatPrice(vehicle.price.startingFrom, vehicle.price.currency)}</p>
			</div>
		{/if}
	</div>

	{#if showSpecs}
		<div class="mt-4 grid grid-cols-4 gap-2 text-center">
			<div class="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
				<p class="text-sm font-bold">{vehicle.specs.rangeKm}</p>
				<p class="text-xs text-gray-500">km</p>
			</div>
			<div class="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
				<p class="text-sm font-bold">{vehicle.specs.topSpeedKmh}</p>
				<p class="text-xs text-gray-500">km/h</p>
			</div>
			<div class="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
				<p class="text-sm font-bold">{vehicle.specs.acceleration0100}s</p>
				<p class="text-xs text-gray-500">0-100</p>
			</div>
			<div class="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
				<p class="text-sm font-bold">{vehicle.specs.batteryKwh}</p>
				<p class="text-xs text-gray-500">kWh</p>
			</div>
		</div>
	{/if}
</a>
