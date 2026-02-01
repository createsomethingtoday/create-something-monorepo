<script lang="ts">
	/**
	 * VehicleFilter Component
	 *
	 * Filter controls for inventory page
	 * Supports filtering by model line
	 */

	import type { ModelLine } from '$lib/config/site';

	interface Props {
		modelLines: ModelLine[];
		modelLineLabels: Record<ModelLine, string>;
		activeFilter: ModelLine | 'all';
		onFilterChange: (filter: ModelLine | 'all') => void;
		vehicleCount: number;
	}

	let { modelLines, modelLineLabels, activeFilter, onFilterChange, vehicleCount }: Props = $props();
</script>

<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
	<!-- Filter Tabs -->
	<div class="flex flex-wrap gap-2">
		<button
			class={activeFilter === 'all'
				? 'px-4 py-2 bg-black text-white rounded-full text-sm font-medium'
				: 'px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors'}
			onclick={() => onFilterChange('all')}
		>
			All Models
		</button>
		{#each modelLines as line}
			<button
				class={activeFilter === line
					? 'px-4 py-2 bg-black text-white rounded-full text-sm font-medium'
					: 'px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors'}
				onclick={() => onFilterChange(line)}
			>
				{modelLineLabels[line]}
			</button>
		{/each}
	</div>

	<!-- Vehicle Count -->
	<p class="text-sm text-gray-500">
		{vehicleCount}
		{vehicleCount === 1 ? 'model' : 'models'}
	</p>
</div>
