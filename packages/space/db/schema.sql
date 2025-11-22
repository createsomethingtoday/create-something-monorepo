-- Create Something Terminal - D1 Database Schema
-- Cloudflare D1 uses SQLite

-- Papers table
CREATE TABLE IF NOT EXISTS papers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  html_content TEXT,
  reading_time INTEGER DEFAULT 0,
  difficulty_level TEXT,
  technical_focus TEXT,
  published_on TEXT,
  excerpt_short TEXT,
  excerpt_long TEXT,
  slug TEXT UNIQUE NOT NULL,
  featured INTEGER DEFAULT 0,
  published INTEGER DEFAULT 1,
  is_hidden INTEGER DEFAULT 0,
  archived INTEGER DEFAULT 0,
  date TEXT,
  excerpt TEXT,
  description TEXT,
  thumbnail_image TEXT,
  featured_card_image TEXT,
  featured_image TEXT,
  video_walkthrough_url TEXT,
  interactive_demo_url TEXT,
  resource_downloads TEXT,
  prerequisites TEXT,
  meta_title TEXT,
  meta_description TEXT,
  focus_keywords TEXT,
  ascii_art TEXT,
  ascii_thumbnail TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_papers_slug ON papers(slug);
CREATE INDEX IF NOT EXISTS idx_papers_published ON papers(published);
CREATE INDEX IF NOT EXISTS idx_papers_category ON papers(category);
CREATE INDEX IF NOT EXISTS idx_papers_created_at ON papers(created_at);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_login TEXT,
  preferences TEXT -- JSON string for user preferences
);

-- Create index for authentication
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Saved papers (bookmarks)
CREATE TABLE IF NOT EXISTS saved_papers (
  user_id TEXT NOT NULL,
  paper_id TEXT NOT NULL,
  saved_at TEXT DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  PRIMARY KEY (user_id, paper_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Paper tags (many-to-many relationship)
CREATE TABLE IF NOT EXISTS paper_tags (
  paper_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (paper_id, tag_id),
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Terminal command history (for analytics)
CREATE TABLE IF NOT EXISTS command_history (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT,
  command TEXT NOT NULL,
  args TEXT,
  result_status TEXT,
  executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  response_time_ms INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create index for command analytics
CREATE INDEX IF NOT EXISTS idx_command_history_user ON command_history(user_id);
CREATE INDEX IF NOT EXISTS idx_command_history_command ON command_history(command);
CREATE INDEX IF NOT EXISTS idx_command_history_executed_at ON command_history(executed_at);

-- Session table (backup for KV store)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  data TEXT, -- JSON session data
  expires_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for session cleanup
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Add full-text search virtual table for papers
CREATE VIRTUAL TABLE IF NOT EXISTS papers_fts USING fts5(
  title,
  content,
  excerpt_short,
  excerpt_long,
  description,
  technical_focus,
  content=papers,
  content_rowid=rowid
);

-- Trigger to keep FTS index updated
CREATE TRIGGER IF NOT EXISTS papers_fts_insert AFTER INSERT ON papers
BEGIN
  INSERT INTO papers_fts(rowid, title, content, excerpt_short, excerpt_long, description, technical_focus)
  VALUES (new.rowid, new.title, new.content, new.excerpt_short, new.excerpt_long, new.description, new.technical_focus);
END;

CREATE TRIGGER IF NOT EXISTS papers_fts_update AFTER UPDATE ON papers
BEGIN
  UPDATE papers_fts
  SET title = new.title,
      content = new.content,
      excerpt_short = new.excerpt_short,
      excerpt_long = new.excerpt_long,
      description = new.description,
      technical_focus = new.technical_focus
  WHERE rowid = new.rowid;
END;

CREATE TRIGGER IF NOT EXISTS papers_fts_delete AFTER DELETE ON papers
BEGIN
  DELETE FROM papers_fts WHERE rowid = old.rowid;
END;
