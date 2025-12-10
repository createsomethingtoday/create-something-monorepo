-- Templates Platform Database Schema
-- Multi-tenant site hosting for CREATE SOMETHING

-- ═══════════════════════════════════════════════════════════════════════════
-- USERS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'agency')),
  site_limit INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users(email);

-- ═══════════════════════════════════════════════════════════════════════════
-- SESSIONS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- TEMPLATES (metadata, actual templates are in verticals packages)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  subcategories TEXT, -- JSON array
  thumbnail TEXT,
  preview_url TEXT,
  pricing TEXT, -- JSON object
  features TEXT, -- JSON array
  design_philosophy TEXT, -- JSON object
  config_schema TEXT, -- JSON object defining required/optional fields
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_templates_slug ON templates(slug);
CREATE INDEX idx_templates_category ON templates(category);

-- ═══════════════════════════════════════════════════════════════════════════
-- TENANTS (deployed sites)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES templates(id),
  subdomain TEXT UNIQUE NOT NULL,
  custom_domain TEXT UNIQUE,
  status TEXT DEFAULT 'configuring' CHECK (status IN (
    'configuring', 'queued', 'building', 'deploying', 'active', 'suspended', 'error'
  )),
  config TEXT NOT NULL, -- JSON object with site configuration
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deployed_at TEXT
);

CREATE INDEX idx_tenants_user_id ON tenants(user_id);
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_custom_domain ON tenants(custom_domain);
CREATE INDEX idx_tenants_status ON tenants(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- DEPLOYMENTS (build/deploy history)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS deployments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'building', 'deployed', 'failed')),
  build_log TEXT,
  config_snapshot TEXT, -- JSON snapshot of config at deploy time
  deployed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_deployments_tenant_id ON deployments(tenant_id);
CREATE INDEX idx_deployments_status ON deployments(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- CUSTOM DOMAINS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS custom_domains (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  domain TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'verifying', 'active', 'failed'
  )),
  verification_token TEXT,
  ssl_status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  verified_at TEXT
);

CREATE INDEX idx_custom_domains_tenant_id ON custom_domains(tenant_id);
CREATE INDEX idx_custom_domains_domain ON custom_domains(domain);

-- ═══════════════════════════════════════════════════════════════════════════
-- ANALYTICS (basic usage tracking)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS site_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  bandwidth_mb REAL DEFAULT 0,
  UNIQUE(tenant_id, date)
);

CREATE INDEX idx_site_analytics_tenant_date ON site_analytics(tenant_id, date);
