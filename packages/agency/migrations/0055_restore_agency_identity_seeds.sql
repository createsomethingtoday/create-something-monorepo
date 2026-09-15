-- Restore the canonical authority table on installations where migration
-- history and actual schema diverged. Matches the normalized 0018 schema.
-- Existing seeds are preserved. This migration provisions no user, role,
-- entitlement, credential, or policy acceptance. Rollback retains the table.

CREATE TABLE IF NOT EXISTS agency_identity_seeds (
  normalized_email TEXT PRIMARY KEY,
  auth_subject TEXT,
  account_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  workspace_account_id TEXT,
  service_tier TEXT NOT NULL DEFAULT 'mcp_only',
  managed_bearer_allowed INTEGER NOT NULL DEFAULT 1,
  org_membership_active INTEGER NOT NULL DEFAULT 1,
  service_entitled INTEGER NOT NULL DEFAULT 1,
  policy_accepted INTEGER NOT NULL DEFAULT 0,
  contract_active INTEGER NOT NULL DEFAULT 1,
  billing_active INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'seeded',
  invited_at TEXT,
  bound_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agency_identity_seeds_account_id ON agency_identity_seeds(account_id);
CREATE INDEX IF NOT EXISTS idx_agency_identity_seeds_tenant_id ON agency_identity_seeds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agency_identity_seeds_auth_subject ON agency_identity_seeds(auth_subject);
