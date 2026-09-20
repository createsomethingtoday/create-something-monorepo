ALTER TABLE networks ADD COLUMN kind TEXT NOT NULL DEFAULT 'creator' CHECK(kind IN ('creator','support'));
CREATE TABLE support_partners (
 subject TEXT PRIMARY KEY REFERENCES creator_applications(subject),
 approved INTEGER NOT NULL DEFAULT 0 CHECK(approved IN (0,1)),
 account_id TEXT UNIQUE,
 review_note TEXT NOT NULL,
 reviewed_by TEXT NOT NULL,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE support_partner_history (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 subject TEXT NOT NULL, approved INTEGER NOT NULL, note TEXT NOT NULL, reviewer TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER support_partner_review_insert AFTER INSERT ON support_partners BEGIN
 INSERT INTO support_partner_history(subject,approved,note,reviewer) VALUES(NEW.subject,NEW.approved,NEW.review_note,NEW.reviewed_by);
END;
CREATE TRIGGER support_partner_review_update AFTER UPDATE OF approved ON support_partners BEGIN
 INSERT INTO support_partner_history(subject,approved,note,reviewer) VALUES(NEW.subject,NEW.approved,NEW.review_note,NEW.reviewed_by);
END;
CREATE TABLE support_workspaces (
 network_id TEXT PRIMARY KEY REFERENCES networks(id),
 owner_id TEXT NOT NULL UNIQUE,
 partner_id TEXT NOT NULL REFERENCES support_partners(subject),
 company TEXT NOT NULL,
 workflow TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','agreed','declined','closed')),
 amount INTEGER NOT NULL DEFAULT 90000 CHECK(amount=90000),
 partner_percent INTEGER NOT NULL DEFAULT 95 CHECK(partner_percent=95),
 accepted_at TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE support_updates (
 id TEXT PRIMARY KEY,
 network_id TEXT NOT NULL REFERENCES support_workspaces(network_id),
 author TEXT NOT NULL,
 body TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE support_partners ADD COLUMN country TEXT;
ALTER TABLE support_partners ADD COLUMN creation_key TEXT;
ALTER TABLE support_partners ADD COLUMN creation_started INTEGER NOT NULL DEFAULT 0;
ALTER TABLE support_partners ADD COLUMN lease_id TEXT;
ALTER TABLE support_partners ADD COLUMN lease_until INTEGER NOT NULL DEFAULT 0;
