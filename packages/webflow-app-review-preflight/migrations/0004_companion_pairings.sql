CREATE TABLE companion_pairings (
  id TEXT PRIMARY KEY,
  code_sha256 TEXT NOT NULL UNIQUE,
  review_id TEXT NOT NULL,
  review_version_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  actor_site_id TEXT,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('developer', 'reviewer')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  redeemed_at TEXT,
  FOREIGN KEY (review_id) REFERENCES reviews(id),
  FOREIGN KEY (review_version_id) REFERENCES review_versions(id)
);

CREATE INDEX companion_pairings_code_lookup
  ON companion_pairings(code_sha256, expires_at, redeemed_at);

CREATE TABLE companion_sessions (
  id TEXT PRIMARY KEY,
  token_sha256 TEXT NOT NULL UNIQUE,
  pairing_id TEXT NOT NULL UNIQUE,
  review_id TEXT NOT NULL,
  review_version_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  actor_site_id TEXT,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('developer', 'reviewer')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (pairing_id) REFERENCES companion_pairings(id),
  FOREIGN KEY (review_id) REFERENCES reviews(id),
  FOREIGN KEY (review_version_id) REFERENCES review_versions(id)
);

CREATE INDEX companion_sessions_token_lookup
  ON companion_sessions(token_sha256, expires_at, revoked_at);
