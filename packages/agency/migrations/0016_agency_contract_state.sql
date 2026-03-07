-- Explicit contract ledger for .agency entitlement reconciliation
--
-- Canon: contract posture should survive webhook gaps, billing lag, and manual commercial review.

CREATE TABLE agency_contract_state (
  id TEXT PRIMARY KEY,
  auth_subject TEXT,
  normalized_email TEXT,
  account_id TEXT,
  tenant_id TEXT,
  contract_reference TEXT NOT NULL UNIQUE,
  contract_status TEXT NOT NULL CHECK (contract_status IN ('draft', 'pending', 'active', 'paused', 'expired', 'terminated')),
  contract_active INTEGER NOT NULL DEFAULT 0,
  service_entitled INTEGER NOT NULL DEFAULT 0,
  policy_accepted INTEGER NOT NULL DEFAULT 0,
  effective_at TEXT,
  expires_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_agency_contract_state_auth_subject
  ON agency_contract_state(auth_subject);

CREATE INDEX idx_agency_contract_state_email
  ON agency_contract_state(normalized_email);

CREATE INDEX idx_agency_contract_state_account
  ON agency_contract_state(account_id, tenant_id);
