CREATE TABLE IF NOT EXISTS admins (
  email TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (email) REFERENCES admins(email) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_email ON admin_sessions(email);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);

CREATE TABLE IF NOT EXISTS admin_password_resets (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_password_resets_email ON admin_password_resets(email);
CREATE INDEX IF NOT EXISTS idx_admin_password_resets_token_hash ON admin_password_resets(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_password_resets_expires_at ON admin_password_resets(expires_at);
