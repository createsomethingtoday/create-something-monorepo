<script lang="ts" module>
	/**
	 * DataTable — dense, Tufte-informed table for database-layer surfaces.
	 *
	 * Principles (docs/CANON_DATABASE_LAYER_DESIGN.md §2):
	 * - Real <table> semantics; rows separated by 1px default borders only
	 * - Monospace + tabular-nums for machine values (ids, timestamps, counts)
	 * - Sorting is a controlled affordance: the parent owns data ordering
	 * - Row hover tracks the eye and signals clickability, nothing more
	 */
	export interface DataTableColumn {
		/** Row property key (also the sort key passed to onsort) */
		key: string;
		/** Column header label */
		label: string;
		/** Cell alignment; numbers and timestamps go right */
		align?: 'left' | 'right';
		/** Render cell (and header alignment context) in --font-performance-mono with tabular-nums */
		mono?: boolean;
		/** Fixed width, e.g. '6rem' (otherwise auto) */
		width?: string;
		/** Show the sort affordance for this column */
		sortable?: boolean;
	}

	export type DataTableSortDirection = 'asc' | 'desc';
</script>

<script lang="ts" generics="T extends Record<string, unknown>">
	import type { Snippet } from 'svelte';

	interface Props {
		columns: DataTableColumn[];
		rows: T[];
		/** Stable row identity; falls back to array index */
		rowKey?: (row: T) => string | number;
		/** Active sort column key (controlled) */
		sortKey?: string;
		/** Active sort direction (controlled) */
		sortDirection?: DataTableSortDirection;
		/** Sort request — the parent re-queries/re-orders and passes new rows */
		onsort?: (key: string, direction: DataTableSortDirection) => void;
		/** Row activation → open record detail/drawer */
		onrowclick?: (row: T) => void;
		/** Keep the header visible while long lists scroll */
		stickyHeader?: boolean;
		/** Halve vertical rhythm for triage-scale lists */
		dense?: boolean;
		/** Screen-reader table caption */
		caption?: string;
		/** Custom cell renderer (badges, links); default renders String(value) */
		cell?: Snippet<[{ row: T; column: DataTableColumn; value: unknown }]>;
		/** Rendered inside the table when rows is empty (compose EmptyState here) */
		empty?: Snippet;
		class?: string;
	}

	let {
		columns,
		rows,
		rowKey,
		sortKey,
		sortDirection = 'desc',
		onsort,
		onrowclick,
		stickyHeader = false,
		dense = false,
		caption,
		cell,
		empty,
		class: className = ''
	}: Props = $props();

	function ariaSort(column: DataTableColumn): 'ascending' | 'descending' | undefined {
		if (!column.sortable || sortKey !== column.key) return undefined;
		return sortDirection === 'asc' ? 'ascending' : 'descending';
	}

	function requestSort(column: DataTableColumn) {
		if (!column.sortable || !onsort) return;
		const next: DataTableSortDirection =
			sortKey === column.key && sortDirection === 'desc' ? 'asc' : 'desc';
		onsort(column.key, next);
	}

	function sortGlyph(column: DataTableColumn): string {
		if (sortKey !== column.key) return '↕'; /* ↕ idle */
		return sortDirection === 'asc' ? '↑' : '↓';
	}

	function handleRowKeydown(event: KeyboardEvent, row: T) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onrowclick?.(row);
		}
	}
</script>

<div class={`data-table-scroll ${className}`}>
	<table class="data-table" class:dense class:sticky-header={stickyHeader}>
		{#if caption}
			<caption class="sr-only">{caption}</caption>
		{/if}
		<thead>
			<tr>
				{#each columns as column (column.key)}
					<th
						scope="col"
						aria-sort={ariaSort(column)}
						class:align-right={column.align === 'right'}
						style={column.width ? `width: ${column.width}` : undefined}
					>
						{#if column.sortable && onsort}
							<button type="button" class="sort-button" onclick={() => requestSort(column)}>
								<span>{column.label}</span>
								<span class="sort-glyph" class:active={sortKey === column.key} aria-hidden="true">
									{sortGlyph(column)}
								</span>
							</button>
						{:else}
							{column.label}
						{/if}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#if rows.length === 0}
				<tr>
					<td class="empty-cell" colspan={columns.length}>
						{#if empty}
							{@render empty()}
						{:else}
							<span class="empty-message">No records match this view.</span>
						{/if}
					</td>
				</tr>
			{:else}
				{#each rows as row, index (rowKey ? rowKey(row) : index)}
					<tr
						class:clickable={Boolean(onrowclick)}
						onclick={onrowclick ? () => onrowclick(row) : undefined}
						onkeydown={onrowclick ? (event) => handleRowKeydown(event, row) : undefined}
						tabindex={onrowclick ? 0 : undefined}
					>
						{#each columns as column (column.key)}
							<td class:mono={column.mono} class:align-right={column.align === 'right'}>
								{#if cell}
									{@render cell({ row, column, value: row[column.key] })}
								{:else}
									{String(row[column.key] ?? '')}
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>

<style>
	.data-table-scroll {
		overflow-x: auto;
		min-width: 0;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	/* Header: typographic hierarchy, no fills beyond a quiet surface */
	thead th {
		background: var(--color-performance-shell-surface-secondary);
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-caption);
		font-weight: var(--font-performance-medium);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		text-align: left;
		padding: var(--space-performance-xs) var(--space-performance-sm);
		border-bottom: 1px solid var(--color-performance-border-emphasis);
	}

	.sticky-header thead th {
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.sort-button {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		color: inherit;
		letter-spacing: inherit;
		text-transform: inherit;
		cursor: pointer;
	}

	.sort-button:hover {
		color: var(--color-performance-fg-secondary);
	}

	.sort-button:focus-visible {
		outline: 2px solid var(--color-performance-focus);
		outline-offset: 2px;
	}

	.sort-glyph {
		color: var(--color-performance-fg-subtle);
		transition: color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.sort-glyph.active {
		color: var(--color-performance-fg-primary);
	}

	/* Rows: 1px separators only — no zebra striping, no cell borders */
	tbody td {
		padding: var(--space-performance-xs) var(--space-performance-sm);
		border-bottom: 1px solid var(--color-performance-border-default);
		vertical-align: top;
	}

	.dense tbody td {
		padding: calc(var(--space-performance-xs) / 2) var(--space-performance-sm);
	}

	tbody tr {
		transition: background var(--duration-performance-micro) var(--ease-performance-standard);
	}

	tbody tr:hover {
		background: var(--color-performance-hover);
	}

	tbody tr.clickable {
		cursor: pointer;
	}

	tbody tr.clickable:focus-visible {
		outline: 2px solid var(--color-performance-focus);
		outline-offset: -2px;
	}

	/* Machine values: ids, cursors, timestamps, counts */
	td.mono {
		font-family: var(--font-performance-mono);
		font-variant-numeric: tabular-nums;
		color: var(--color-performance-fg-tertiary);
	}

	.align-right {
		text-align: right;
	}

	.empty-cell {
		padding: var(--space-performance-md) var(--space-performance-sm);
	}

	.empty-message {
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-caption);
	}
</style>
