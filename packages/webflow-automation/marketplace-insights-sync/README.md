# Marketplace Insights snapshots

Compute one complete weekly snapshot from Snowflake delivered template orders and
Airtable asset/taxonomy metadata. The default command produces a local review
artifact. No legacy leaderboard/category record is created, updated or deleted.

## Correctness contract

- Group orders by stable template ID and marketplace product ID. Join template resource IDs
  to Assets `ℹ️MRP ID` (`fldFeWROxzwzCo84b`), never by template name.
- Reject duplicate template IDs, missing identity, a seller with no creator
  email after the fallback below, conflicting asset metadata, empty sources
  (including an empty taxonomy) and invalid numeric values.
- A template may carry subcategories from more than one parent group (about
  40% of sellers do). Its leaderboard row reports the group of its first sorted
  subcategory; every subcategory still feeds its own category breakdown.
- Compute total sales, gross list revenue and selling-template count from the
  complete seller set before expanding category tags or truncating the top 160.
- A multi-tag seller contributes to each category breakdown. These overlapping
  breakdowns must never be summed into the marketplace headline.
- Publish leaderboard, category breakdown and unique totals in one Airtable
  record. Read back and validate the complete record before reporting success.
- No partial two-table replacement and no pruning of previous snapshots.

The window is 30 days ending at the latest Monday 16:00 UTC; `--as-of` can specify
another boundary. Revenue is `SUM(PRICE_VALUE)`, not a payout/net revenue measure.

## Seller source

The seller list (one row per selling template, 30-day window) comes from one
of two places. Both run the same query.

| Source | How to select | Needs |
| --- | --- | --- |
| `airtable` (recommended) | `--source airtable` or `MARKETPLACE_INSIGHTS_SOURCE=airtable` | Fivetran activation "Marketplace Insights sellers (30d) → Airtable" (sync 3666218, dataset 149094) to have written the window |
| `snowflake` (default) | nothing | a live Snowflake Okta session on this machine |

The Fivetran activation runs Mondays at 16:05 UTC, five minutes after the window
closes, and upserts on `TEMPLATE_ID` into **Marketplace Insights Sellers**
(`tblkyKZ5nGOcEqb5r`). Each run overwrites a template's row, so the table holds
only the latest window; rows for templates that stopped selling keep an older
`SNAPSHOT_AT` and are ignored. Rebuilding an older week needs `--source
snowflake`: with `--source airtable` it fails the completeness check below.
The reader uses only rows whose `SNAPSHOT_AT` equals the requested window end,
and it fails unless their count and summed sales equal `WINDOW_SELLERS` and
`WINDOW_SALES`, which the query writes on every row. A run that starts before
the activation finishes therefore fails instead of publishing a partial week.
Schedule the sync at least 30 minutes after 16:05 UTC.

## Running

From this directory, with Airtable credentials already supplied by the approved
secret manager and Snowflake CLI/SSO available:

```bash
node sync.mjs
```

Inspect `runs/snapshot-<date>.json` and its dry-run receipt. These contain private
sales/creator data, stay local, and are ignored by Git. Use a reviewed snapshot
and explicit destination configuration before execution:

```bash
node sync.mjs --execute
```

Execution fails before provider access unless
`MARKETPLACE_INSIGHTS_SNAPSHOT_TABLE_ID` identifies the approved additive table.
Its schema is documented in `AIRTABLE_PROPOSAL.md`. There are no placeholder IDs
or automatic schema changes. `run.sh` also requires that configuration and uses
its own checkout's script; it always executes. Do not use it for dry-run review.

The historical launchd definition is not part of this recovery. The existing
root checkout and active schedule remain untouched. Activating a new schedule
requires a separate verified runtime checkpoint and retiring the old writer.

## Dashboard migration

The shared snapshot reader is in `webflow-dashboard-core`. With no snapshot table
configured, existing legacy reads remain unchanged. With a table configured,
malformed, empty or unavailable snapshots fail rather than silently falling back.
Both projections share one validated snapshot within a client instance. API
responses expose the unique summary; the page rejects mixed-source/timestamp
responses, including same-week corrections, using a SHA-256 hash of the complete
validated content. New history keys use template IDs; old name-keyed history is preserved
but not attached to new identities by guessing.

Create and validate the additive table only after its proposal is approved.
Populate a reviewed snapshot before configuring the dashboard reader. Rollback
removes the reader configuration; legacy tables and historical records remain.

## Validation

```bash
node --test sync.test.mjs ../../webflow-dashboard-core/src/marketplace-snapshot.test.mjs
```

Tests mock Snowflake and Airtable without production credentials or requests.
Dashboard/core tests cover reader consistency, unique totals, identity-based
history and mixed-snapshot rejection. See `ARCHITECTURE.md` for ownership.

## Source identity verification (September 21, 2026)

Live read-only comparison found all 1,283 selling template IDs in Assets; zero
warehouse product IDs matched. Despite its label, `ℹ️MRP ID` contains template
resource IDs. The join uses this verified identity domain. Product IDs remain
separate warehouse provenance. No name fallback is permitted.

A selling template with no category at all still stops the run before
publication. Resolve that source field; do not drop the seller. Taxonomy
edits that leave a category *partially* mapped are tolerated as described
under "Taxonomy and creator-email tolerance". No Airtable records were written
during this verification.

## Remaining source-data gates

Read-only full-seller audit found 1,283 selling templates mapped to 1,290 asset
records before asset-type filtering. SmartBank (`rec0nOOH6hIItZ2uf`) has no category. The archived library
`recfCwAtG31OIBs0T` links to 96 resource IDs, including selling templates. Its
verified Library type is excluded: only linked Template type `recA2YsPEHSuAHOLD`
can supply attribution for Template orders. This requires no Airtable repair.
Archived library metadata is never treated as creator truth.

## Taxonomy and creator-email tolerance (October 13, 2026)

The category table and creator emails are edited by hand. The sync no longer
fails on the shapes that appear in practice; it substitutes and records every
substitution in the receipt so the operator can fix the source later:

| Shape | Substitution | Receipt note |
| --- | --- | --- |
| Subcategory linked to two parent groups | first linked group | `taxonomyNotes[].kind = dual-parent` |
| Same subcategory name on two rows | first row | `taxonomyNotes[].kind = duplicate-name` |
| Subcategory on a published asset with no parent group | the group its sibling subcategories use most on the same assets, else `Other` | `taxonomyNotes[].kind = unmapped` |
| Creator with linked Emails but none tagged Primary (`🎨📧 Creator Email` empty) | the creator record's own `❗👛Creator Email` | `creatorEmailNotes[]` |

An empty taxonomy is still an empty source and fails. A seller with no creator
email after the fallback still fails. Review `taxonomyNotes` and
`creatorEmailNotes` in each receipt; a non-empty list is a source-data task,
not a sync failure. On the first live run (window ending 2026-10-12) the notes
were four dual-parent subcategories, three unmapped subcategories and one
creator without a Primary email.
