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
		border-radius: var(--radius-performance-scale-md);
		overflow: hidden;
		background: var(--color-performance-bg-surface);
	}

	.row {
		display: grid;
		grid-template-columns: minmax(140px, 0.85fr) minmax(180px, 1fr) 1.4fr;
		gap: var(--space-performance-md);
		padding: var(--space-performance-md) var(--space-performance-lg);
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
		font-size: var(--text-performance-caption);
		letter-spacing: var(--tracking-performance-widest);
		text-transform: uppercase;
		color: var(--color-performance-fg-muted);
	}

	.cell {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-secondary);
		line-height: var(--leading-performance-relaxed);
	}

	.strong {
		font-weight: var(--font-performance-medium);
		color: var(--color-performance-fg-primary);
	}

	.note {
		color: var(--color-performance-fg-secondary);
	}

	@media (max-width: 768px) {
		.row,
		.header {
			grid-template-columns: 1fr;
		}
	}
</style>
