# Canon Database-Layer Design

Design patterns for **database-layer UI surfaces**: admin screens whose subject is the Database tier of the Three-Tier Framework — records, queues, cursors, and audit trails, rather than marketing claims or documents.

First consumer: the **App Governance & Transparency** admin surface backed by `packages/app-governance-db` (D1: `sources`, `sync_cursors`, `categories`, `findings`, `items`, `links`, `notifications`, `events`; Atlas-linked). The patterns are written to generalize to any D1-backed operator surface.

**Framework placement**: these surfaces sit at the seam between Database (what exists) and Judgment (what should happen). The UI is the **instrument cluster** of the Automotive Framework — at-a-glance telemetry — plus the operator controls that route records toward decisions. The tool recedes; the operator watches the records, not the interface.

---

## 1. Foundations

### 1.1 Tailwind for structure, Canon for aesthetics

Unchanged from the CSS Canon. Layout composition (`flex`, `grid`, `gap-*`, `p-*`, `max-w-*`, `overflow-*`) uses Tailwind utilities. Everything the eye reads as *design* — color, type scale, borders, radii, shadows, motion — uses Canon tokens in scoped `<style>` blocks with semantic class names.

Token source of truth: `packages/canon/src/lib/styles/tokens.css` (published as `@create-something/canon`). Note: older docs reference `packages/components`; the live package is `packages/canon`.

### 1.2 Theme: the dark shell, not the public Performance surface

Canon currently carries two surface languages:

| Language | Tokens | Purpose |
|----------|--------|---------|
| **Shell (dark monochrome)** | `--color-shell-surface*`, `--color-shell-border-*`, `--color-bg-*`, `--color-fg-*` | Operator cockpits, tools, telemetry |
| **Performance Lab (light)** | `--color-performance-*`, `Performance*` components | Proof-bearing communication surfaces (mapped/governed/validated claims) |

Database-layer surfaces use the **dark shell**. Rationale: the cockpit principle — instruments read best against a dark ground, semantic color carries maximum signal on `#000`/`#0d0d0d`, and the Performance components' contract is a different job than dense record manipulation. `PerformanceStateRows`/`PerformanceDecisionPanel` remain available when a governance surface must *present* a decision narrative; they are not the workhorse.

Surface stack for database layers:

| Layer | Token |
|-------|-------|
| Page ground | `--color-bg-pure` |
| Panel / table container | `--color-shell-surface` (or `--color-bg-surface`) |
| Nested panel, thead, drawer header | `--color-shell-surface-secondary` |
| Hover row | `--color-hover` overlay |
| Borders | `--color-border-default`, emphasis on interaction with `--color-border-emphasis` |

### 1.3 Monochrome first; color is state

The surface is black, white, and the grays between (`--color-fg-primary` → `--color-fg-subtle`). Color appears **only** as semantic state: `--color-success`, `--color-error`, `--color-warning`, `--color-info` (+ their `-muted` and `-border` companions), and `--color-data-*` only inside charts/sparklines. A screen with no problems should be nearly colorless. If everything is colored, nothing is signaled.

### 1.4 No glass on data

Per the CSS Canon: **do not use glass on dense data tables** — readability suffers. Glass is permitted for the drawer *backdrop* (`--color-overlay`) and floating chrome (sticky action bars, `.glass-elevated` dropdowns), never for the record surface itself. Solid `--color-shell-surface` under every row of data.

### 1.5 Spacing: golden ratio has a ceiling

Golden-ratio tokens (`--space-xs` = 0.618rem … `--space-xl` = 4.236rem) are for **component internals** — cell padding, badge gaps, drawer sections. `--space-2xl`/`--space-3xl` are too large for admin layout. Page and section rhythm uses Tailwind (`py-8`, `py-12`, `gap-6`, `px-6`). Density is a feature on database surfaces: prefer `--space-xs`/`--space-sm` internally; earn every pixel of whitespace (Tufte: maximize data-ink).

### 1.6 Typography

| Role | Token / face | Notes |
|------|--------------|-------|
| Page title | `--text-h1` | One per surface |
| Panel headings | `--text-h3` | Plain, short |
| Table body, list rows | `--text-body-sm` | Density default |
| Cell metadata, timestamps | `--text-caption` |  |
| Column headers, badges, eyebrows | `--text-overline` or `--text-caption`, uppercase, `letter-spacing: 0.04em` | `--color-fg-muted` |
| **IDs, cursors, timestamps, counts** | `--font-mono` + `font-variant-numeric: tabular-nums` | Non-negotiable — machine values read as machine values |

Monospace is the database layer's accent typeface. In monochrome, the mono/sans contrast does the work color would otherwise do: it separates *record identity* (ids, `channel:ts` cursors, ISO timestamps, client IDs) from *human prose* (titles, summaries, reasons).

### 1.7 Motion

Purposeful only. `--duration-micro` + `--ease-standard` for row hover, sort flips, badge changes; `--duration-standard` for drawer open/close. No entrance animation on tables (data should simply be there). Respect `prefers-reduced-motion` (canon.css already handles the global rule).

---

## 2. Pattern: Data Table (`DataTable`)

The core primitive. Tufte-informed: high density, maximal data-ink ratio, hierarchy through opacity and alignment rather than boxes and fills.

### Rules

1. **Real `<table>` semantics.** `<table>/<thead>/<tbody>`, `scope="col"`, optional `<caption class="sr-only">`. Screen readers and keyboard users get the grid for free.
2. **Rows separated by 1px `--color-border-default` only.** No zebra striping, no cell borders, no filled header. The `<thead>` sits on `--color-shell-surface-secondary` at most, with `--text-overline`-style labels in `--color-fg-muted`.
3. **Alignment rules**:
   - Text: left.
   - Numbers, counts, durations: right, `tabular-nums`, `--font-mono`.
   - Timestamps: right or trailing column, `--font-mono`, `--text-caption`, `--color-fg-tertiary`.
   - Status badges: left, immediately after the identifying column.
   - Never center columns (centering breaks scan lines).
4. **Row hover**: `background: var(--color-hover)` over `--duration-micro`. Hover exists to track the eye across wide rows and to signal clickability, nothing more. Clickable rows get `cursor: pointer` and open the record drawer; the entire row is the target.
5. **Sorting affordance**: sortable headers are `<button>`s inside `<th aria-sort>`. Idle state shows a `--color-fg-subtle` `↕` glyph; active column shows `↑`/`↓` in `--color-fg-primary`. No pill, no background — the affordance is typographic. Sorting is **controlled by the parent** (`onsort` callback); the component never re-orders data itself (the query layer owns ordering).
6. **Density**: default row padding `--space-xs` vertical / `--space-sm` horizontal; a `dense` variant halves vertical padding for triage-scale lists. Truncate long text cells (`truncate` + `title`), never wrap ids.
7. **Sticky header** (optional prop) for long scrolling lists; the header keeps its solid surface so rows pass beneath it — this is the one sanctioned "floating chrome" inside a table.
8. **Counts stay honest**: the panel heading carries the row count (`214 findings`), monospace. Pagination or "showing N of M" sits in a `--text-caption` footer row, not floating chrome.

### Reference markup shape

```svelte
<DataTable
  columns={[
    { key: 'id', label: 'ID', mono: true, width: '5rem' },
    { key: 'title', label: 'Finding', sortable: true },
    { key: 'status', label: 'Status' },        // rendered via cell snippet → StatusBadge
    { key: 'priority', label: 'Priority' },
    { key: 'updated_at', label: 'Updated', mono: true, align: 'right', sortable: true }
  ]}
  rows={findings}
  sortKey="updated_at" sortDirection="desc"
  onsort={(key, dir) => goto(`?sort=${key}&dir=${dir}`)}
  onrowclick={(row) => openDrawer(row.id)}
  stickyHeader
/>
```

---

## 3. Pattern: Record Detail / Drawer

A row click opens a **right-side drawer** rather than navigating away — the table (the operator's context) stays visible.

- **Chrome**: backdrop `--color-overlay`; panel `--color-shell-surface-elevated`, left border `--color-border-emphasis`, width `min(480px, 90vw)`. Slide in over `--duration-standard` `--ease-standard`.
- **Reuse**: Canon already ships `Drawer` (`components/navigation`) with focus management — compose record content inside it rather than building drawer mechanics again.
- **Header**: record title (`--text-h3`), `StatusBadge` row (status + priority), and the record id in `--font-mono` `--color-fg-muted`. Close is `Esc`, backdrop click, and an explicit button.
- **Metadata block**: a `<dl>` two-column grid (Tailwind `grid grid-cols-[auto_1fr] gap-x-6 gap-y-2`); `dt` = `--text-caption` uppercase `--color-fg-muted`; `dd` = `--text-body-sm`, mono where the value is machine-shaped (`app_client_id`, `airtable_record_id`, `atlas_canvas_id`, timestamps).
- **Sections**, in order for a finding: Summary → Decision (if `decision_needed`) → Linked items → Links (`links` table, external chips) → Notifications → Audit slice (`events` filtered to this entity, using the Audit Trail pattern). Sections are separated by `1px` `--color-border-default` rules, not nested cards.
- **Actions** live in a footer row pinned to the drawer bottom: primary action left-most, destructive/ignore actions rendered as ghost buttons — reuse `Button` (`primary`/`secondary`/`ghost`).
- Deep-linkable: drawer state should be reflected in the URL (`?finding=42`) so operators can hand off exact records.

---

## 4. Pattern: Status + Priority Badge System (`StatusBadge`)

Color is **semantic, never decorative**. Every badge tone maps to a Canon semantic token family (`-muted` background, full-strength foreground, `-border` border). Two visual variants:

- **`pill`** — bordered, muted-fill capsule (`--radius-full`), uppercase `--text-caption`. For headers, drawers, summary rows.
- **`dot`** — colored 8px dot + plain `--color-fg-secondary` label. For dense tables, where a page of filled pills would out-shout the data.

### Lifecycle mapping (findings: `status`)

| State | Tone | Tokens | Reading |
|-------|------|--------|---------|
| `flagged` | warning | `--color-warning*` | Entered the system; unhandled attention |
| `in_progress` | info | `--color-info*` | Being worked; no action needed |
| `needs_decision` | warning + emphasis | `--color-warning*`, `--color-border-strong` outline or bold label | The Judgment gate — the loudest non-error state on the surface |
| `shipped` | success | `--color-success*` | Done, with evidence |
| `parked` | neutral | `--color-fg-muted` / `--color-bg-surface` / `--color-border-default` | Deliberately dormant; visually recedes |

### Priority mapping (`priority`)

| Priority | Tone | Notes |
|----------|------|-------|
| `P0` | error | The only place `--color-error` appears outside failures |
| `P1` | warning | |
| `P2` | info | |
| `P3` | neutral | Gray; recedes |

The same tone system covers the other lifecycles in the schema — triage (`new`=info, `categorized`/`linked`=success, `ignored`=neutral), notifications (`queued`=info, `sent`=success, `failed`=error, `skipped`=neutral) — one badge component, one semantic vocabulary. **Never** use `--color-data-*` for state (those are chart series colors) and never invent per-category hues: categories are text, not color.

---

## 5. Pattern: Triage Queue

The `items` table where `triage_state = 'new'` is an **inbox**. Inbox design goals: zero-out the queue, one decision per item, keyboard-fast.

- **Queue header**: the count of new items is the surface's single loud number — `--text-h1`, `--font-mono`, next to "new items". When zero, the header collapses to the Empty State pattern ("Inbox zero. Cursors are current.").
- **Item row** (list, not table — items are prose-shaped): source badge (`#triage-marketplace-apps` in `--font-mono` `--text-caption`), author, relative time, then message text (`--text-body-sm`, max 3-line clamp), permalink out-link. Thread children indent under `thread_ts` parents with a `--color-border-default` left rule.
- **Actions per item**, rendered as a right-aligned ghost-button cluster, visible on hover/focus-within and always visible on touch:
  - **Categorize** → category select (the 9 seeded categories; plain dropdown, reuse `Select`/`DropdownMenu`)
  - **Link** → attach to existing finding (typeahead by finding id/title) or "New finding from item"
  - **Ignore** → moves to `ignored`; requires no confirmation but shows an undo `Toast` (reuse feedback `Toast`)
- **Progressive disclosure**: acting on an item removes it from the queue with a `--duration-micro` fade — no celebratory motion; the reward is the shrinking count.
- **Batch mode** may be added later (checkbox column + sticky action bar); specify only when a real volume problem demands it (Rams: it must earn existence).

---

## 6. Pattern: Sync Status / Cursor Telemetry (Instrument Cluster)

`sync_cursors` is telemetry: readable at a glance, no interaction required. This is the instrument-cluster of the Automotive Framework — gauges, not forms.

- **Top strip**: one gauge per source, composed from `@create-something/tufte` `MetricCard` where a numeric trend exists, otherwise a simple metric cell (`.metric-value` `--text-h2` `--font-mono` / `.metric-label` `--text-caption` uppercase muted).
- **Freshness is the gauge needle.** Each source row shows a `StatusBadge` (dot variant) driven by `last_synced_at` staleness thresholds:

  | Age | Tone | Meaning |
  |-----|------|---------|
  | < 1h (or within expected cadence) | success | Current |
  | 1h–24h | warning | Aging |
  | > 24h or never | error | Stale — sync attention needed |

  Thresholds are per-source configuration, not hardcoded in the component.
- **Cursor row anatomy**: source name (`--text-body-sm`), `cursor_value` in `--font-mono` `--color-fg-tertiary` (truncated middle if long), `last_synced_at` as relative time with absolute ISO in `title`, `synced_by` agent id in `--font-mono` `--text-caption`.
- No progress bars, no spinners at rest. A spinner (`Spinner` from feedback) appears only during an actively running sync. The cluster is honest about the last known state; it does not simulate liveness.

---

## 7. Pattern: Audit Trail / Event Log

`events` is append-only; the UI must *look* append-only.

- **Log rows**, reverse chronological, each a single line at rest:
  `[timestamp mono, --color-fg-muted]  actor · action  entity_type#entity_id [mono]`
  — actor and entity id in `--font-mono`; `action` is the only `--color-fg-primary` element in the row.
- **Left timeline rule**: a `1px` `--color-border-default` vertical rule with a 6px `--color-fg-subtle` node per event ties the log together visually without card chrome.
- **Expandable payload**: rows with `payload_json` expand (disclosure caret, `--duration-micro`) to a `<pre>` block — `--font-mono` `--text-caption` on `--color-bg-elevated`, `--radius-sm`, horizontal scroll, never wrapped/prettified in a way that changes the payload.
- **No affordances that imply mutability**: no edit, no delete, no drag. Filters (actor, action, entity_type) render above as plain form controls.
- Semantic color only when the *action itself* is a failure (`action LIKE '%fail%'` → error tone dot). History is not decorated.

---

## 8. States: Empty, Loading, Error

Reuse `packages/canon/src/lib/patterns/` — these already exist and are Canon-compliant:

| State | Component | Database-layer usage |
|-------|-----------|----------------------|
| Empty | `EmptyState` | "Empty is not nothing." Queue at zero is an achievement ("Inbox zero"); an unfiltered empty table is an invitation ("No findings recorded yet") with the primary action as CTA; a *filtered* empty result says so explicitly ("No findings match these filters") with a Clear-filters action. |
| Loading | `LoadingSkeleton` | Skeleton **table rows** (same row height/column widths as the real table — layout must not shift), not spinners. `LoadingOverlay` only for in-place refresh of an already-rendered panel. |
| Inline error | `InlineError` / `Alert` | Notices use semantic tokens: `--color-error-muted` bg, `--color-error-border` border, `--color-error` text (same triple for warning/success/info). Every failed server operation surfaces its `correlationId` in `--font-mono` per error-handling-patterns.md. |
| Fatal | `ErrorBoundary` | Panel-level: one broken gauge must not take down the cockpit. Each major panel (queue, table, cluster, log) fails independently. |

Degradation rule from the schema's own design: if a table/migration is unavailable (cf. the existing governance page's "migration 0030" notice), render the panel as a warning notice in place — never a blank region.

---

## 9. Component Inventory: Reuse vs. New

### Reuse as-is (already in Canon / Tufte)

| Component | Source | Role here |
|-----------|--------|-----------|
| `Button` | `@create-something/canon` | All actions (primary/secondary/ghost) |
| `Drawer` | canon `components/navigation` | Record detail shell |
| `Tabs`, `Breadcrumbs`, `Pagination`, `DropdownMenu`, `Tooltip` | canon navigation | Surface navigation, table paging |
| `Select`, `TextField`, `TextArea`, `Checkbox` | canon form | Filters, triage categorize, decision forms |
| `Alert`, `Toast`, `Spinner`, `Skeleton`, `Dialog`, `Progress` | canon feedback | Notices, undo, active sync, confirmations |
| `EmptyState`, `LoadingSkeleton`, `LoadingOverlay`, `InlineError`, `ErrorBoundary` | canon patterns | §8 states |
| `MetricCard`, `Sparkline`, `TrendIndicator`, `HighDensityTable` | `@create-something/tufte` | Instrument cluster; `HighDensityTable` for rank/count lists (top categories, flag sources) — *not* a substitute for `DataTable` (it is a keyed list, not a column grid) |
| `ClearDecisionPanel`, `ClearStateRows` | canon clear | Only when a surface must *present* decision narrative in the Clear light language |

### New shared primitives (`packages/canon/src/lib/components/data/`)

| Component | Status | Contract |
|-----------|--------|----------|
| `DataTable.svelte` | **candidate-review** (exported via `@create-something/canon/components/data`) | §2. Typed columns, controlled sort, row click, mono/align per column, sticky header, dense variant, cell/empty snippets |
| `StatusBadge.svelte` | **candidate-review** (exported via `@create-something/canon/components/data`) | §4. `tone: success/error/warning/info/neutral`, `variant: pill/dot`, `emphasis` flag for `needs_decision`-class states |

### New, specified here but built app-side first (promote to Canon when a second consumer exists — DRY means unify on the second use, not speculatively)

| Component | Pattern | Why app-side first |
|-----------|---------|---------------------|
| `RecordDrawer.svelte` | §3 | Thin composition of canon `Drawer` + `<dl>` metadata grid; the section order is domain-specific |
| `TriageQueue.svelte` (+ `TriageItem.svelte`) | §5 | Actions (categorize/link/ignore) are bound to governance verbs and endpoints |
| `SyncStatusPanel.svelte` | §6 | Composition of `MetricCard` + `StatusBadge` + cursor rows; staleness thresholds are per-source config |
| `AuditLog.svelte` | §7 | Timeline + payload disclosure; likely the first promoted to Canon (every D1 surface has an events table) |

---

## 10. Current-State Audit: `/admin/governance`

`packages/agency/src/routes/admin/governance/+page.svelte` (the existing operator inbox) is functionally the right shape (summary metrics → connections → map → records) but **off-Canon**:

| Deviation | Canon replacement |
|-----------|-------------------|
| Light theme with hardcoded slate hexes (`#64748b`, `#e2e8f0`, `#f8fafc`, `#0f172a`) | Dark shell tokens (`--color-shell-*`, `--color-fg-*`, `--color-border-*`) — or, if it stays light, `--color-performance-*`; hardcoded hex is a violation either way |
| Hand-rolled `.pill` classes with Tailwind-palette fills (`#dcfce7`, `#fee2e2`, `#e0f2fe`) | `StatusBadge` with semantic tokens |
| Hardcoded px/rem sizes (`font-size: 2rem`, `padding: 18px`, `border-radius: 8px`) | `--text-*`, `--space-*`/Tailwind spacing, `--radius-*` |
| No `--duration-*`/`--ease-standard` transitions | Canon motion tokens |
| Metrics/records hand-built per panel | `MetricCard`, `DataTable`, patterns above |

Migration is incremental-on-touch per the WORKWAY alignment policy; this spec defines the target, it does not mandate a rewrite.

---

## 11. Deliberately Unspecified

- **Batch triage / multi-select** — wait for a demonstrated volume problem (§5).
- **Real-time updates** (polling vs. SSE vs. manual refresh) — a data-layer decision; the UI contract is only that the instrument cluster shows *last known* state honestly.
- **Column resize/reorder/persistence** — density and fixed, well-chosen columns first; personalization is complexity that must earn existence.
- **Charts beyond sparklines** — if trend visualization grows, follow the `dataviz` guidance and `--color-data-*` palette; out of scope here.
- **Mobile-first triage** — patterns degrade to single column (tables scroll horizontally; drawer becomes full-screen sheet), but a dedicated mobile operator flow is unscoped.
- **Light-mode variant of the database layer** — the shell tokens have a light mapping in `tokens.css`; whether governance surfaces ever ship it is a product call, not a token gap.

---

## Subtractive Triad check

| Level | Question | Answer |
|-------|----------|--------|
| **DRY** | Have I built this before? | Reuses canon patterns/feedback/navigation/form and tufte telemetry; adds only two primitives that exist nowhere (`DataTable`, `StatusBadge`) |
| **Rams** | Does this earn its existence? | Every pattern maps to a table in `app-governance-db`; no speculative components (drawer/queue/log stay app-side until a second consumer) |
| **Heidegger** | Does this serve the whole? | The database layer becomes legible the same way everywhere: mono for machine values, semantic color for state, borders for structure — the operator watches records, the interface recedes |
