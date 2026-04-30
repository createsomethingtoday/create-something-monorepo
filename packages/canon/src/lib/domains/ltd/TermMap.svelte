<script lang="ts">
	interface TermMapItem {
		codeTerm: string;
		clientTerm: string;
		note: string;
	}

	interface Props {
		items: TermMapItem[];
	}

	let { items }: Props = $props();
</script>

<div class="term-map" role="table" aria-label="System term translation">
	<div class="row header" role="row">
		<span role="columnheader">In the code</span>
		<span role="columnheader">In nurse staffing terms</span>
		<span role="columnheader">What it means</span>
	</div>

	{#each items as item}
		<div class="row" role="row">
			<div class="cell strong" role="cell">{item.codeTerm}</div>
			<div class="cell strong" role="cell">{item.clientTerm}</div>
			<div class="cell note" role="cell">{item.note}</div>
		</div>
	{/each}
</div>

<style>
	.term-map {
		width: 100%;
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-md);
		overflow: hidden;
		background: var(--color-bg-surface);
	}

	.row {
		display: grid;
		grid-template-columns: minmax(140px, 0.85fr) minmax(180px, 1fr) 1.4fr;
		gap: var(--space-md);
		padding: var(--space-md) var(--space-lg);
		align-items: start;
		border-bottom: 1px solid var(--color-border-subtle);
		text-align: left;
	}

	.row:last-child {
		border-bottom: 0;
	}

	.header {
		background: var(--color-bg-secondary);
	}

	.header span {
		font-size: var(--text-caption);
		letter-spacing: var(--tracking-widest);
		text-transform: uppercase;
		color: var(--color-fg-muted);
	}

	.cell {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	.strong {
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.note {
		color: var(--color-fg-secondary);
	}

	@media (max-width: 768px) {
		.row,
		.header {
			grid-template-columns: 1fr;
		}
	}
</style>
