// @vitest-environment jsdom
/**
 * Prop-contract, accessibility, and behavior tests for the Canon
 * database-layer primitives (docs/CANON_DATABASE_LAYER_DESIGN.md §2, §4).
 *
 * Both components are candidate-review: these tests pin the public contract
 * (table semantics, aria-sort, keyboard row activation, tone/variant mapping)
 * so promotion review can rely on it.
 */
import { createRawSnippet, flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import DataTable, { type DataTableColumn } from './DataTable.svelte';
import StatusBadge, {
	type StatusBadgeTone,
	type StatusBadgeVariant
} from './StatusBadge.svelte';

type Finding = Record<string, unknown> & {
	id: string;
	title: string;
	updated_at: string;
	count: number;
};

const columns: DataTableColumn[] = [
	{ key: 'id', label: 'ID', mono: true, width: '5rem' },
	{ key: 'title', label: 'Finding', sortable: true },
	{ key: 'count', label: 'Items', align: 'right', mono: true },
	{ key: 'updated_at', label: 'Updated', mono: true, align: 'right', sortable: true }
];

const rows: Finding[] = [
	{ id: 'f-1', title: 'Stale cursor', updated_at: '2026-07-01T08:00:00Z', count: 3 },
	{ id: 'f-2', title: 'Missing webhook', updated_at: '2026-07-02T09:30:00Z', count: 12 }
];

let target: HTMLElement;
let instance: Record<string, unknown> | undefined;

function render<Props extends Record<string, unknown>>(
	component: typeof DataTable | typeof StatusBadge,
	props: Props
) {
	target = document.createElement('div');
	document.body.appendChild(target);
	instance = mount(component as never, { target, props }) as Record<string, unknown>;
	flushSync();
	return target;
}

afterEach(() => {
	if (instance) {
		unmount(instance as never);
		instance = undefined;
	}
	document.body.innerHTML = '';
});

describe('DataTable', () => {
	it('renders real table semantics with scoped column headers', () => {
		const host = render(DataTable, { columns, rows, caption: 'Findings' });

		const table = host.querySelector('table.data-table');
		expect(table).not.toBeNull();
		expect(host.querySelector('thead')).not.toBeNull();
		expect(host.querySelector('tbody')).not.toBeNull();

		const headers = [...host.querySelectorAll('thead th')];
		expect(headers).toHaveLength(columns.length);
		for (const header of headers) {
			expect(header.getAttribute('scope')).toBe('col');
		}

		const caption = host.querySelector('caption');
		expect(caption?.textContent).toBe('Findings');
		expect(caption?.classList.contains('sr-only')).toBe(true);
	});

	it('renders row values with mono and alignment column contracts', () => {
		const host = render(DataTable, { columns, rows });

		const bodyRows = [...host.querySelectorAll('tbody tr')];
		expect(bodyRows).toHaveLength(rows.length);

		const firstCells = [...bodyRows[0].querySelectorAll('td')];
		expect(firstCells.map((cell) => cell.textContent?.trim())).toEqual([
			'f-1',
			'Stale cursor',
			'3',
			'2026-07-01T08:00:00Z'
		]);

		// Machine values render mono; numeric/timestamp columns right-align.
		expect(firstCells[0].classList.contains('mono')).toBe(true);
		expect(firstCells[1].classList.contains('mono')).toBe(false);
		expect(firstCells[2].classList.contains('align-right')).toBe(true);
		expect(firstCells[3].classList.contains('mono')).toBe(true);
		expect(firstCells[3].classList.contains('align-right')).toBe(true);
	});

	it('applies fixed column widths, dense rhythm, and sticky header modifiers', () => {
		const host = render(DataTable, { columns, rows, dense: true, stickyHeader: true });

		const table = host.querySelector('table.data-table');
		expect(table?.classList.contains('dense')).toBe(true);
		expect(table?.classList.contains('sticky-header')).toBe(true);

		const idHeader = host.querySelector('thead th') as HTMLElement;
		expect(idHeader.style.width).toBe('5rem');
	});

	it('sets aria-sort only on the active sortable column', () => {
		const host = render(DataTable, {
			columns,
			rows,
			sortKey: 'updated_at',
			sortDirection: 'desc',
			onsort: () => {}
		});

		const headers = [...host.querySelectorAll('thead th')];
		expect(headers[3].getAttribute('aria-sort')).toBe('descending');
		expect(headers[1].hasAttribute('aria-sort')).toBe(false);
		expect(headers[0].hasAttribute('aria-sort')).toBe(false);
	});

	it('reports ascending aria-sort when the direction flips', () => {
		const host = render(DataTable, {
			columns,
			rows,
			sortKey: 'title',
			sortDirection: 'asc',
			onsort: () => {}
		});

		const headers = [...host.querySelectorAll('thead th')];
		expect(headers[1].getAttribute('aria-sort')).toBe('ascending');
	});

	it('requests controlled sorting without reordering rows itself', () => {
		const onsort = vi.fn();
		const host = render(DataTable, {
			columns,
			rows,
			sortKey: 'updated_at',
			sortDirection: 'desc',
			onsort
		});

		const sortButtons = [...host.querySelectorAll<HTMLButtonElement>('thead .sort-button')];
		// Sortable columns only (title, updated_at).
		expect(sortButtons).toHaveLength(2);

		// Active column toggles desc -> asc.
		sortButtons[1].click();
		flushSync();
		expect(onsort).toHaveBeenLastCalledWith('updated_at', 'asc');

		// New column starts at desc.
		sortButtons[0].click();
		flushSync();
		expect(onsort).toHaveBeenLastCalledWith('title', 'desc');

		// The component never re-orders data (the query layer owns ordering).
		const firstCell = host.querySelector('tbody td');
		expect(firstCell?.textContent?.trim()).toBe('f-1');
	});

	it('does not render sort affordances without an onsort handler', () => {
		const host = render(DataTable, { columns, rows });

		expect(host.querySelector('.sort-button')).toBeNull();
	});

	it('activates rows by click and keyboard (Enter and Space)', () => {
		const onrowclick = vi.fn();
		const host = render(DataTable, { columns, rows, onrowclick });

		const bodyRows = [...host.querySelectorAll<HTMLTableRowElement>('tbody tr')];
		expect(bodyRows[0].getAttribute('tabindex')).toBe('0');
		expect(bodyRows[0].classList.contains('clickable')).toBe(true);

		bodyRows[0].click();
		flushSync();
		expect(onrowclick).toHaveBeenCalledTimes(1);
		expect(onrowclick).toHaveBeenLastCalledWith(rows[0]);

		bodyRows[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		flushSync();
		expect(onrowclick).toHaveBeenLastCalledWith(rows[1]);

		bodyRows[0].dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
		flushSync();
		expect(onrowclick).toHaveBeenCalledTimes(3);

		// Unrelated keys do not activate.
		bodyRows[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		flushSync();
		expect(onrowclick).toHaveBeenCalledTimes(3);
	});

	it('keeps static rows non-interactive', () => {
		const host = render(DataTable, { columns, rows });

		const row = host.querySelector('tbody tr');
		expect(row?.hasAttribute('tabindex')).toBe(false);
		expect(row?.classList.contains('clickable')).toBe(false);
	});

	it('renders the default empty message across all columns', () => {
		const host = render(DataTable, { columns, rows: [] });

		const emptyCell = host.querySelector<HTMLTableCellElement>('tbody td.empty-cell');
		expect(emptyCell?.colSpan).toBe(columns.length);
		expect(emptyCell?.textContent).toContain('No records match this view.');
	});

	it('renders a custom empty snippet when provided', () => {
		const empty = createRawSnippet(() => ({
			render: () => '<span data-testid="custom-empty">Inbox zero.</span>'
		}));
		const host = render(DataTable, { columns, rows: [], empty });

		expect(host.querySelector('[data-testid="custom-empty"]')?.textContent).toBe('Inbox zero.');
	});

	it('renders custom cell snippets with row, column, and value context', () => {
		const cell = createRawSnippet<[{ row: Finding; column: DataTableColumn; value: unknown }]>(
			(getContext) => ({
				render: () => {
					const { column, value } = getContext();
					return `<span data-cell="${column.key}">${String(value ?? '')}</span>`;
				}
			})
		);
		const host = render(DataTable, { columns, rows, cell });

		const renderedCells = [...host.querySelectorAll('[data-cell]')];
		expect(renderedCells).toHaveLength(columns.length * rows.length);
		expect(host.querySelector('[data-cell="id"]')?.textContent).toBe('f-1');
	});
});

describe('StatusBadge', () => {
	const tones: StatusBadgeTone[] = ['success', 'error', 'warning', 'info', 'neutral'];

	it('defaults to a neutral pill', () => {
		const host = render(StatusBadge, { label: 'parked' });

		const badge = host.querySelector('.status-badge');
		expect(badge?.textContent?.trim()).toBe('parked');
		expect(badge?.classList.contains('badge-neutral')).toBe(true);
		expect(badge?.classList.contains('badge-pill')).toBe(true);
		expect(badge?.classList.contains('badge-emphasis')).toBe(false);
		expect(badge?.querySelector('.dot')).toBeNull();
	});

	for (const tone of tones) {
		it(`maps the ${tone} tone to its semantic class`, () => {
			const host = render(StatusBadge, { label: tone, tone });

			const badge = host.querySelector('.status-badge');
			expect(badge?.classList.contains(`badge-${tone}`)).toBe(true);
		});
	}

	const variants: StatusBadgeVariant[] = ['pill', 'dot'];

	for (const variant of variants) {
		it(`renders the ${variant} variant class`, () => {
			const host = render(StatusBadge, { label: 'queued', tone: 'info', variant });

			const badge = host.querySelector('.status-badge');
			expect(badge?.classList.contains(`badge-${variant}`)).toBe(true);
		});
	}

	it('marks the dot as decorative so state is never color-only', () => {
		const host = render(StatusBadge, { label: 'stale', tone: 'error', variant: 'dot' });

		const dot = host.querySelector('.dot');
		expect(dot).not.toBeNull();
		expect(dot?.getAttribute('aria-hidden')).toBe('true');
		// The visible label carries the state text.
		expect(host.querySelector('.status-badge')?.textContent?.trim()).toBe('stale');
	});

	it('applies emphasis for judgment-gate states', () => {
		const host = render(StatusBadge, {
			label: 'needs decision',
			tone: 'warning',
			emphasis: true
		});

		expect(host.querySelector('.status-badge')?.classList.contains('badge-emphasis')).toBe(true);
	});

	it('passes through a consumer class', () => {
		const host = render(StatusBadge, { label: 'shipped', tone: 'success', class: 'row-badge' });

		expect(host.querySelector('.status-badge')?.classList.contains('row-badge')).toBe(true);
	});
});
