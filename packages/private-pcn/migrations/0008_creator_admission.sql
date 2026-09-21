CREATE TABLE creator_applications (
  subject TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  credentials TEXT NOT NULL,
  teaching_video_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','suspended')),
  revision INTEGER NOT NULL DEFAULT 0,
  review_note TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX creator_application_queue ON creator_applications(status, created_at);

CREATE TABLE creator_review_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,
  review_note TEXT NOT NULL,
  reviewer TEXT NOT NULL,
  revision INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER creator_review_receipt AFTER UPDATE OF revision ON creator_applications
WHEN NEW.reviewed_by IS NOT NULL AND NEW.revision <> OLD.revision
BEGIN
  INSERT INTO creator_review_history(subject,status,review_note,reviewer,revision)
  VALUES(NEW.subject,NEW.status,NEW.review_note,NEW.reviewed_by,NEW.revision);
END;
CREATE TABLE creator_invitations (
  token_hash TEXT PRIMARY KEY,
  sponsor TEXT NOT NULL REFERENCES creator_applications(subject),
  recipient_email TEXT NOT NULL,
  redeemed_by TEXT UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  redeemed_at TEXT
);
CREATE INDEX creator_invitation_sponsor ON creator_invitations(sponsor);
CREATE TABLE creator_trials (
  subject TEXT PRIMARY KEY REFERENCES creator_applications(subject),
  network_id TEXT NOT NULL UNIQUE REFERENCES networks(id),
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL
);
