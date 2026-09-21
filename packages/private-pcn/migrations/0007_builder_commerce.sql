CREATE TABLE seller_accounts (
 owner_id TEXT PRIMARY KEY,
 account_id TEXT UNIQUE,
 creation_key TEXT NOT NULL UNIQUE,
 creation_started INTEGER NOT NULL DEFAULT 0,
 contact_email TEXT NOT NULL,
 display_name TEXT NOT NULL,
 country TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'not_started',
 charges_ready INTEGER NOT NULL DEFAULT 0,
 payouts_ready INTEGER NOT NULL DEFAULT 0,
 checked_at INTEGER NOT NULL DEFAULT 0,
 lease_id TEXT,
 lease_until INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE asset_orders (
 id TEXT PRIMARY KEY,
 network_id TEXT NOT NULL,
 asset_id TEXT NOT NULL,
 release_id TEXT NOT NULL,
 buyer_id TEXT NOT NULL,
 buyer_email TEXT NOT NULL,
 seller_id TEXT NOT NULL,
 account_id TEXT NOT NULL,
 title TEXT NOT NULL,
 amount INTEGER NOT NULL CHECK(amount >= 100 AND amount <= 999900),
 currency TEXT NOT NULL DEFAULT 'usd' CHECK(currency='usd'),
 checkout_id TEXT UNIQUE,
 checkout_key TEXT NOT NULL UNIQUE,
 checkout_started INTEGER NOT NULL DEFAULT 0,
 payment_intent_id TEXT,
 status TEXT NOT NULL DEFAULT 'pending',
 license_accepted_at INTEGER NOT NULL DEFAULT (unixepoch()),
 checked_at INTEGER NOT NULL DEFAULT 0,
 lease_id TEXT,
 lease_until INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(network_id,asset_id,release_id) REFERENCES asset_releases(network_id,asset_id,id),
 UNIQUE(buyer_id,release_id)
);
CREATE INDEX orders_seller ON asset_orders(account_id,payment_intent_id);
CREATE TABLE commerce_events (
 id TEXT PRIMARY KEY,
 account_id TEXT NOT NULL,
 type TEXT NOT NULL,
 processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
