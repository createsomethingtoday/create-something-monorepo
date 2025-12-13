-- Template Versioning and Worker Tracking
-- Enables pinned template versions and dispatch namespace Workers

-- ═══════════════════════════════════════════════════════════════════════════
-- TEMPLATE VERSIONS
-- Track available versions per template for rollback/pinning
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS template_versions (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  version TEXT NOT NULL, -- semver: "1.0.0", "1.2.3"
  is_latest INTEGER DEFAULT 0,
  changelog TEXT, -- What changed in this version
  build_hash TEXT, -- Hash of the build assets
  asset_count INTEGER DEFAULT 0,
  total_size_bytes INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(template_id, version)
);

CREATE INDEX idx_template_versions_template ON template_versions(template_id);
CREATE INDEX idx_template_versions_latest ON template_versions(template_id, is_latest);

-- ═══════════════════════════════════════════════════════════════════════════
-- ADD COLUMNS TO TENANTS
-- Support version pinning and worker tracking
-- ═══════════════════════════════════════════════════════════════════════════

-- Template version pinning (null = latest)
ALTER TABLE tenants ADD COLUMN template_version TEXT;

-- Worker ID for dispatch namespace (if using WfP per-tenant Workers)
ALTER TABLE tenants ADD COLUMN worker_id TEXT;

-- Auto-update preference (default: stay on current major version)
ALTER TABLE tenants ADD COLUMN auto_update TEXT DEFAULT 'minor' CHECK (
  auto_update IN ('none', 'patch', 'minor', 'major')
);

CREATE INDEX idx_tenants_worker_id ON tenants(worker_id);
CREATE INDEX idx_tenants_template_version ON tenants(template_id, template_version);

-- ═══════════════════════════════════════════════════════════════════════════
-- ADD CURRENT_VERSION TO TEMPLATES
-- Track the latest stable version
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE templates ADD COLUMN current_version TEXT DEFAULT '1.0.0';

-- ═══════════════════════════════════════════════════════════════════════════
-- WORKER DEPLOYMENTS
-- Track Worker deployments for dispatch namespace
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS worker_deployments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  worker_name TEXT NOT NULL,
  script_hash TEXT NOT NULL,
  template_version TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'failed')),
  deployed_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, worker_name)
);

CREATE INDEX idx_worker_deployments_tenant ON worker_deployments(tenant_id);
CREATE INDEX idx_worker_deployments_status ON worker_deployments(status);
