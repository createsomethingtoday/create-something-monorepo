<script lang="ts">
	/**
	 * ValuesGrid Component
	 *
	 * 4-column grid of brand values/pillars
	 * Numbered cards with title and description
	 */

	import type { BrandValue } from '$lib/config/site';

	interface Props {
		headline: string;
		values: BrandValue[];
	}

	let { headline, values }: Props = $props();
</script>

<section class="py-24 bg-white px-4 md:px-12 lg:px-20">
	<div class="max-w-7xl mx-auto">
		<h2 class="text-3xl md:text-4xl font-bold text-center mb-16 max-w-3xl mx-auto">
			{headline}
		</h2>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			{#each values as value}
				<div class="bg-nio-grey p-8 rounded-2xl hover:shadow-lg transition-shadow duration-300">
					<span class="text-gray-400 text-sm font-mono block mb-4">{value.number}</span>
					<h3 class="text-xl font-bold mb-3">{value.title}</h3>
					<p class="text-gray-600 text-sm leading-relaxed">{value.description}</p>
				</div>
			{/each}
		</div>
	</div>
</section>
