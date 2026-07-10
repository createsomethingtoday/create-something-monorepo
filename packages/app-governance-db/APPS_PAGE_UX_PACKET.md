# Alignment Packet — Apps Page UX (dashboard)

Status: design spec — NOT yet implemented (current /apps has search/sort/drift only).

For the agent working `packages/app-governance-db/dashboard`. The Apps page currently renders a flat 645-row table under a mostly-empty drift panel. The registry is the governance system's densest dataset; the page should answer operator questions, not just enumerate rows. Read-only SELECTs against D1 remain the only data access; use the Canon data primitives landed in #788 (`DataTable`, `StatusBadge`) and the patterns in `docs/CANON_DATABASE_LAYER_DESIGN.md`.

## The operator jobs this page must serve (in priority order)

1. **Find one app fast** — search across slug, name, and client_id (client_id lookups happen constantly in casework: tickets arrive with a hex id, not a name).
2. **See the anomalies without hunting** — PUBLIC apps whose review status is not APPROVED are governance violations (cf. finding #10: pxm-forms, bearsync). They must be visible by default, not discoverable-by-sorting.
3. **Slice the §2 cohorts in one click** — visibility × review-status is the private/beta decision's evidence base (387 PUBLIC+APPROVED · 88 PRIVATE+APPROVED · 83 PRIVATE+none · 79 PRIVATE+ARCHIVED…). These cohorts should be facet chips with live counts, each a filtered view.
4. **Watch drift** — after the second admin snapshot, `app_changed` events with field diffs appear; the page should show what changed, when, per app.
5. **Spot duplicate client_ids** — the original IC audit job, now continuous (2 same-workspace pairs today).

## Target layout

```
Apps                                    [search: slug / name / client_id]

⚠ ANOMALIES (2)                         ← pinned strip, only when non-empty
  pxm-forms   PUBLIC + ARCHIVED   → finding #10
  bearsync    PUBLIC + DRAFT      → finding #10

FACETS   [All 645] [Public 389] [Private 256] · [Approved 475] [Archived 80]
         [Draft 7] [No status 83] · [Private+Approved 88] [Dup client_id 4]

DRIFT    collapsed one-liner when empty ("No drift · baseline 2026-07-06 ·
         last sync 09:17"); expands to per-app diff chips when present
         (visibility PUBLIC→PRIVATE, status APPROVED→ARCHIVED …)

REGISTRY DataTable: slug · name · visibility (StatusBadge) · status
         (StatusBadge) · client_id (mono, truncated middle, click-to-copy)
         · last_seen. Row click → detail drawer.
```

## Detail drawer (per app; spec §3 record pattern)

- Identifiers block: slug, client_id, app_id, workspace_id — all mono with copy affordance.
- Links out: marketplace detail (`https://webflow.com/apps/detail/<slug>`), admin edit (`…/edit`).
- State: visibility + review status badges, first_seen / last_seen / last_changed.
- **Change history**: `events` rows where `entity_type='app' AND entity_id=<slug>` (the `app_changed` payload_json holds `{field: {from, to}}` diffs — render as diff chips).
- **Related governance**: findings whose `app_client_id` or summary references the app (`findings` lookup by client_id; LIKE on slug is acceptable v1).

## Data notes (all available today, no worker changes needed)

- Facet counts: one `GROUP BY visibility, review_status` — cheap, do it server-side in the load function alongside the page query.
- Anomalies: `WHERE visibility='PUBLIC' AND review_status != 'APPROVED'`.
- Dup client_ids: `GROUP BY client_id HAVING COUNT(*) > 1` (list both slugs in the chip's view).
- Search: `WHERE slug LIKE ? OR name LIKE ? OR client_id = ?` — exact match on client_id (operators paste full hashes), LIKE on the rest; keep the existing LIMIT + honest "N of M" caption.
- Drift: `events` where `action IN ('app_changed')`, newest first; join `apps` for names.

## Canon constraints

- Tailwind for structure, Canon tokens for aesthetics; dark shell; **color is state only** (badges), never per-cohort hues; monospace for identifiers/timestamps.
- Empty states per spec §8 — the drift panel especially must stop consuming half a viewport to say nothing.
- Keep the table `DataTable` (parent-controlled sorting stays); facets are filters feeding the same query, not client-side array filtering over the full set.

## Non-goals (v1)

- No writes from this page (categorize/flag flows stay with agents via MCP).
- No pagination framework — server LIMIT + facet narrowing + honest counts is enough at 645 rows.
- No per-app screenshots/icons (admin snapshot doesn't capture them).
