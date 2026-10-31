-- Durable inquiry routing, committed atomically with the receipt.
-- Additive: old application versions ignore this table safely.
CREATE TABLE IF NOT EXISTS contact_request_attribution (
  request_id TEXT PRIMARY KEY REFERENCES contact_request_receipts(request_id),
  source TEXT NOT NULL,
  campaign TEXT,
  intent TEXT NOT NULL,
  lane TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS contact_attribution_campaign_created
  ON contact_request_attribution(campaign, created_at);
