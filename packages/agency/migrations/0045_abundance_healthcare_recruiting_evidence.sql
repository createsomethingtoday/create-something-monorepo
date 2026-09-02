-- Fail-closed verification facts for promotion from NPPES market discovery to
-- NPG recruiter readiness. The table stores the fact and provenance of a
-- verification, never the underlying contact value or private candidate data.

CREATE TABLE IF NOT EXISTS abundance_healthcare_provider_recruiting_evidence (
  id TEXT PRIMARY KEY,
  provider_npi TEXT NOT NULL,
  evidence_kind TEXT NOT NULL CHECK (evidence_kind IN (
    'license_or_privilege',
    'discipline',
    'exclusion',
    'practice_or_employment',
    'contact_route',
    'outreach_authority',
    'recruiter_approval'
  )),
  source_system TEXT NOT NULL CHECK (source_system IN (
    'missouri_board_or_nursys',
    'cms_doctors_and_clinicians',
    'oig_leie',
    'npg_first_party'
  )),
  outcome TEXT NOT NULL CHECK (outcome IN ('passed', 'failed')),
  verified_at TEXT NOT NULL,
  valid_through TEXT NOT NULL,
  reference_id TEXT,
  source_payload_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_npi) REFERENCES abundance_healthcare_providers(npi)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_abundance_healthcare_recruiting_evidence_receipt
  ON abundance_healthcare_provider_recruiting_evidence (
    provider_npi,
    evidence_kind,
    source_system,
    verified_at
  );

CREATE INDEX IF NOT EXISTS idx_abundance_healthcare_recruiting_evidence_current
  ON abundance_healthcare_provider_recruiting_evidence (
    provider_npi,
    evidence_kind,
    verified_at DESC,
    valid_through DESC
  );
