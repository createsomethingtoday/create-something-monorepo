-- Add client scoping so one broker can serve all clients safely.

ALTER TABLE delivery_packages ADD COLUMN client_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_delivery_packages_client_id ON delivery_packages(client_id);

ALTER TABLE delivery_events ADD COLUMN client_id TEXT;
CREATE INDEX IF NOT EXISTS idx_delivery_events_client_id ON delivery_events(client_id);

