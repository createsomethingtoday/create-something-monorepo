-- Healthcare provider coverage snapshots sourced from the public NPPES registry.
-- This data describes provider enumeration and practice-location records. It is
-- not proof of current licensure, employment, availability, or outreach consent.

CREATE TABLE IF NOT EXISTS abundance_healthcare_providers (
  id TEXT PRIMARY KEY,
  npi TEXT NOT NULL UNIQUE,
  enumeration_type TEXT,
  name TEXT NOT NULL,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  credential TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'deactivated', 'unknown')),
  enumeration_date TEXT,
  last_updated_date TEXT,
  certification_date TEXT,
  primary_taxonomy_code TEXT,
  primary_taxonomy_description TEXT,
  license_state TEXT,
  license_number TEXT,
  taxonomies_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(taxonomies_json)),
  practice_address_1 TEXT,
  practice_address_2 TEXT,
  practice_city TEXT,
  practice_state TEXT,
  practice_postal_code TEXT,
  practice_country TEXT,
  practice_phone TEXT,
  endpoint_count INTEGER NOT NULL DEFAULT 0,
  source_system TEXT NOT NULL,
  source_payload_hash TEXT NOT NULL,
  source_fetched_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_abundance_healthcare_providers_persona
  ON abundance_healthcare_providers (
    primary_taxonomy_description,
    practice_state,
    practice_city
  );

CREATE INDEX IF NOT EXISTS idx_abundance_healthcare_providers_source_fetched
  ON abundance_healthcare_providers (source_fetched_at);

CREATE INDEX IF NOT EXISTS idx_abundance_healthcare_providers_last_updated
  ON abundance_healthcare_providers (last_updated_date);

CREATE TABLE IF NOT EXISTS abundance_healthcare_provider_ingestion_runs (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL,
  persona_label TEXT NOT NULL,
  taxonomy_description TEXT NOT NULL,
  state TEXT,
  city TEXT,
  postal_code TEXT,
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed')),
  fetched_at TEXT NOT NULL,
  pages_fetched INTEGER NOT NULL DEFAULT 0,
  source_result_count INTEGER NOT NULL DEFAULT 0,
  normalized_count INTEGER NOT NULL DEFAULT 0,
  included_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  excluded_count INTEGER NOT NULL DEFAULT 0,
  coverage_limit_reached INTEGER NOT NULL DEFAULT 0
    CHECK (coverage_limit_reached IN (0, 1)),
  error TEXT,
  finished_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_abundance_healthcare_provider_runs_persona
  ON abundance_healthcare_provider_ingestion_runs (persona_id, fetched_at);

CREATE TABLE IF NOT EXISTS abundance_healthcare_provider_ingestion_memberships (
  run_id TEXT NOT NULL,
  provider_npi TEXT NOT NULL,
  provider_snapshot_json TEXT NOT NULL CHECK (json_valid(provider_snapshot_json)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (run_id, provider_npi),
  FOREIGN KEY (run_id) REFERENCES abundance_healthcare_provider_ingestion_runs(id),
  FOREIGN KEY (provider_npi) REFERENCES abundance_healthcare_providers(npi)
);

CREATE INDEX IF NOT EXISTS idx_abundance_healthcare_provider_memberships_npi
  ON abundance_healthcare_provider_ingestion_memberships (provider_npi);

CREATE TRIGGER IF NOT EXISTS abundance_healthcare_providers_updated_at
AFTER UPDATE ON abundance_healthcare_providers
FOR EACH ROW
BEGIN
  UPDATE abundance_healthcare_providers
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.id;
END;
