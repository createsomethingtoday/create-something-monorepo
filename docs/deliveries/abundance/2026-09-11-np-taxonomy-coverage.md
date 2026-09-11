# NP taxonomy coverage

NPG sourcing can search comma-separated NP taxonomy codes with OR semantics, including secondary specialties. `363LF0000X,363LA2200X,363LG0600X` searches registered Family, Adult Health and Gerontology specialties. These classifications do not prove FNP/AGNP certification. `license_state=NY` matches a recorded license state; active licensure remains unverified.

The import keeps NPI-1 records with any `363L` NP taxonomy and preserves the original primary taxonomy. Legacy market coverage still filters primary Family NP records. Every run and source receipt records `primary_family_np` or `all_np_taxonomies`; weekly increments require a completed base with the same scope. The original receipt ledger is preserved, and retention keeps two completed snapshots per scope. Rejected normalization rows prevent finalization.

Broader sourcing remains unavailable until a successful broad import exists. A requested historical primary-FNP snapshot cannot answer an Adult Health or Gerontology query. Sourcing includes `taxonomy_scope` and source publication date. CSV exports use the same filters without UI pagination. Sourcing selects the latest broad snapshot when available; legacy coverage selects by source publication freshness. Pin `run_id` across a sourcing/routing workflow.

## Release and validation

Apply Agency migration `0053_abundance_np_taxonomy_scope.sql` before deploying the source/API changes. Deploy Healthcare MCP1.5.0 and refresh its downstream inventory. Run the Abundance Healthcare Nationwide Sync workflow with `source_kind=monthly_full`, `taxonomy_scope=all_np_taxonomies`, followed by the current weekly files. Scheduled sync now defaults to broad NP scope. Do not treat code deployment as a completed population import.

Check the scoped source receipts, processed row count, rejected count (must be zero), provider count and source SHA256. Independently compare primary-FNP and secondary specialty counts. Query Albany with the three codes and compare the CSV row count to the API total. Then backfill registered practice addresses before claiming complete radius coverage.

Rollback: redeploy the prior Agency release and Healthcare1.4.0; pause the sync workflow first. Retain migration0053 and immutable snapshots/receipts. Do not run the old importer against the scoped receipt model without reconciling its ledger. No secrets belong in this document or workflow logs.
