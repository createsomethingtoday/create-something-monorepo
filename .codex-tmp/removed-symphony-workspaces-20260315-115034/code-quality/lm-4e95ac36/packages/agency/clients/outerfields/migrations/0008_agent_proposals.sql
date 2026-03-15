-- Agent Proposals table for human-in-the-loop approval workflow
-- All agent-suggested changes must go through this queue
CREATE TABLE IF NOT EXISTS agent_proposals (
  id TEXT PRIMARY KEY,
  
  -- Proposal classification
  change_type TEXT NOT NULL CHECK (change_type IN (
    'preview_duration',
    'cta_text', 
    'spacing_adjustment',
    'element_visibility',
    'animation_timing',
    'feature_flag_toggle',
    'content_order',
    'gate_messaging'
  )),
  impact_level TEXT NOT NULL CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
  
  -- Proposal content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  justification TEXT NOT NULL,        -- Data-backed reasoning
  
  -- Change details (JSON)
  current_value TEXT NOT NULL,        -- JSON: current state
  proposed_value TEXT NOT NULL,       -- JSON: proposed state
  rollback_plan TEXT NOT NULL,        -- How to undo
  
  -- Impact estimates
  affected_users_estimate INTEGER,
  conversion_impact_estimate REAL,
  
  -- Source pattern (what triggered this proposal)
  source_pattern_id TEXT,
  source_evidence TEXT,               -- JSON: supporting data
  
  -- Status workflow
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'approved', 
    'rejected',
    'applied',
    'rolled_back'
  )),
  
  -- Review tracking
  reviewed_at INTEGER,
  reviewed_by TEXT,
  reviewer_notes TEXT,
  
  -- Application tracking
  applied_at INTEGER,
  applied_by TEXT,
  
  -- Rollback tracking
  rolled_back_at INTEGER,
  rolled_back_by TEXT,
  rollback_reason TEXT,
  
  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  
  -- Auto-approval settings
  auto_approve_after INTEGER,         -- Unix timestamp when auto-approve kicks in (for low impact)
  
  FOREIGN KEY (source_pattern_id) REFERENCES patterns(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_proposals_status ON agent_proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_impact ON agent_proposals(impact_level);
CREATE INDEX IF NOT EXISTS idx_proposals_change_type ON agent_proposals(change_type);
CREATE INDEX IF NOT EXISTS idx_proposals_created ON agent_proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_pending ON agent_proposals(status, created_at DESC) WHERE status = 'pending';

-- Audit Log table for complete traceability
-- Records every action: proposals, approvals, rejections, applications, rollbacks
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  
  -- Actor information
  actor_type TEXT NOT NULL CHECK (actor_type IN ('agent', 'human', 'system')),
  actor_id TEXT NOT NULL,             -- Agent ID, user email, or 'system'
  
  -- Action details
  action TEXT NOT NULL CHECK (action IN (
    'propose',
    'approve',
    'reject',
    'modify',
    'apply',
    'rollback',
    'override',
    'escalate',
    'dismiss'
  )),
  
  -- Target
  target_type TEXT NOT NULL,          -- 'proposal', 'rule', 'feature_flag', 'pattern'
  target_id TEXT NOT NULL,
  
  -- Details (JSON)
  details TEXT NOT NULL,              -- JSON with action-specific details
  before_state TEXT,                  -- JSON: state before action
  after_state TEXT,                   -- JSON: state after action
  
  -- Context
  reason TEXT,                        -- Why this action was taken
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamp
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

-- Escalations table for issues that exceed agent guardrails
-- When agent detects a pattern but can't propose a fix, it escalates
CREATE TABLE IF NOT EXISTS escalations (
  id TEXT PRIMARY KEY,
  
  -- Source
  source_pattern_id TEXT,
  
  -- Escalation details
  title TEXT NOT NULL,
  analysis TEXT NOT NULL,             -- Agent's analysis of the issue
  suggested_action TEXT NOT NULL,     -- What the agent thinks should be done
  why_blocked TEXT NOT NULL,          -- Why the agent couldn't handle this
  
  -- Priority
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  
  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'dismissed')),
  
  -- Human response
  assigned_to TEXT,
  response TEXT,
  resolution TEXT,
  
  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  resolved_at INTEGER,
  
  FOREIGN KEY (source_pattern_id) REFERENCES patterns(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(status);
CREATE INDEX IF NOT EXISTS idx_escalations_priority ON escalations(priority);
CREATE INDEX IF NOT EXISTS idx_escalations_open ON escalations(status, priority DESC) WHERE status = 'open';

-- Applied Changes table for tracking what's currently active
-- Enables one-click rollback
CREATE TABLE IF NOT EXISTS applied_changes (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  
  -- Change details
  change_type TEXT NOT NULL,
  target TEXT NOT NULL,               -- What was changed (e.g., 'config:preview_duration')
  
  -- State tracking
  before_value TEXT NOT NULL,         -- JSON: previous state (for rollback)
  after_value TEXT NOT NULL,          -- JSON: current state
  
  -- Status
  is_active INTEGER DEFAULT 1,        -- 1 = active, 0 = rolled back
  
  -- Timestamps
  applied_at INTEGER NOT NULL,
  applied_by TEXT NOT NULL,           -- 'agent' or user email
  rolled_back_at INTEGER,
  rolled_back_by TEXT,
  
  FOREIGN KEY (proposal_id) REFERENCES agent_proposals(id)
);

CREATE INDEX IF NOT EXISTS idx_applied_active ON applied_changes(is_active) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_applied_proposal ON applied_changes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_applied_type ON applied_changes(change_type);
