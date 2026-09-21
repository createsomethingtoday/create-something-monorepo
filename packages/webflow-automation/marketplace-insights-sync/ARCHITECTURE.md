# Marketplace Insights snapshot recovery

Concept: one complete weekly marketplace snapshot.

Current interface: Snowflake groups sellers by name; two Airtable tables are upserted and pruned independently; dashboard totals are summed from overlapping categories.

Problem: identical names conflate creators, multiple category tags multiply headline sales, and failed/empty sources can erase output.

Proposed interface: one versioned record with stable template IDs, marketplace totals from the complete seller set, top-160 leaderboard and category breakdowns. One record write publishes all parts. Existing two-table consumers remain unchanged until the new reader is explicitly configured.

Tier ownership: Database owns the immutable source IDs and versioned snapshot schema; Automation owns grouping, projection, validation and atomic record publication; Judgment owns activation and rejecting ambiguous/missing inputs.

Leverage: both dashboard readers and the sync use the same validation contract. Locality: snapshot parsing and identity rules live in dashboard-core, with no hidden name-based fallback for new snapshots.

Test surface: pure projection/serialization contracts, mocked CLI provider calls, dashboard summary/history tests, and consumer typechecks. No live sync is needed to validate code.

Migration: create one additive Airtable snapshot table after approval, review a dry run, populate one snapshot, then enable its table ID in the dashboard. Do not mutate legacy tables or activate the retained launchd job. Rollback removes the new reader configuration; the legacy source and historical snapshots remain intact. No table deletion is necessary.
