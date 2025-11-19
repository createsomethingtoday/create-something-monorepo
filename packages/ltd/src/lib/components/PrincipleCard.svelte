<script lang="ts">
	import type { Principle } from '$lib/types';

	let { principle, showMaster = false }: { principle: Principle; showMaster?: boolean } = $props();
</script>

<div class="border border-white/10 p-8">
	<div class="mb-4">
		{#if principle.order_index}
			<span class="text-xs font-mono opacity-40">#{principle.order_index}</span>
		{/if}
		{#if principle.category}
			<span class="text-xs uppercase tracking-widest opacity-40 ml-2">{principle.category}</span>
		{/if}
	</div>

	<h4 class="text-xl font-semibold mb-4">{principle.title}</h4>

	{#if principle.description}
		<div class="prose prose-sm max-w-none opacity-70">
			{@html principle.description}
		</div>
	{/if}
</div>
