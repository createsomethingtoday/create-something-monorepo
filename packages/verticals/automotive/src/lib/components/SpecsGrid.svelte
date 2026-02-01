<script lang="ts">
	/**
	 * SpecsGrid Component
	 *
	 * 2x2 grid displaying vehicle specs (range, speed, acceleration, battery)
	 * Large numbers with unit labels
	 */

	import type { VehicleSpecs } from '$lib/config/site';

	interface Props {
		specs: VehicleSpecs;
	}

	let { specs }: Props = $props();
</script>

<div class="grid grid-cols-2 gap-4 md:gap-6">
	<!-- Range -->
	<div class="spec-card">
		<span class="text-3xl md:text-4xl font-bold text-gray-900">{specs.rangeKm}</span>
		<span class="text-xs text-gray-500 uppercase tracking-wider mt-2">Range (KM)</span>
	</div>

	<!-- Top Speed -->
	<div class="spec-card">
		<span class="text-3xl md:text-4xl font-bold text-gray-900">{specs.topSpeedKmh}</span>
		<span class="text-xs text-gray-500 uppercase tracking-wider mt-2">Top Speed (KM/H)</span>
	</div>

	<!-- Acceleration -->
	<div class="spec-card">
		<span class="text-3xl md:text-4xl font-bold text-gray-900">{specs.acceleration0100}s</span>
		<span class="text-xs text-gray-500 uppercase tracking-wider mt-2">0-100 KM/H</span>
	</div>

	<!-- Battery -->
	<div class="spec-card">
		<span class="text-3xl md:text-4xl font-bold text-gray-900">{specs.batteryKwh}</span>
		<span class="text-xs text-gray-500 uppercase tracking-wider mt-2">Battery (KWH)</span>
	</div>
</div>
