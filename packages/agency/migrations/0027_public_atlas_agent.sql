CREATE TABLE IF NOT EXISTS public_atlas_sessions (
  id TEXT PRIMARY KEY,
  email_hash TEXT,
  readiness_slug TEXT NOT NULL,
  readiness_score INTEGER NOT NULL DEFAULT 0,
  canvas_json TEXT NOT NULL,
  summary TEXT,
  source TEXT NOT NULL DEFAULT 'agency-public-atlas',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_public_atlas_sessions_updated_at
  ON public_atlas_sessions(updated_at);

CREATE INDEX IF NOT EXISTS idx_public_atlas_sessions_email_hash
  ON public_atlas_sessions(email_hash);

CREATE TABLE IF NOT EXISTS public_atlas_agent_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  rate_key TEXT NOT NULL,
  email_hash TEXT,
  event_type TEXT NOT NULL,
  message_chars INTEGER NOT NULL DEFAULT 0,
  mutation_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES public_atlas_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_public_atlas_agent_events_session_id
  ON public_atlas_agent_events(session_id);

CREATE INDEX IF NOT EXISTS idx_public_atlas_agent_events_rate_key_created_at
  ON public_atlas_agent_events(rate_key, created_at);

CREATE INDEX IF NOT EXISTS idx_public_atlas_agent_events_email_hash_created_at
  ON public_atlas_agent_events(email_hash, created_at);
