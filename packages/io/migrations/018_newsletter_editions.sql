-- Runtime state belongs here; Linear remains the coordination and approval evidence index.
CREATE TABLE IF NOT EXISTS newsletter_editions (
 slug TEXT PRIMARY KEY, title TEXT NOT NULL, subject TEXT NOT NULL,
 owner TEXT NOT NULL, author TEXT NOT NULL, source_refs TEXT NOT NULL DEFAULT '[]',
 html TEXT NOT NULL DEFAULT '', text TEXT NOT NULL DEFAULT '', content_hash TEXT,
 editorial_status TEXT NOT NULL DEFAULT 'draft', web_status TEXT NOT NULL DEFAULT 'draft',
 web_url TEXT, send_at TEXT, approved_by TEXT, approved_at TEXT, approved_hash TEXT,
 audience_fingerprint TEXT, audience_count INTEGER NOT NULL DEFAULT 0,
 seed_email_id TEXT, seed_status TEXT, seed_hash TEXT,
 email_status TEXT NOT NULL DEFAULT 'not-sent', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS newsletter_edition_deliveries (
 id TEXT PRIMARY KEY, edition_slug TEXT NOT NULL REFERENCES newsletter_editions(slug),
 content_hash TEXT NOT NULL, subscriber_key TEXT NOT NULL, kind TEXT NOT NULL,
 status TEXT NOT NULL, resend_email_id TEXT UNIQUE, subject TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 error_code TEXT, recipient_hash TEXT, UNIQUE(edition_slug,content_hash,subscriber_key,kind)
);
CREATE TABLE IF NOT EXISTS newsletter_edition_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT, edition_slug TEXT NOT NULL,
 action TEXT NOT NULL, actor TEXT NOT NULL, content_hash TEXT, details TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO newsletter_editions (slug,title,subject,owner,author,source_refs,web_status,web_url,email_status) VALUES
 ('2026-09-01-the-interface-is-becoming-executable','The interface is becoming executable','The interface is becoming executable','Micah Johnson','CREATE SOMETHING','["packages/io/content/newsletters/2026-09-01-the-interface-is-becoming-executable/production-receipt.md","packages/io/content/newsletters/2026-09-08-test-the-checker/engagement-review.md"]','published','https://createsomething.io/newsletters/2026-09-01-the-interface-is-becoming-executable','historical'),
 ('2026-09-03-the-receipt-must-name-the-state','The receipt must name the state','The new bottleneck is proof','Micah Johnson','CREATE SOMETHING','["packages/io/content/newsletters/2026-09-03-the-receipt-must-name-the-state/production-receipt.md"]','draft',NULL,'not-sent'),
 ('2026-09-08-test-the-checker','Test the checker before trusting the result','Test the checker before trusting the result','Micah Johnson','CREATE SOMETHING','["packages/io/content/newsletters/2026-09-08-test-the-checker/research-notes.md"]','draft',NULL,'not-sent');
-- Historical September 7 readback. No fresh provider verification or new approval is implied.
INSERT OR IGNORE INTO newsletter_edition_deliveries(id,edition_slug,content_hash,subscriber_key,kind,status,resend_email_id,subject) VALUES
 ('historical-sept1-1','2026-09-01-the-interface-is-becoming-executable','historical','historical-1','historical-audience','historical-delivered','bdb288f4-ba0f-40eb-b0db-303ca0ba9f36','The interface is becoming executable'),
 ('historical-sept1-2','2026-09-01-the-interface-is-becoming-executable','historical','historical-2','historical-audience','historical-delivered','02ac98bc-4570-4035-9856-a68d7e180175','The interface is becoming executable');
