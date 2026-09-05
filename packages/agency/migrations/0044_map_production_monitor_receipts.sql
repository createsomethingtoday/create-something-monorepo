CREATE TABLE IF NOT EXISTS map_production_monitor_receipts (
  receipt_id TEXT PRIMARY KEY,
  schema_version INTEGER NOT NULL CHECK (schema_version = 1),
  trigger TEXT NOT NULL CHECK (trigger = 'scheduled'),
  scheduled_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  source_sha TEXT NOT NULL,
  worker_version TEXT NOT NULL,
  base_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed')),
  complete INTEGER NOT NULL CHECK (complete IN (0, 1)),
  customer_data_used INTEGER NOT NULL CHECK (customer_data_used = 0),
  agent_mutation_used INTEGER NOT NULL CHECK (agent_mutation_used = 0),
  booking_submitted INTEGER NOT NULL CHECK (booking_submitted = 0),
  checks_json TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS map_production_monitor_receipts_scheduled_unique
  ON map_production_monitor_receipts(trigger, scheduled_at);

CREATE INDEX IF NOT EXISTS map_production_monitor_receipts_scheduled_at
  ON map_production_monitor_receipts(scheduled_at);

CREATE TABLE IF NOT EXISTS map_production_monitor_alerts (
  alert_id TEXT PRIMARY KEY,
  schema_version INTEGER NOT NULL CHECK (schema_version = 1),
  failure_streak_started_at TEXT NOT NULL,
  threshold_receipt_id TEXT NOT NULL,
  source_sha TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('SEV-2', 'SEV-3')),
  failed_check_codes_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('pending', 'delivering', 'delivered')),
  delivery_attempts INTEGER NOT NULL CHECK (delivery_attempts >= 0),
  delivery_lease_expires_at TEXT,
  delivery_claim_token TEXT,
  notification_revision INTEGER NOT NULL CHECK (notification_revision >= 1),
  streak_resolved_at TEXT,
  delivered_at TEXT,
  last_delivery_error_code TEXT
);

CREATE INDEX IF NOT EXISTS map_production_monitor_alerts_delivery_status
  ON map_production_monitor_alerts(delivery_status, created_at);
