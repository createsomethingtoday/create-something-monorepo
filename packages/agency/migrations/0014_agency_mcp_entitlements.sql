-- Managed MCP bearer entitlement registry for .agency
--
-- Canon: Auth0 establishes identity; .agency determines whether that identity is commercially and operationally entitled.

CREATE TABLE agency_mcp_entitlements (
  auth_subject TEXT PRIMARY KEY,
  auth_email TEXT,
  account_id TEXT,
  tenant_id TEXT,
  workspace_account_id TEXT,
  service_tier TEXT NOT NULL DEFAULT 'agency',
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

CREATE INDEX idx_agency_mcp_entitlements_account_id ON agency_mcp_entitlements(account_id);
CREATE INDEX idx_agency_mcp_entitlements_tenant_id ON agency_mcp_entitlements(tenant_id);
