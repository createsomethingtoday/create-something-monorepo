-- App Governance & Transparency database layer
-- Canonical store for app-review governance findings, Slack-sourced items,
-- categorization, notifications, and agent sync state.
-- Narrative context: Slack canvas F0BB96552KG (App Review · Governance & Transparency Tracker).

CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL,            -- slack_channel | slack_canvas | airtable | zendesk | doc
  external_id TEXT NOT NULL,            -- e.g. C05KPSPTPFT, F0BB96552KG, app1Q0o9xw2Zny7gw
  name TEXT NOT NULL,
  workspace TEXT,                       -- e.g. webflow.enterprise.slack.com
  atlas_canvas_id TEXT,                 -- AI Interaction Atlas canvas this source feeds
  atlas_node_id TEXT,                   -- Atlas node within the canvas
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source_type, external_id)
);

-- Agent-mediated sync high-water marks. For Slack channels cursor_value is the
-- newest message ts recorded; the syncing agent reads newer messages only.
CREATE TABLE IF NOT EXISTS sync_cursors (
  source_type TEXT NOT NULL,
  source_external_id TEXT NOT NULL,
  cursor_value TEXT,
  last_synced_at TEXT,
  synced_by TEXT,                       -- agent/session identifier
  metadata_json TEXT,
  PRIMARY KEY (source_type, source_external_id)
);

-- Categorization taxonomy. Seeded from the tracker canvas workstreams (§1–§8)
-- plus triage-ops for channel-native marketplace operations traffic.
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,                  -- slug
  title TEXT NOT NULL,
  description TEXT,
  canvas_section TEXT,
  atlas_node_id TEXT,                   -- Atlas node this workstream maps to
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS findings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  summary TEXT,
  category_id TEXT REFERENCES categories(id),
  status TEXT NOT NULL DEFAULT 'flagged',   -- flagged | in_progress | needs_decision | shipped | parked
  priority TEXT,                            -- P0 | P1 | P2 | P3
  decision_needed INTEGER NOT NULL DEFAULT 0,
  decision_summary TEXT,
  owner TEXT,
  app_name TEXT,
  app_client_id TEXT,
  created_by TEXT NOT NULL DEFAULT 'agent',
  verified_by_reviewer INTEGER NOT NULL DEFAULT 0,
  airtable_record_id TEXT,                  -- link back to App Review Governance Findings (app1Q0o9xw2Zny7gw)
  atlas_canvas_id TEXT,                     -- Atlas canvas/node this finding is pinned to
  atlas_node_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Raw synced content (Slack messages, canvas sections, tickets). Idempotent on
-- (source_id, external_id); Slack external_id convention is "<channel>:<ts>".
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL REFERENCES sources(id),
  external_id TEXT NOT NULL,
  thread_ts TEXT,
  author TEXT,
  posted_at TEXT,
  text TEXT,
  permalink TEXT,
  payload_json TEXT,
  triage_state TEXT NOT NULL DEFAULT 'new', -- new | categorized | linked | ignored
  category_id TEXT REFERENCES categories(id),
  finding_id INTEGER REFERENCES findings(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source_id, external_id)
);

CREATE TABLE IF NOT EXISTS links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  finding_id INTEGER NOT NULL REFERENCES findings(id),
  kind TEXT NOT NULL,                   -- zendesk | airtable | slack_thread | doc | app | other
  url TEXT NOT NULL,
  label TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Outbound notification queue. Agents queue; a human or agent with Slack access
-- delivers and marks the outcome. Delivery evidence, not fire-and-forget.
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  finding_id INTEGER REFERENCES findings(id),
  target TEXT NOT NULL,                 -- slack channel/user, email, etc.
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',-- queued | sent | skipped | failed
  queued_by TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Append-only audit of every write performed through the MCP boundary.
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  payload_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_items_triage ON items (triage_state);
CREATE INDEX IF NOT EXISTS idx_items_finding ON items (finding_id);
CREATE INDEX IF NOT EXISTS idx_items_thread ON items (thread_ts);
CREATE INDEX IF NOT EXISTS idx_findings_status ON findings (status);
CREATE INDEX IF NOT EXISTS idx_findings_category ON findings (category_id);
CREATE INDEX IF NOT EXISTS idx_findings_decision ON findings (decision_needed);
CREATE INDEX IF NOT EXISTS idx_links_finding ON links (finding_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications (status);
CREATE INDEX IF NOT EXISTS idx_events_entity ON events (entity_type, entity_id);
