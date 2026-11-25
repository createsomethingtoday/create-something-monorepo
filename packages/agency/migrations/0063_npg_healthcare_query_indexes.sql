-- Keep national coverage statistics on narrow index pages and satisfy the
-- existing coalesced-date/NPI ordering without sorting wide provider snapshots.
-- This index stores no additional source payload or contact fields and does
-- not change snapshot selection, taxonomy membership, or recruiting evidence.
CREATE INDEX IF NOT EXISTS idx_abundance_healthcare_nationwide_coverage
  ON abundance_healthcare_nationwide_memberships (
    run_id,
    primary_taxonomy_code,
    coalesce(last_updated_date, '') DESC,
    provider_npi,
    provider_status,
    last_updated_date,
    practice_has_location,
    practice_has_phone,
    license_has_fields,
    endpoint_count
  );
