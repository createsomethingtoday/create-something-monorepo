<script lang="ts">
	import ClearArtifactCard from './ClearArtifactCard.svelte';

	export interface ClearReceipt {
		number: string;
		label: string;
		detail: string;
		href?: string;
	}

	interface Props {
		receipts: ClearReceipt[];
		ariaLabel?: string;
	}

	let { receipts, ariaLabel = 'Receipts' }: Props = $props();
</script>

<div class="clear-receipt-grid" aria-label={ariaLabel}>
	{#each receipts as receipt}
		<ClearArtifactCard
			eyebrow={receipt.number}
			title={receipt.label}
			detail={receipt.detail}
			href={receipt.href}
		/>
	{/each}
</div>

<style>
	.clear-receipt-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.85rem;
	}

	@media (max-width: 980px) {
		.clear-receipt-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 640px) {
		.clear-receipt-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
