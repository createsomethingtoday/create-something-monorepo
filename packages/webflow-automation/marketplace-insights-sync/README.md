# Marketplace Insights Sync

Weekly Snowflake → Airtable sync for the Asset Dashboard's Marketplace Insights
page. Replaces the legacy worksheet-based warehouse sync (Fivetran push set up
during the 2024 template-search experiment).

## Why it exists

Validated 2026-08-26 (see `runs/` receipts and CRE follow-up): the legacy sync's
"30-day" numbers were ~1.4–2x true delivered sales (effective window wider than
labeled), individual rows froze for weeks at a time, revenue was derived as
`count × price × 0.95` (older frozen rows: `× 0.80`), and the parent-category
mapping was stale (e.g. Transportation & Logistics listed under "Business";
the base's own taxonomy puts it under "Transportation & Automotive").

This sync computes the numbers the dashboard's labels actually claim.

## Definitions

| Value | Definition |
|---|---|
| Sale | `MARKETPLACE_ORDERS` row, `RESOURCE_TYPE='Template'`, `STATUS='delivered'` at query time (refunded orders drop out), `CREATED_ON` in the window |
| Window | Rolling 30 days ending at the most recent **Monday 16:00 UTC** (`--as-of <ISO>` to override) |
| Revenue | `SUM(PRICE_VALUE)` — gross list price, measured, no multiplier |
| `TEMPLATES_IN_SUBCATEGORY` | Distinct templates with ≥1 sale in the window ("selling templates" — not inventory, not a qualification threshold) |
| `AVG_REVENUE_PER_TEMPLATE` | Window revenue ÷ selling templates |
| Taxonomy | The base's own 🪣Categories → 🪣Category Groups links (primary group per category); a selling template contributes to every category it is tagged with |
| `SNAPSHOT_AT` | The window end (Monday 16:00 UTC) — this is what the dashboard's freshness display reads |

Templates are joined Snowflake → Airtable by normalized name. Sellers with no
matching asset (renamed/delisted twins) are listed in the run receipt under
`unmatchedSellers` with the sales volume they represent — watch that number.

## Targets (unchanged — the dashboard needs no changes)

- `Top Templates by Sales / 30 Days` (`tblcXLVLYobhNmrg6`), top 160 by sales
- `Template Category/Subcategory Performance / 30 days` (`tblDU1oUiobNfMQP9`),
  one row per (category group, category) with ≥1 selling template

Upserts merge on `TEMPLATE_NAME` / `ID` (`group::category`); rows not in the
new set are deleted (all rows are derived and fully regenerable).

## Running

```bash
# Dry run (no writes) — prints and saves counts and a receipt
AIRTABLE_API_KEY=... node sync.mjs

# Execute
AIRTABLE_API_KEY=... node sync.mjs --execute

# Recompute a past week
node sync.mjs --as-of 2026-08-24T16:00:00Z --execute
```

Snowflake auth is Okta `externalbrowser` (a browser window opens unless an SSO
token is cached). Airtable needs a PAT with `data.records:read`/`write` on
`appMoIgXMTTTNIc3p` — `run.sh` resolves it from the environment, then Infisical
(`prod /webflow/app-reviewer-airtable-mcp AIRTABLE_API_KEY`, an existing key
with access to this base), then
`~/.config/webflow-automation/airtable-marketplace-assets.key`.

## Schedule

`com.webflow.marketplace-insights-sync.plist` → Mondays 11:30 local (CT), which
is 16:30/17:30 UTC — after the window boundary and after the legacy sync's
~16:00–16:04 UTC write observed during the original rollout. Two independent
writers still require coordination; scheduled timing does not guarantee order.

```bash
cp com.webflow.marketplace-insights-sync.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.webflow.marketplace-insights-sync.plist
```

The dashboard's D1 mirror (GitHub Actions `webflow-dashboard-snapshot-cron`,
daily 18:30 UTC) picks the new values up the same day, no changes needed.

## Transition plan

1. Dry-run, review the receipt (row counts, top templates, unmatched sellers).
2. First `--execute` — numbers on the dashboard drop to true 30-day values
   (headline ~5.1k → ~2.3k; that is the correction, not a regression). Expect a
   one-week trend-percentage spike in the D1 history as accurate values replace
   inflated ones, and one week where D1 holds both a `16:0x` (legacy) and
   `16:00:00` (ours) snapshot for the same Monday.
3. Load the launchd job.
4. Turn off the legacy warehouse sync (Aaron Resnick's worksheet → Fivetran
   push; coordinate with the data team). Until then there are two writers: the observed timing is not an ordering
   guarantee. Inspect receipts and coordinate retirement of the legacy writer.

## Known consequences of the definition change

- "Categories tracked" drops from 778 to roughly the count of categories with
  ≥1 sale in a true 30-day window.
- `TEMPLATES_IN_SUBCATEGORY` rises (real seller counts, e.g. T&L 10 → 25) and
  `AVG_REVENUE_PER_TEMPLATE` falls accordingly (e.g. T&L $520 → ~$158). The
  dashboard's "Active Templates" tooltip may deserve a copy tweak to "templates
  with sales in the window".
- Parent categories move to the base's current taxonomy (T&L leaves
  "Business").

## Replacement safety

Source recovery adds a pre-write gate: sellers, assets and taxonomy must all be
nonempty; neither destination plan may be empty. Both table plans are checked
before any write. By default a plan cannot delete more than 25% of either
existing table. A large but intentional change requires reviewing the dry-run
receipt and explicitly passing `--max-delete-fraction <0..1>` when executing;
this option never permits empty source or empty output. Scheduled runs retain
the conservative default. `run.sh` always executes, so use `node sync.mjs` for
dry-run review.

Run `node --test sync.test.mjs` for isolated contracts. Tests substitute both
Snowflake and Airtable, make no external requests, and never use production
credentials. Runtime receipts and logs in `runs/` remain local and are excluded
from source control. No schedule installation or provider write is required to
validate the recovery.
