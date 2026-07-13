<script lang="ts">
	type FactItem = { label: string; value: string };
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
		gap: 0;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.fact-row {
		display: grid;
		grid-template-columns: minmax(8rem, 10rem) minmax(0, 1fr);
		gap: 1.15rem;
		padding: 0.7rem 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		align-items: baseline;
	}

	dt {
		font-size: 0.72rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-performance-fg-muted);
	}

	dd {
		margin: 0;
		font-size: 0.98rem;
		font-weight: 520;
		line-height: 1.4;
		word-break: break-word;
		font-variant-numeric: tabular-nums;
	}

	@media (max-width: 700px) {
		.fact-row {
			grid-template-columns: 1fr;
			gap: 0.35rem;
		}
	}
</style>
