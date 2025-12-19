<script lang="ts">
	import type { Asset } from '$lib/types';
	import AssetCard from './AssetCard.svelte';
	import { goto } from '$app/navigation';

	interface Props {
		assets: Asset[];
		emptyMessage?: string;
	}

	let { assets, emptyMessage = 'No assets found' }: Props = $props();

	function handleAssetClick(asset: Asset) {
		goto(`/assets/${asset.id}`);
	}
</script>

{#if assets.length === 0}
	<div class="empty-state">
		<p>{emptyMessage}</p>
	</div>
{:else}
	<div class="asset-grid">
		{#each assets as asset (asset.id)}
			<AssetCard {asset} onclick={() => handleAssetClick(asset)} />
		{/each}
	</div>
{/if}

<style>
	.asset-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 200px;
		color: var(--webflow-fg-muted);
		font-size: 0.875rem;
	}
</style>
