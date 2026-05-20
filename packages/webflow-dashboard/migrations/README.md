# Webflow Dashboard D1 Migrations

The production `webflow-dashboard-db` ledger currently includes both
`004_marketplace_snapshots.sql` and `004_asset_drafts.sql`. Keep both checked in,
including the duplicate `004` prefix, so a new database can reproduce the applied
production migration set.

Marketplace snapshot schema note:

- Existing production tables use the legacy key columns `entry_key` and
  `category_key`, plus `created_at`.
- The checked-in `004_marketplace_snapshots.sql` creates the canonical
  `record_key` schema with freshness columns.
- Runtime marketplace history code supports both schemas. Future migrations
  should use `005_...` or higher and must remain additive for both legacy and
  canonical marketplace tables.
