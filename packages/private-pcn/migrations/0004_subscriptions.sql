CREATE TABLE network_billing (
 network_id TEXT PRIMARY KEY REFERENCES networks(id),
 customer_id TEXT UNIQUE,
 subscription_id TEXT UNIQUE,
 checkout_id TEXT UNIQUE,
 checkout_key TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'none',
 period_end INTEGER NOT NULL DEFAULT 0,
 checked_at INTEGER NOT NULL DEFAULT 0,
 cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
 lease_id TEXT,
 lease_until INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE billing_events (
 event_id TEXT PRIMARY KEY,
 network_id TEXT NOT NULL REFERENCES networks(id),
 event_type TEXT NOT NULL,
 processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
