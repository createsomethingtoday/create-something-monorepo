-- Seed the platform-api-gaps category. It exists in production D1 but was
-- missing from 0002_seed.sql, so fresh bootstraps diverged from prod.
-- Idempotent (INSERT OR IGNORE); prod re-apply is a no-op.

INSERT OR IGNORE INTO categories (id, title, description, canvas_section) VALUES
  ('platform-api-gaps', 'Platform API gaps',
   'Public-API capability gaps that force browser/admin workarounds — largest true workstream by triage signal.', NULL);
