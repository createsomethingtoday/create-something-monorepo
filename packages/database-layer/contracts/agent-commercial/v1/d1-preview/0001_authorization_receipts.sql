CREATE TABLE IF NOT EXISTS agent_commercial_authorization_receipts (
  decision_id TEXT PRIMARY KEY,
  receipt_id TEXT NOT NULL UNIQUE,
  contract_id TEXT NOT NULL,
  capability_id TEXT NOT NULL,
  principal_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('allow', 'deny', 'payment_required', 'approval_required')),
  reason TEXT NOT NULL,
  entitlement_or_payment_ref TEXT,
  approval_receipt_id TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('authorized', 'blocked')),
  environment TEXT NOT NULL CHECK (environment IN ('preview', 'production')),
  occurred_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_commercial_receipts_capability_time
  ON agent_commercial_authorization_receipts(capability_id, occurred_at);
