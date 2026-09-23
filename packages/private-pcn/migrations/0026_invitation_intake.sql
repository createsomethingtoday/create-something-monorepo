-- An introduction is not enrollment, membership, or creator approval.
CREATE TABLE invitation_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  intent TEXT NOT NULL CHECK(intent IN ('learn','create','both')),
  practice TEXT NOT NULL,
  work_url TEXT NOT NULL DEFAULT '',
  referral TEXT NOT NULL DEFAULT '',
  consent_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewed','closed')),
  review_note TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT,
  revision INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(email, intent)
);
CREATE INDEX invitation_requests_queue ON invitation_requests(status, created_at);
CREATE TABLE invitation_request_decisions (
  id INTEGER PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES invitation_requests(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT NOT NULL,
  reviewer TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER invitation_request_review AFTER UPDATE OF status, review_note ON invitation_requests
BEGIN
  INSERT INTO invitation_request_decisions(request_id,status,note,reviewer)
  VALUES(NEW.id,NEW.status,NEW.review_note,NEW.reviewed_by);
END;
