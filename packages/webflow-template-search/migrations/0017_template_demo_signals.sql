-- Technical matching signals computed from each template's public demo homepage
-- (website_url, the *.webflow.io demo). Published on view=full search items so third parties can match
-- a live site to a template without crawling demo sites. See README
-- "Demo site signals" and src/demo-signals.ts.
--
-- demo_signals_json:         DemoSignals JSON, or NULL when never resolved.
-- demo_signals_synced_at:    last successful fetch; NULL until the first success.
-- demo_signals_attempted_at: last attempt (success or failure); gates retries so
--                            a 404 demo is not re-fetched every hour.
ALTER TABLE template_documents ADD COLUMN demo_signals_json TEXT;
ALTER TABLE template_documents ADD COLUMN demo_signals_synced_at TEXT;
ALTER TABLE template_documents ADD COLUMN demo_signals_attempted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_template_documents_demo_signals_attempted
  ON template_documents (demo_signals_attempted_at);
