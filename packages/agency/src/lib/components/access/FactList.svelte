<script lang="ts">
	export type FactItem = { label: string; value: string };
	export let items: FactItem[] = [];
</script>

<dl class="fact-list">
	{#each items as item}
		<div class="fact-row">
			<dt>{item.label}</dt>
			<dd>{item.value}</dd>
		</div>
	{/each}
</dl>

<style>
	.fact-list {
		display: grid;
		gap: 0.85rem;
	}

	.fact-row {
		display: grid;
		grid-template-columns: 11rem minmax(0, 1fr);
		gap: 1rem;
		padding-bottom: 0.55rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.fact-row:last-child {
		border-bottom: 0;
	}

	dt {
		font-size: 0.8rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-fg-muted);
	}

	dd {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.4;
		word-break: break-word;
	}

	@media (max-width: 700px) {
		.fact-row {
			grid-template-columns: 1fr;
			gap: 0.35rem;
		}
	}
</style>
