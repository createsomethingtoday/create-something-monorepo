-- Owner-private metadata only. No search text, candidate identifiers, addresses or CSV contents.
CREATE TABLE IF NOT EXISTS npg_registry_export_events (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  requested_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('requested','prepared','failed'))
);
CREATE INDEX IF NOT EXISTS npg_registry_export_owner ON npg_registry_export_events(owner_id,requested_at);
