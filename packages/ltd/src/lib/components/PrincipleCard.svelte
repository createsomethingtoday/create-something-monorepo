<script lang="ts">
	import type { Principle } from '$lib/types';

	let { principle, showMaster = false }: { principle: Principle; showMaster?: boolean } = $props();
</script>

<div class="card p-8">
	<div class="mb-4">
		{#if principle.order_index}
			<span class="order-index font-mono">#{principle.order_index}</span>
		{/if}
		{#if principle.category}
			<span class="category uppercase tracking-widest ml-2">{principle.category}</span>
		{/if}
	</div>

	<h4 class="title font-semibold mb-4">{principle.title}</h4>

	{#if principle.description}
		<div class="description prose prose-sm max-w-none">
			{@html principle.description}
		</div>
	{/if}
</div>

<style>
	.card {
		border: 1px solid var(--color-border-default);
	}

	.order-index,
	.category {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.title {
		font-size: var(--text-body-lg);
	}

	.description {
		color: var(--color-fg-tertiary);
	}
</style>
