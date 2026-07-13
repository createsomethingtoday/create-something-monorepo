<script lang="ts">
	type MatrixRow = {
		lane: string;
		credential: string;
		use: string;
		status: string;
		note?: string;
	};

	export let rows: MatrixRow[] = [];
</script>

<div class="matrix" role="table" aria-label="Credential lanes">
	<div class="matrix-head" role="rowgroup">
		<div role="row" class="matrix-row matrix-header">
			<span role="columnheader">Lane</span>
			<span role="columnheader">Credential</span>
			<span role="columnheader">Used for</span>
			<span role="columnheader">Status</span>
		</div>
	</div>
	<div role="rowgroup">
		{#each rows as row}
			<div role="row" class="matrix-row">
				<div role="cell" class="lane">{row.lane}</div>
				<div role="cell" class="credential">{row.credential}</div>
				<div role="cell" class="usage">
					<span>{row.use}</span>
					{#if row.note}
						<small>{row.note}</small>
					{/if}
				</div>
				<div role="cell" class="status">{row.status}</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.matrix {
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		font-size: 0.85rem;
	}

	.matrix-row {
		display: grid;
		grid-template-columns: minmax(7rem, 0.8fr) minmax(8rem, 1fr) minmax(0, 1.5fr) minmax(8rem, 0.8fr);
		gap: 1rem;
		padding: 0.78rem 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		align-items: start;
	}

	.matrix-header {
		padding: 0.45rem 0 0.55rem;
		color: var(--color-performance-fg-muted);
		font-size: 0.7rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.lane,
	.credential,
	.status {
		font-variant-numeric: tabular-nums;
	}

	.credential,
	.status {
		color: var(--color-performance-fg-primary);
	}

	.usage {
		display: grid;
		gap: 0.2rem;
		color: var(--color-performance-fg-secondary);
	}

	.usage small {
		color: var(--color-performance-fg-muted);
		font-size: 0.75rem;
		line-height: 1.45;
	}

	@media (max-width: 760px) {
		.matrix-head {
			display: none;
		}

		.matrix-row {
			grid-template-columns: 1fr;
			gap: 0.35rem;
			padding: 0.9rem 0;
		}

		.matrix-row > div::before {
			content: attr(class);
			display: block;
			margin-bottom: 0.08rem;
			font-size: 0.66rem;
			letter-spacing: 0.1em;
			text-transform: uppercase;
			color: var(--color-performance-fg-muted);
		}

		.matrix-row > .usage::before {
			content: 'Used for';
		}

		.matrix-row > .lane::before {
			content: 'Lane';
		}

		.matrix-row > .credential::before {
			content: 'Credential';
		}

		.matrix-row > .status::before {
			content: 'Status';
		}
	}
</style>
