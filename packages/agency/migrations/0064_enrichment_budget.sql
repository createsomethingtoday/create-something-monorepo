-- Spend tracking only. Historical costs and unknown provider prices do not block dispatch.
CREATE TABLE IF NOT EXISTS npg_enrichment_requests (
 digest TEXT PRIMARY KEY CHECK(length(digest)=64),
 provider TEXT NOT NULL CHECK(provider IN('pdl','clay','exa','apify','complete')),
 subject_npi TEXT NOT NULL CHECK(length(subject_npi) IN(0,10)),
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS npg_enrichment_grants (
 reservation_id TEXT NOT NULL REFERENCES npg_enrichment_requests(digest),
 provider TEXT NOT NULL CHECK(provider IN('pdl','clay','exa','apify')),
 token_hash TEXT NOT NULL,
 consumed INTEGER NOT NULL DEFAULT 0 CHECK(consumed IN(0,1)),
 PRIMARY KEY(reservation_id,provider)
);
CREATE TABLE IF NOT EXISTS npg_enrichment_receipts (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 request_id TEXT NOT NULL,
 provider TEXT NOT NULL,
 event_id TEXT NOT NULL CHECK(length(event_id)>0 AND length(event_id)<=160),
 status TEXT NOT NULL CHECK(status IN('pending','complete','failed','uncertain')),
 actual_micros INTEGER CHECK(actual_micros>=0),
 estimated_micros INTEGER CHECK(estimated_micros>=0),
 credits REAL CHECK(credits>=0),
 credit_unit TEXT,
 receipt_ref TEXT,
 recorded_at TEXT NOT NULL,
 FOREIGN KEY(request_id,provider) REFERENCES npg_enrichment_grants(reservation_id,provider),
 UNIQUE(request_id,provider,event_id)
);
CREATE TRIGGER IF NOT EXISTS npg_requests_no_update BEFORE UPDATE ON npg_enrichment_requests BEGIN SELECT RAISE(ABORT,'Tracking request identity is immutable'); END;
CREATE TRIGGER IF NOT EXISTS npg_requests_no_delete BEFORE DELETE ON npg_enrichment_requests BEGIN SELECT RAISE(ABORT,'Tracking requests cannot be deleted'); END;
CREATE TRIGGER IF NOT EXISTS npg_receipts_no_update BEFORE UPDATE ON npg_enrichment_receipts BEGIN SELECT RAISE(ABORT,'Spend receipts are append only'); END;
CREATE TRIGGER IF NOT EXISTS npg_receipts_no_delete BEFORE DELETE ON npg_enrichment_receipts BEGIN SELECT RAISE(ABORT,'Spend receipts cannot be deleted'); END;
CREATE TRIGGER IF NOT EXISTS npg_grant_immutable BEFORE UPDATE ON npg_enrichment_grants
WHEN NEW.reservation_id<>OLD.reservation_id OR NEW.provider<>OLD.provider OR NEW.token_hash<>OLD.token_hash OR NEW.consumed<OLD.consumed
BEGIN SELECT RAISE(ABORT,'Dispatch grants cannot be reset'); END;
CREATE TRIGGER IF NOT EXISTS npg_grants_no_delete BEFORE DELETE ON npg_enrichment_grants BEGIN SELECT RAISE(ABORT,'Dispatch grants cannot be deleted'); END;
