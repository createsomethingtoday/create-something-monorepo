# Registered practice address backfill

The service-only geocode endpoint projects addresses from an explicitly pinned completed NPPES snapshot. It excludes names and phone numbers. A local SQLite checkpoint enumerates the full snapshot, verifies its count, deduplicates normalized street/city/state/ZIP/country, and sends opaque address IDs to the free US Census batch endpoint. No city-centroid or paid fallback is used.

Only exact Census matches receive address-range coordinates. Ties, unmatched, unsupported-country and incomplete addresses remain unresolved. This is a registered practice location, not a candidate home or commute origin. Census receives street addresses only; the checkpoint retains NPI/source-hash associations locally for writes back to Agency.

The checkpoint commits every source page, validated Census response and acknowledged upload. Repeating a command after a failure reuses completed results. Uploads accept up to500 unique NPIs, validate each source hash against the pinned snapshot, and write atomically with a conflict key of NPI/source hash. A pruning race writes zero rows. Older source geocode versions remain available.

`python3 scripts/backfill-nppes-geocodes.py --help` documents the required `--run-id` and `--checkpoint` inputs. Run with `AGENCY_INTERNAL_API_KEY` injected from Infisical; never pass credentials on the command line or commit the checkpoint. Use a private operator-owned checkpoint path and the same path for retries. Census defaults to1000 addresses per batch (maximum10000). Address cache entries are scoped to the job's starting calendar month.

Release after the scoped NP import/API release. This slice has no migration or paid-provider requirement. Run the full broad import first; use its successful run ID. Verify final source count equals uploaded count and matched plus unresolved count. Independently query D1 for the selected source-hash join, then exercise cross-border radius selection and the unresolved CSV. Never report geocoding completeness from code tests alone.

Rollback: redeploy the prior Agency version. The added geocode rows use the existing0049 schema and can remain. Preserve the checkpoint and pinned snapshot for resumption; do not delete source versions as a rollback shortcut.
