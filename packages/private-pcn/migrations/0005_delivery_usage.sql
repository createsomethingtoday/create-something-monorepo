CREATE TABLE network_usage (
 network_id TEXT NOT NULL REFERENCES networks(id),
 period TEXT NOT NULL,
 delivered_minutes REAL NOT NULL DEFAULT 0 CHECK(delivered_minutes>=0),
 checked_at INTEGER NOT NULL DEFAULT 0,
 lease_id TEXT,
 lease_until INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(network_id,period)
);
