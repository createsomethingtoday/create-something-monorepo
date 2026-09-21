# Marketplace Insights snapshots

Compute one complete weekly snapshot from Snowflake delivered template orders and
Airtable asset/taxonomy metadata. The default command produces a local review
artifact. No legacy leaderboard/category record is created, updated or deleted.

## Correctness contract

- Group orders by stable template ID and marketplace product ID. Join product IDs
  to Assets `ℹ️MRP ID` (`fldFeWROxzwzCo84b`), never by template name.
- Reject duplicate template IDs, missing identity/creator/taxonomy mappings,
  conflicting asset metadata, empty sources and invalid numeric values.
- Compute total sales, gross list revenue and selling-template count from the
  complete seller set before expanding category tags or truncating the top 160.
- A multi-tag seller contributes to each category breakdown. These overlapping
  breakdowns must never be summed into the marketplace headline.
- Publish leaderboard, category breakdown and unique totals in one Airtable
  record. Read back and validate the complete record before reporting success.
- No partial two-table replacement and no pruning of previous snapshots.

The window is 30 days ending at the latest Monday 16:00 UTC; `--as-of` can specify
another boundary. Revenue is `SUM(PRICE_VALUE)`, not a payout/net revenue measure.

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
responses. New history keys use template IDs; old name-keyed history is preserved
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

## Current activation gate (September 21, 2026)

A real read-only dry-run reached Snowflake and Airtable, then rejected a selling
product without an Assets product-ID mapping. No snapshot was published. Resolve
the authoritative mapping before a publication attempt; do not guess by name or
drop unmatched sellers to make the run pass. The additive table also requires
explicit schema approval. No reader or schedule has been activated.
