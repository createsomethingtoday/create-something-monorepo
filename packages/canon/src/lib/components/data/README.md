# Canon Database-Layer Primitives

Primitives for **database-layer UI surfaces**: operator screens whose subject is
the Database tier of the Three-Tier Framework — records, queues, cursors, and
audit trails. Design source: `docs/CANON_DATABASE_LAYER_DESIGN.md`.

**Status: candidate-review.** Both components are classified
`candidate-review` in the Canon public-export policy (not stable). The first
consuming surface is the deployed app-governance dashboard
(`packages/app-governance-db/dashboard`); promotion to stable waits on a second
consumer validating the contracts.

```ts
import { DataTable, StatusBadge } from '@create-something/canon/components/data';
// also re-exported from '@create-something/canon/components'
```

Both components use the **dark shell** surface language (`--color-shell-*`,
`--color-bg-*`, `--color-fg-*`) — the cockpit, not the Clear light language.

---

## DataTable

Dense, Tufte-informed table for record lists (design doc §2). Real `<table>`
semantics, rows separated by 1px borders only, monospace for machine values,
controlled sorting.

### Props

| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `columns` | `DataTableColumn[]` | required | Column contracts (see below) |
| `rows` | `T[]` (`T extends Record<string, unknown>`) | required | Row data; ordering is owned by the parent |
| `rowKey` | `(row: T) => string \| number` | array index | Stable row identity |
| `sortKey` | `string` | — | Active sort column (controlled) |
| `sortDirection` | `'asc' \| 'desc'` | `'desc'` | Active sort direction (controlled) |
| `onsort` | `(key, direction) => void` | — | Sort request; parent re-queries/re-orders and passes new `rows` |
| `onrowclick` | `(row: T) => void` | — | Row activation (open record detail/drawer); enables `tabindex`, Enter/Space activation |
| `stickyHeader` | `boolean` | `false` | Keep header visible while long lists scroll |
| `dense` | `boolean` | `false` | Halve vertical rhythm for triage-scale lists |
| `caption` | `string` | — | Screen-reader table caption (`sr-only`) |
| `cell` | `Snippet<[{ row, column, value }]>` | `String(value)` | Custom cell renderer (badges, links) |
| `empty` | `Snippet` | built-in message | Rendered when `rows` is empty (compose `EmptyState` here) |

`DataTableColumn`: `{ key, label, align?: 'left' | 'right', mono?, width?, sortable? }`.
Numbers, counts, and timestamps go `align: 'right'` with `mono: true`
(`--font-mono` + `tabular-nums`). Never center columns.

### Accessibility contract

- `<table>/<thead>/<tbody>` with `scope="col"` headers and optional sr-only caption.
- Sortable headers are real `<button>`s inside `<th aria-sort>`; the affordance
  is typographic (`↕` idle, `↑`/`↓` active), no pills or fills.
- Clickable rows get `tabindex="0"` and activate on Enter and Space; the whole
  row is the target.

### Usage

```svelte
<DataTable
  caption="Findings"
  columns={[
    { key: 'id', label: 'ID', mono: true, width: '5rem' },
    { key: 'title', label: 'Finding', sortable: true },
    { key: 'status', label: 'Status' },
    { key: 'updated_at', label: 'Updated', mono: true, align: 'right', sortable: true }
  ]}
  rows={findings}
  rowKey={(row) => row.id}
  sortKey="updated_at"
  sortDirection="desc"
  onsort={(key, dir) => goto(`?sort=${key}&dir=${dir}`)}
  onrowclick={(row) => openDrawer(row.id)}
  stickyHeader
>
  {#snippet cell({ column, value })}
    {#if column.key === 'status'}
      <StatusBadge label={String(value)} tone={toneFor(value)} variant="dot" />
    {:else}
      {String(value ?? '')}
    {/if}
  {/snippet}
</DataTable>
```

### Do / Don't

| Do | Don't |
|----|-------|
| Let the parent own ordering; re-query on `onsort` | Sort rows inside the component |
| `mono: true` for ids, cursors, timestamps, counts | Render machine values in the prose face |
| Right-align numeric/timestamp columns | Center columns (breaks scan lines) |
| Compose `EmptyState` in the `empty` snippet | Leave a blank region when a query is empty |
| Solid `--color-shell-surface` under rows | Glass on dense data (readability suffers) |
| 1px `--color-border-default` row separators | Zebra striping, cell borders, filled headers |

---

## StatusBadge

Semantic state indicator (design doc §4). Color is **semantic, never
decorative**: every tone maps to a Canon semantic token family.

### Props

| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `label` | `string` | required | Visible state text, e.g. `"needs decision"`, `"P0"` |
| `tone` | `'success' \| 'error' \| 'warning' \| 'info' \| 'neutral'` | `'neutral'` | Semantic tone → Canon token family |
| `variant` | `'pill' \| 'dot'` | `'pill'` | `pill` = bordered muted-fill capsule; `dot` = colored dot + plain label (dense tables) |
| `emphasis` | `boolean` | `false` | Stronger weight/border for judgment-gate states (e.g. `needs_decision`) |

### Tone mapping (design doc §4, §6)

Lifecycle (`status`):

| State | Tone |
|-------|------|
| `flagged` | `warning` |
| `in_progress` | `info` |
| `needs_decision` | `warning` + `emphasis` — the Judgment gate |
| `shipped` | `success` |
| `parked` | `neutral` (visually recedes) |

Priority: `P0` → `error` (the only non-failure use of error), `P1` → `warning`,
`P2` → `info`, `P3` → `neutral`.

Cursor freshness (sync telemetry, §6 — thresholds are per-source config, not
component logic): current → `success`, aging (1h–24h) → `warning`, stale
(>24h/never) → `error`, dot variant.

### Do / Don't

| Do | Don't |
|----|-------|
| Use `dot` variant in dense tables | Fill a page of pills that out-shout the data |
| Reserve `emphasis` for judgment-gate states | Emphasize routine states |
| Reuse the five semantic tones for new lifecycles | Invent per-category hues (categories are text, not color) |
| Keep state readable as plain text (chat/voice) | Encode state in color alone |
| — | Use `--color-data-*` (chart series colors) for state |
