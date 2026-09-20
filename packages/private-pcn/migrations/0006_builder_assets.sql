-- Composable products are separate from membership and video access.
CREATE TABLE builder_assets (
 id TEXT PRIMARY KEY,
 network_id TEXT NOT NULL REFERENCES networks(id),
 title TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('mcp','plugin','skill','workflow')),
 summary TEXT NOT NULL,
 price_cents INTEGER NOT NULL CHECK(price_cents >= 0 AND price_cents <= 999900),
 visibility TEXT NOT NULL DEFAULT 'draft' CHECK(visibility IN ('draft','published','archived')),
 audience TEXT NOT NULL DEFAULT 'members' CHECK(audience IN ('members','public')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(network_id,id)
);
CREATE TABLE asset_releases (
 id TEXT PRIMARY KEY,
 network_id TEXT NOT NULL,
 asset_id TEXT NOT NULL,
 version TEXT NOT NULL,
 manifest TEXT NOT NULL CHECK(json_valid(manifest)),
 object_key TEXT NOT NULL UNIQUE,
 sha256 TEXT NOT NULL,
 size_bytes INTEGER NOT NULL CHECK(size_bytes > 0 AND size_bytes <= 16777216),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(network_id,asset_id) REFERENCES builder_assets(network_id,id),
 UNIQUE(asset_id,version),
 UNIQUE(network_id,asset_id,id)
);
CREATE TABLE asset_entitlements (
 id TEXT PRIMARY KEY,
 network_id TEXT NOT NULL,
 asset_id TEXT NOT NULL,
 release_id TEXT NOT NULL,
 buyer_id TEXT NOT NULL,
 source TEXT NOT NULL CHECK(source IN ('free','stripe')),
 status TEXT NOT NULL CHECK(status IN ('active','revoked')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(network_id,asset_id,release_id) REFERENCES asset_releases(network_id,asset_id,id),
 UNIQUE(buyer_id,release_id)
);
CREATE INDEX asset_catalog ON builder_assets(network_id,visibility);
CREATE INDEX buyer_collection ON asset_entitlements(buyer_id,status);
CREATE TRIGGER builder_asset_capacity BEFORE INSERT ON builder_assets
WHEN (SELECT count(*) FROM builder_assets WHERE network_id=NEW.network_id)>=50
BEGIN SELECT RAISE(ABORT,'asset_capacity'); END;
CREATE TRIGGER asset_release_capacity BEFORE INSERT ON asset_releases
WHEN (SELECT count(*) FROM asset_releases WHERE asset_id=NEW.asset_id)>=5
BEGIN SELECT RAISE(ABORT,'release_capacity'); END;
CREATE TRIGGER immutable_asset_release BEFORE UPDATE ON asset_releases
BEGIN SELECT RAISE(ABORT,'immutable_release'); END;

-- Reserve storage capacity before object writes. Uncertain writes remain recoverable.
CREATE TABLE asset_uploads (
 id TEXT PRIMARY KEY,
 network_id TEXT NOT NULL,
 asset_id TEXT NOT NULL,
 version TEXT NOT NULL,
 manifest TEXT NOT NULL CHECK(json_valid(manifest)),
 object_key TEXT NOT NULL UNIQUE,
 sha256 TEXT NOT NULL,
 size_bytes INTEGER NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(network_id,asset_id) REFERENCES builder_assets(network_id,id),
 UNIQUE(asset_id,version)
);
CREATE TRIGGER asset_upload_capacity BEFORE INSERT ON asset_uploads
WHEN (SELECT count(*) FROM asset_releases WHERE asset_id=NEW.asset_id)
   + (SELECT count(*) FROM asset_uploads WHERE asset_id=NEW.asset_id)>=5
BEGIN SELECT RAISE(ABORT,'release_capacity'); END;
CREATE TRIGGER asset_upload_version BEFORE INSERT ON asset_uploads
WHEN EXISTS(SELECT 1 FROM asset_releases WHERE asset_id=NEW.asset_id AND version=NEW.version)
BEGIN SELECT RAISE(ABORT,'release_exists'); END;
