import type { DeliveryComponentKind } from './types.js';

export type SQLExecutor = {
  exec(query: string): Promise<unknown>;
};

export const DELIVERY_COMPONENT_KINDS: DeliveryComponentKind[] = ['site', 'platform', 'product'];

export async function initializeD1Schema(db: SQLExecutor): Promise<void> {
  await db.exec(D1_SCHEMA_SQL);
}

export const D1_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS delivery_clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  industry TEXT,
  owner_contact_id TEXT,
  status TEXT DEFAULT 'active',
  metadata TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS delivery_contacts (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES delivery_clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  metadata TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS delivery_engagements (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES delivery_clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('lead', 'sold', 'onboarding', 'building', 'qa', 'live', 'managed', 'paused', 'complete')),
  start_date TEXT,
  target_launch_date TEXT,
  commercial_owner TEXT,
  delivery_owner TEXT,
  summary TEXT,
  metadata TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS delivery_components (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES delivery_engagements(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('site', 'platform', 'product')),
  status TEXT NOT NULL CHECK (status IN ('planned', 'building', 'blocked', 'qa', 'live', 'deprecated')),
  brand TEXT,
  live_url TEXT,
  repo_url TEXT,
  depends_on_component_id TEXT REFERENCES delivery_components(id) ON DELETE SET NULL,
  summary TEXT,
  metadata TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS delivery_artifacts (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES delivery_engagements(id) ON DELETE CASCADE,
  component_id TEXT REFERENCES delivery_components(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'review', 'approved', 'sent', 'signed', 'paid')),
  source_system TEXT NOT NULL CHECK (source_system IN ('notion', 'native', 'external')),
  source_url TEXT,
  visibility TEXT NOT NULL CHECK (visibility IN ('internal', 'client', 'operator')),
  summary TEXT,
  metadata TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS delivery_milestones (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES delivery_engagements(id) ON DELETE CASCADE,
  component_id TEXT REFERENCES delivery_components(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'blocked', 'done', 'cancelled')),
  target_date TEXT,
  completed_at TEXT,
  summary TEXT,
  metadata TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS delivery_integrations (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  purpose TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('read', 'write', 'bidirectional')),
  status TEXT NOT NULL CHECK (status IN ('needed', 'requested', 'connected', 'failing', 'disabled')),
  owner TEXT,
  notes TEXT,
  metadata TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS delivery_environments (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  url TEXT,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'failed', 'retired')),
  metadata TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS delivery_deployments (
  id TEXT PRIMARY KEY,
  environment_id TEXT NOT NULL REFERENCES delivery_environments(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  deployed_at TEXT NOT NULL,
  rollback_ref TEXT,
  notes TEXT,
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS delivery_contracts (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES delivery_engagements(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'approved', 'signed', 'paid', 'overdue', 'cancelled')),
  amount_cents INTEGER,
  signed_at TEXT,
  source_url TEXT,
  metadata TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS delivery_invoices (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES delivery_engagements(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount_cents INTEGER,
  status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'approved', 'signed', 'paid', 'overdue', 'cancelled')),
  issued_at TEXT,
  paid_at TEXT,
  source_url TEXT,
  metadata TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS delivery_subscriptions (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES delivery_engagements(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  monthly_amount_cents INTEGER,
  status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'approved', 'signed', 'paid', 'overdue', 'cancelled')),
  start_date TEXT,
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS delivery_access_items (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  system TEXT NOT NULL,
  access_type TEXT NOT NULL,
  owner TEXT,
  status TEXT NOT NULL CHECK (status IN ('needed', 'requested', 'granted', 'rotating', 'revoked')),
  notes TEXT,
  metadata TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS delivery_risks (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES delivery_engagements(id) ON DELETE CASCADE,
  component_id TEXT REFERENCES delivery_components(id) ON DELETE SET NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL CHECK (status IN ('open', 'mitigating', 'closed')),
  summary TEXT NOT NULL,
  owner TEXT,
  metadata TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS delivery_decisions (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES delivery_engagements(id) ON DELETE CASCADE,
  component_id TEXT REFERENCES delivery_components(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  decision TEXT NOT NULL,
  rationale TEXT,
  decided_at TEXT,
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS delivery_support_plans (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES delivery_engagements(id) ON DELETE CASCADE,
  response_sla TEXT,
  coverage TEXT,
  owner TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'paused', 'retired')),
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS delivery_site_pages (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  page_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'draft', 'review', 'live', 'retired')),
  owner TEXT,
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS delivery_content_assets (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'draft', 'review', 'live', 'retired')),
  source_url TEXT,
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS delivery_forms (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  destination TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'connected', 'failing', 'retired')),
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS delivery_domains (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  dns_status TEXT NOT NULL CHECK (dns_status IN ('pending', 'active', 'failed')),
  ssl_status TEXT NOT NULL CHECK (ssl_status IN ('pending', 'active', 'failed')),
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS delivery_analytics_properties (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  property_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('needed', 'connected', 'failing', 'disabled')),
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS delivery_ad_destinations (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  campaign_goal TEXT NOT NULL,
  landing_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'paused', 'retired')),
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS delivery_roles (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS delivery_entitlements (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES delivery_roles(id) ON DELETE CASCADE,
  surface TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed INTEGER NOT NULL DEFAULT 1,
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS delivery_user_journeys (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  audience TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'deprecated')),
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS delivery_operator_workflows (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  owner TEXT,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'blocked', 'deprecated')),
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS delivery_content_collections (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'retired')),
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS delivery_support_channels (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  owner TEXT,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'paused', 'retired')),
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS delivery_mcp_servers (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  transport TEXT NOT NULL CHECK (transport IN ('hosted_mcp', 'streamable_http', 'stdio')),
  endpoint TEXT,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'failing', 'retired')),
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS delivery_mcp_capabilities (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL REFERENCES delivery_mcp_servers(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('tool', 'resource', 'prompt')),
  name TEXT NOT NULL,
  description TEXT,
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS delivery_connected_systems (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  read_scope TEXT,
  write_scope TEXT,
  status TEXT NOT NULL CHECK (status IN ('needed', 'requested', 'connected', 'failing', 'disabled')),
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS delivery_auth_policies (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  auth_model TEXT NOT NULL,
  credential_owner TEXT,
  rotation_owner TEXT,
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS delivery_approval_policies (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  action_class TEXT NOT NULL,
  approval_required INTEGER NOT NULL DEFAULT 1,
  policy_artifact_url TEXT,
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS delivery_tool_scopes (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL REFERENCES delivery_mcp_servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  reads_data INTEGER NOT NULL DEFAULT 1,
  writes_data INTEGER NOT NULL DEFAULT 0,
  human_approval_required INTEGER NOT NULL DEFAULT 0,
  metadata TEXT DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_delivery_clients_slug ON delivery_clients(slug);
CREATE INDEX IF NOT EXISTS idx_delivery_engagements_client_status ON delivery_engagements(client_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_components_engagement_kind ON delivery_components(engagement_id, kind);
CREATE INDEX IF NOT EXISTS idx_delivery_artifacts_engagement_visibility ON delivery_artifacts(engagement_id, visibility);
CREATE INDEX IF NOT EXISTS idx_delivery_milestones_component_status ON delivery_milestones(component_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_integrations_component_status ON delivery_integrations(component_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_risks_engagement_status ON delivery_risks(engagement_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_mcp_servers_component_status ON delivery_mcp_servers(component_id, status);
`;

export const POSTGRES_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS delivery_clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  industry TEXT,
  owner_contact_id TEXT,
  status TEXT DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_contacts (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES delivery_clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_engagements (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES delivery_clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('lead', 'sold', 'onboarding', 'building', 'qa', 'live', 'managed', 'paused', 'complete')),
  start_date DATE,
  target_launch_date DATE,
  commercial_owner TEXT,
  delivery_owner TEXT,
  summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_components (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES delivery_engagements(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('site', 'platform', 'product')),
  status TEXT NOT NULL CHECK (status IN ('planned', 'building', 'blocked', 'qa', 'live', 'deprecated')),
  brand TEXT,
  live_url TEXT,
  repo_url TEXT,
  depends_on_component_id TEXT REFERENCES delivery_components(id) ON DELETE SET NULL,
  summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_artifacts (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES delivery_engagements(id) ON DELETE CASCADE,
  component_id TEXT REFERENCES delivery_components(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'review', 'approved', 'sent', 'signed', 'paid')),
  source_system TEXT NOT NULL CHECK (source_system IN ('notion', 'native', 'external')),
  source_url TEXT,
  visibility TEXT NOT NULL CHECK (visibility IN ('internal', 'client', 'operator')),
  summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_milestones (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES delivery_engagements(id) ON DELETE CASCADE,
  component_id TEXT REFERENCES delivery_components(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'blocked', 'done', 'cancelled')),
  target_date DATE,
  completed_at TIMESTAMPTZ,
  summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_integrations (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  purpose TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('read', 'write', 'bidirectional')),
  status TEXT NOT NULL CHECK (status IN ('needed', 'requested', 'connected', 'failing', 'disabled')),
  owner TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_environments (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  url TEXT,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'failed', 'retired')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_deployments (
  id TEXT PRIMARY KEY,
  environment_id TEXT NOT NULL REFERENCES delivery_environments(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  deployed_at TIMESTAMPTZ NOT NULL,
  rollback_ref TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS delivery_contracts (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES delivery_engagements(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'approved', 'signed', 'paid', 'overdue', 'cancelled')),
  amount_cents BIGINT,
  signed_at TIMESTAMPTZ,
  source_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_invoices (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES delivery_engagements(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount_cents BIGINT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'approved', 'signed', 'paid', 'overdue', 'cancelled')),
  issued_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  source_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_subscriptions (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES delivery_engagements(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  monthly_amount_cents BIGINT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'approved', 'signed', 'paid', 'overdue', 'cancelled')),
  start_date DATE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS delivery_access_items (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  system TEXT NOT NULL,
  access_type TEXT NOT NULL,
  owner TEXT,
  status TEXT NOT NULL CHECK (status IN ('needed', 'requested', 'granted', 'rotating', 'revoked')),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_risks (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES delivery_engagements(id) ON DELETE CASCADE,
  component_id TEXT REFERENCES delivery_components(id) ON DELETE SET NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL CHECK (status IN ('open', 'mitigating', 'closed')),
  summary TEXT NOT NULL,
  owner TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_decisions (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES delivery_engagements(id) ON DELETE CASCADE,
  component_id TEXT REFERENCES delivery_components(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  decision TEXT NOT NULL,
  rationale TEXT,
  decided_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS delivery_support_plans (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES delivery_engagements(id) ON DELETE CASCADE,
  response_sla TEXT,
  coverage TEXT,
  owner TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'paused', 'retired')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS delivery_site_pages (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  page_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'draft', 'review', 'live', 'retired')),
  owner TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS delivery_content_assets (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'draft', 'review', 'live', 'retired')),
  source_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS delivery_forms (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  destination TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'connected', 'failing', 'retired')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS delivery_domains (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  dns_status TEXT NOT NULL CHECK (dns_status IN ('pending', 'active', 'failed')),
  ssl_status TEXT NOT NULL CHECK (ssl_status IN ('pending', 'active', 'failed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS delivery_analytics_properties (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  property_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('needed', 'connected', 'failing', 'disabled')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS delivery_ad_destinations (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  campaign_goal TEXT NOT NULL,
  landing_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'paused', 'retired')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS delivery_roles (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS delivery_entitlements (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES delivery_roles(id) ON DELETE CASCADE,
  surface TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS delivery_user_journeys (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  audience TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'deprecated')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS delivery_operator_workflows (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  owner TEXT,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'blocked', 'deprecated')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS delivery_content_collections (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'retired')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS delivery_support_channels (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  owner TEXT,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'paused', 'retired')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS delivery_mcp_servers (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  transport TEXT NOT NULL CHECK (transport IN ('hosted_mcp', 'streamable_http', 'stdio')),
  endpoint TEXT,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'failing', 'retired')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS delivery_mcp_capabilities (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL REFERENCES delivery_mcp_servers(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('tool', 'resource', 'prompt')),
  name TEXT NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS delivery_connected_systems (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  read_scope TEXT,
  write_scope TEXT,
  status TEXT NOT NULL CHECK (status IN ('needed', 'requested', 'connected', 'failing', 'disabled')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS delivery_auth_policies (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  auth_model TEXT NOT NULL,
  credential_owner TEXT,
  rotation_owner TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS delivery_approval_policies (
  id TEXT PRIMARY KEY,
  component_id TEXT NOT NULL REFERENCES delivery_components(id) ON DELETE CASCADE,
  action_class TEXT NOT NULL,
  approval_required BOOLEAN NOT NULL DEFAULT TRUE,
  policy_artifact_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS delivery_tool_scopes (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL REFERENCES delivery_mcp_servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  reads_data BOOLEAN NOT NULL DEFAULT TRUE,
  writes_data BOOLEAN NOT NULL DEFAULT FALSE,
  human_approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_delivery_clients_slug ON delivery_clients(slug);
CREATE INDEX IF NOT EXISTS idx_delivery_engagements_client_status ON delivery_engagements(client_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_components_engagement_kind ON delivery_components(engagement_id, kind);
CREATE INDEX IF NOT EXISTS idx_delivery_artifacts_engagement_visibility ON delivery_artifacts(engagement_id, visibility);
CREATE INDEX IF NOT EXISTS idx_delivery_milestones_component_status ON delivery_milestones(component_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_integrations_component_status ON delivery_integrations(component_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_risks_engagement_status ON delivery_risks(engagement_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_mcp_servers_component_status ON delivery_mcp_servers(component_id, status);
`;
