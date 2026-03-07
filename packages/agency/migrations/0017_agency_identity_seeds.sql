-- Seeded identity mappings for invited .agency users before first Auth0 login.
--
-- Canon: invite by email, bind by subject on first successful login.

CREATE TABLE agency_identity_seeds (
  normalized_email TEXT PRIMARY KEY,
  auth_subject TEXT,
  account_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  workspace_account_id TEXT,
  service_tier TEXT NOT NULL DEFAULT 'agency',
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

CREATE INDEX idx_agency_identity_seeds_account_id ON agency_identity_seeds(account_id);
CREATE INDEX idx_agency_identity_seeds_tenant_id ON agency_identity_seeds(tenant_id);
CREATE INDEX idx_agency_identity_seeds_auth_subject ON agency_identity_seeds(auth_subject);
