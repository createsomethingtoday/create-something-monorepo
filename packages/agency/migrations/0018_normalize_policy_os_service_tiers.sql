-- Normalize Policy OS service-tier storage and defaults.
--
-- Canon: service-tier values in .agency entitlement storage should use
-- mcp_only / policy_os_trial / policy_os_core instead of legacy aliases.

PRAGMA foreign_keys=OFF;

UPDATE agency_mcp_entitlements
SET service_tier = CASE
  WHEN lower(trim(service_tier)) IN ('agency', 'mcp_only', 'mcp-only', 'free', 'vertical-templates') THEN 'mcp_only'
  WHEN lower(trim(service_tier)) IN ('policy_os_trial', 'policy-os-trial', 'trial', 'pilot', 'solo', 'pro') THEN 'policy_os_trial'
  WHEN lower(trim(service_tier)) IN ('policy_os_core', 'policy-os-core', 'core', 'team', 'org') THEN 'policy_os_core'
  ELSE 'mcp_only'
END
WHERE service_tier IS NOT NULL;

UPDATE agency_identity_seeds
SET service_tier = CASE
  WHEN lower(trim(service_tier)) IN ('agency', 'mcp_only', 'mcp-only', 'free', 'vertical-templates') THEN 'mcp_only'
  WHEN lower(trim(service_tier)) IN ('policy_os_trial', 'policy-os-trial', 'trial', 'pilot', 'solo', 'pro') THEN 'policy_os_trial'
  WHEN lower(trim(service_tier)) IN ('policy_os_core', 'policy-os-core', 'core', 'team', 'org') THEN 'policy_os_core'
  ELSE 'mcp_only'
END
WHERE service_tier IS NOT NULL;

CREATE TABLE agency_mcp_entitlements_v2 (
  auth_subject TEXT PRIMARY KEY,
  auth_email TEXT,
  account_id TEXT,
  tenant_id TEXT,
  workspace_account_id TEXT,
  service_tier TEXT NOT NULL DEFAULT 'mcp_only',
  managed_bearer_allowed INTEGER NOT NULL DEFAULT 1,
  org_membership_active INTEGER NOT NULL DEFAULT 1,
  service_entitled INTEGER NOT NULL DEFAULT 1,
  policy_accepted INTEGER NOT NULL DEFAULT 1,
  contract_active INTEGER NOT NULL DEFAULT 1,
  billing_active INTEGER NOT NULL DEFAULT 1,
  denial_reason TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO agency_mcp_entitlements_v2 (
  auth_subject,
  auth_email,
  account_id,
  tenant_id,
  workspace_account_id,
  service_tier,
  managed_bearer_allowed,
  org_membership_active,
  service_entitled,
  policy_accepted,
  contract_active,
  billing_active,
  denial_reason,
  metadata_json,
  created_at,
  updated_at
)
SELECT
  auth_subject,
  auth_email,
  account_id,
  tenant_id,
  workspace_account_id,
  service_tier,
  managed_bearer_allowed,
  org_membership_active,
  service_entitled,
  policy_accepted,
  contract_active,
  billing_active,
  denial_reason,
  metadata_json,
  created_at,
  updated_at
FROM agency_mcp_entitlements;

DROP TABLE agency_mcp_entitlements;
ALTER TABLE agency_mcp_entitlements_v2 RENAME TO agency_mcp_entitlements;

CREATE INDEX idx_agency_mcp_entitlements_account_id ON agency_mcp_entitlements(account_id);
CREATE INDEX idx_agency_mcp_entitlements_tenant_id ON agency_mcp_entitlements(tenant_id);

CREATE TABLE agency_identity_seeds_v2 (
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

INSERT INTO agency_identity_seeds_v2 (
  normalized_email,
  auth_subject,
  account_id,
  tenant_id,
  workspace_account_id,
  service_tier,
  managed_bearer_allowed,
  org_membership_active,
  service_entitled,
  policy_accepted,
  contract_active,
  billing_active,
  status,
  invited_at,
  bound_at,
  metadata_json,
  created_at,
  updated_at
)
SELECT
  normalized_email,
  auth_subject,
  account_id,
  tenant_id,
  workspace_account_id,
  service_tier,
  managed_bearer_allowed,
  org_membership_active,
  service_entitled,
  policy_accepted,
  contract_active,
  billing_active,
  status,
  invited_at,
  bound_at,
  metadata_json,
  created_at,
  updated_at
FROM agency_identity_seeds;

DROP TABLE agency_identity_seeds;
ALTER TABLE agency_identity_seeds_v2 RENAME TO agency_identity_seeds;

CREATE INDEX idx_agency_identity_seeds_account_id ON agency_identity_seeds(account_id);
CREATE INDEX idx_agency_identity_seeds_tenant_id ON agency_identity_seeds(tenant_id);
CREATE INDEX idx_agency_identity_seeds_auth_subject ON agency_identity_seeds(auth_subject);

PRAGMA foreign_keys=ON;
