-- The old partner_percent=95 column remains historical; new support contracts use
-- this explicit policy. No live support subscriptions existed at activation.
ALTER TABLE support_workspaces ADD COLUMN settlement_policy TEXT NOT NULL
 DEFAULT 'net_processing_75_v1' CHECK(settlement_policy='net_processing_75_v1');
CREATE TABLE support_settlements (
 charge_id TEXT PRIMARY KEY,
 invoice_id TEXT NOT NULL,
 network_id TEXT NOT NULL REFERENCES networks(id),
 partner_id TEXT NOT NULL,
 destination TEXT NOT NULL,
 policy TEXT NOT NULL CHECK(policy='net_processing_75_v1'),
 gross INTEGER NOT NULL CHECK(gross=90000),
 processing_fee INTEGER NOT NULL CHECK(processing_fee>=0 AND processing_fee<=gross),
 partner_amount INTEGER NOT NULL CHECK(partner_amount>=0),
 transfer_id TEXT UNIQUE,
 reversed_amount INTEGER NOT NULL DEFAULT 0 CHECK(reversed_amount>=0),
 state TEXT NOT NULL DEFAULT 'pending',
 lease_id TEXT,
 lease_until INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX support_settlements_network ON support_settlements(network_id);
