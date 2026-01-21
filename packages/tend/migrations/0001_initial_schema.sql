-- Sieve: AI-native database schema
-- Multi-tenant, human-in-the-loop data curation

-- =============================================================================
-- TENANTS (Workspaces)
-- =============================================================================

CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    tier TEXT NOT NULL DEFAULT 'demo' CHECK (tier IN ('demo', 'database', 'enterprise')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    settings TEXT DEFAULT '{}' -- JSON: feature flags, preferences
);

CREATE INDEX idx_tenants_slug ON tenants(slug);

-- =============================================================================
-- SOURCES (Integration connections)
-- =============================================================================

CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'gmail', 'slack', 'quickbooks', 'stripe', 'demo'
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error', 'demo')),
    config TEXT DEFAULT '{}', -- JSON: OAuth tokens (encrypted), sync settings
    last_sync_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_sources_tenant ON sources(tenant_id);
CREATE INDEX idx_sources_type ON sources(type);

-- =============================================================================
-- ITEMS (The unified data model)
-- =============================================================================

CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    
    -- Core fields
    title TEXT NOT NULL,
    body TEXT, -- No character limit (unlike Notion!)
    source_type TEXT NOT NULL, -- Denormalized for fast filtering
    source_item_id TEXT, -- Original ID in source system
    
    -- Timestamps
    source_timestamp TEXT, -- When it happened in source system
    ingested_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Metadata (flexible JSON)
    metadata TEXT DEFAULT '{}', -- Source-specific fields: from, labels, thread_id, etc.
    
    -- Scoring & curation
    score REAL DEFAULT 0.5, -- 0.0 to 1.0, computed by automations
    score_breakdown TEXT DEFAULT '{}', -- JSON: why this score (explainability)
    
    -- Human curation state
    status TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox', 'approved', 'dismissed', 'snoozed', 'archived')),
    curated_by TEXT, -- User ID who curated
    curated_at TEXT,
    snooze_until TEXT,
    
    -- Full-text search
    search_text TEXT, -- Concatenated searchable content
    
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_items_tenant ON items(tenant_id);
CREATE INDEX idx_items_source ON items(source_id);
CREATE INDEX idx_items_status ON items(tenant_id, status);
CREATE INDEX idx_items_score ON items(tenant_id, score DESC);
CREATE INDEX idx_items_source_timestamp ON items(tenant_id, source_timestamp DESC);
CREATE INDEX idx_items_source_item ON items(source_id, source_item_id);

-- =============================================================================
-- AUTOMATIONS (Transform, filter, score rules)
-- =============================================================================

CREATE TABLE IF NOT EXISTS automations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Configuration
    source_type TEXT, -- NULL = all sources
    trigger_type TEXT NOT NULL DEFAULT 'on_ingest' CHECK (trigger_type IN ('on_ingest', 'scheduled', 'manual')),
    
    -- The automation logic (stored as code reference or inline config)
    logic_type TEXT NOT NULL DEFAULT 'config' CHECK (logic_type IN ('config', 'code')),
    logic TEXT NOT NULL, -- JSON config or code path
    
    -- State
    enabled INTEGER NOT NULL DEFAULT 1,
    last_run_at TEXT,
    run_count INTEGER DEFAULT 0,
    
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_automations_tenant ON automations(tenant_id);

-- =============================================================================
-- AUTOMATION_RUNS (Execution history)
-- =============================================================================

CREATE TABLE IF NOT EXISTS automation_runs (
    id TEXT PRIMARY KEY,
    automation_id TEXT NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    
    items_processed INTEGER DEFAULT 0,
    items_modified INTEGER DEFAULT 0,
    
    error TEXT,
    
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_automation_runs_automation ON automation_runs(automation_id);

-- =============================================================================
-- AGENTS (Enterprise only: reasoning automations)
-- =============================================================================

CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Configuration
    trigger_type TEXT NOT NULL DEFAULT 'on_match' CHECK (trigger_type IN ('on_match', 'scheduled', 'manual')),
    trigger_config TEXT DEFAULT '{}', -- JSON: matching rules
    
    -- Agent definition
    task TEXT NOT NULL, -- The reasoning prompt
    tools TEXT DEFAULT '[]', -- JSON array of allowed tools
    
    -- Output configuration
    requires_approval INTEGER NOT NULL DEFAULT 1,
    allowed_actions TEXT DEFAULT '[]', -- JSON array of action types
    
    -- State
    enabled INTEGER NOT NULL DEFAULT 1,
    
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_agents_tenant ON agents(tenant_id);

-- =============================================================================
-- AGENT_EXECUTIONS (Agent run history with full trace)
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_executions (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    triggered_by_item_id TEXT REFERENCES items(id) ON DELETE SET NULL,
    
    -- Execution state
    status TEXT NOT NULL DEFAULT 'thinking' CHECK (status IN ('thinking', 'awaiting_approval', 'approved', 'rejected', 'completed', 'failed')),
    
    -- Reasoning trace (full observability)
    steps TEXT DEFAULT '[]', -- JSON array of reasoning steps
    tool_calls TEXT DEFAULT '[]', -- JSON array of tool invocations
    
    -- Output
    result TEXT, -- JSON: the agent's output
    proposed_actions TEXT DEFAULT '[]', -- JSON: actions awaiting approval
    
    -- Human review
    reviewed_by TEXT,
    reviewed_at TEXT,
    review_notes TEXT,
    
    -- Timing
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_agent_executions_agent ON agent_executions(agent_id);
CREATE INDEX idx_agent_executions_tenant ON agent_executions(tenant_id);
CREATE INDEX idx_agent_executions_status ON agent_executions(tenant_id, status);

-- =============================================================================
-- DEMO DATA (Pre-loaded for Database tier)
-- =============================================================================

-- Demo tenant
INSERT OR IGNORE INTO tenants (id, name, slug, tier) VALUES 
    ('demo-tenant', 'Demo Workspace', 'demo', 'demo');

-- Demo sources
INSERT OR IGNORE INTO sources (id, tenant_id, type, name, status) VALUES
    ('demo-gmail', 'demo-tenant', 'gmail', 'Gmail (Demo)', 'demo'),
    ('demo-slack', 'demo-tenant', 'slack', 'Slack (Demo)', 'demo'),
    ('demo-quickbooks', 'demo-tenant', 'quickbooks', 'QuickBooks (Demo)', 'demo');

-- Demo items (sample data)
INSERT OR IGNORE INTO items (id, tenant_id, source_id, title, body, source_type, source_item_id, source_timestamp, metadata, score, status) VALUES
    ('demo-item-1', 'demo-tenant', 'demo-gmail', 'Invoice #1234 from Acme Corp', 'Please find attached invoice for $5,000 for consulting services rendered in January 2026.', 'gmail', 'msg-001', datetime('now', '-2 hours'), '{"from": "billing@acmecorp.com", "labels": ["IMPORTANT", "INBOX"], "has_attachment": true}', 0.85, 'inbox'),
    ('demo-item-2', 'demo-tenant', 'demo-slack', '@channel: Deployment complete', 'Production deployment v2.4.1 completed successfully. All systems nominal.', 'slack', 'msg-002', datetime('now', '-4 hours'), '{"channel": "#engineering", "author": "deploy-bot", "thread_count": 3}', 0.6, 'inbox'),
    ('demo-item-3', 'demo-tenant', 'demo-quickbooks', 'Payment received: $2,500', 'Payment received from Beta Startup LLC for Invoice #1189.', 'quickbooks', 'txn-003', datetime('now', '-6 hours'), '{"type": "payment", "customer": "Beta Startup LLC", "invoice_id": "1189"}', 0.7, 'inbox'),
    ('demo-item-4', 'demo-tenant', 'demo-gmail', 'Newsletter: TechCrunch Daily', 'Top stories in tech today: AI advances, startup funding rounds, and more.', 'gmail', 'msg-004', datetime('now', '-8 hours'), '{"from": "newsletters@techcrunch.com", "labels": ["CATEGORY_PROMOTIONS"]}', 0.2, 'inbox'),
    ('demo-item-5', 'demo-tenant', 'demo-slack', 'Quick sync needed on Q1 planning', 'Hey team, can we grab 15 minutes this afternoon to align on Q1 priorities?', 'slack', 'msg-005', datetime('now', '-1 hours'), '{"channel": "#leadership", "author": "Sarah Chen", "mentions": ["@channel"]}', 0.75, 'inbox'),
    ('demo-item-6', 'demo-tenant', 'demo-gmail', 'Contract renewal reminder', 'Your annual subscription with CloudTools Pro expires in 30 days. Review renewal options.', 'gmail', 'msg-006', datetime('now', '-12 hours'), '{"from": "renewals@cloudtools.io", "labels": ["INBOX"]}', 0.5, 'inbox'),
    ('demo-item-7', 'demo-tenant', 'demo-quickbooks', 'Expense: Software subscription', 'Monthly charge for Figma Team ($45.00).', 'quickbooks', 'txn-007', datetime('now', '-24 hours'), '{"type": "expense", "vendor": "Figma", "category": "Software"}', 0.3, 'inbox'),
    ('demo-item-8', 'demo-tenant', 'demo-gmail', 'Partnership inquiry from Gamma Ventures', 'We''ve been following your work and would love to explore partnership opportunities. Are you available for a call next week?', 'gmail', 'msg-008', datetime('now', '-3 hours'), '{"from": "partnerships@gammaventures.com", "labels": ["IMPORTANT", "INBOX"]}', 0.9, 'inbox');
