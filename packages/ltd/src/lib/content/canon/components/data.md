---
category: "Canon"
section: "Components"
title: "Data"
description: "Database-layer primitives for records, queues, cursors, and audit trails."
lead: "Data components make the Database tier legible: dense tables with real table semantics, and semantic state badges that reserve color for meaning. The operator watches the records; the interface recedes."
publishedAt: "2026-07-06"
published: true
---

## Status: Candidate Review

`DataTable` and `StatusBadge` ship through
`@create-something/canon/components/data` under **candidate-review** policy —
not stable. The first consumer is the deployed app-governance dashboard;
promotion waits on a second consuming surface. Design source:
`docs/CANON_DATABASE_LAYER_DESIGN.md`.

## What Ships Today

- `DataTable` — dense, Tufte-informed record table: real `<table>` semantics,
  `aria-sort` headers, controlled sorting (the query layer owns ordering),
  keyboard row activation, monospace machine-value columns, sticky header and
  dense variants, cell and empty snippets
- `StatusBadge` — semantic state indicator: success / error / warning / info /
  neutral tones, pill and dot variants, emphasis for judgment-gate states

## Selection Rules

1. Use the dark shell surface language for database layers, never glass on
   dense data.
2. Machine values (ids, cursors, timestamps, counts) render monospace with
   tabular numerals; numbers and timestamps align right.
3. Color is state: map lifecycles and priorities to the five semantic tones;
   never use chart series colors or per-category hues for state.
4. Sorting is controlled — the parent re-queries and passes new rows; the
   table never re-orders data itself.
5. Chat and voice modalities summarize the underlying records as text instead
   of rendering the grid; the badge label always carries the state as plain
   text.

## Example

```svelte
<DataTable
  columns={[
    { key: 'id', label: 'ID', mono: true, width: '5rem' },
    { key: 'title', label: 'Finding', sortable: true },
    { key: 'status', label: 'Status' },
    { key: 'updated_at', label: 'Updated', mono: true, align: 'right', sortable: true }
  ]}
  rows={findings}
  sortKey="updated_at"
  sortDirection="desc"
  onsort={(key, dir) => goto(`?sort=${key}&dir=${dir}`)}
  onrowclick={(row) => openDrawer(row.id)}
>
  {#snippet cell({ column, value })}
    {#if column.key === 'status'}
      <StatusBadge label={String(value)} tone="warning" variant="dot" />
    {:else}
      {String(value ?? '')}
    {/if}
  {/snippet}
</DataTable>
```

## Related

- [Feedback](/canon/components/feedback)
- [Navigation](/canon/components/navigation)
- [Insights](/canon/components/insights)
