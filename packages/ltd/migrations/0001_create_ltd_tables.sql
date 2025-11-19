-- Masters/Creators
CREATE TABLE IF NOT EXISTS masters (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  birth_year INTEGER,
  death_year INTEGER,
  discipline TEXT,
  portrait_url TEXT,
  biography TEXT,
  legacy TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Core Principles/Frameworks
CREATE TABLE IF NOT EXISTS principles (
  id TEXT PRIMARY KEY,
  master_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER,
  category TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (master_id) REFERENCES masters(id) ON DELETE CASCADE
);

-- Quotes
CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  master_id TEXT NOT NULL,
  quote_text TEXT NOT NULL,
  context TEXT,
  source_url TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (master_id) REFERENCES masters(id) ON DELETE CASCADE
);

-- Resources (transcripts, videos, articles)
CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  master_id TEXT,
  title TEXT NOT NULL,
  type TEXT,
  url TEXT,
  description TEXT,
  year INTEGER,
  featured INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (master_id) REFERENCES masters(id) ON DELETE CASCADE
);

-- Visual Examples
CREATE TABLE IF NOT EXISTS examples (
  id TEXT PRIMARY KEY,
  master_id TEXT NOT NULL,
  title TEXT,
  image_url TEXT,
  description TEXT,
  year INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (master_id) REFERENCES masters(id) ON DELETE CASCADE
);

-- Cross-references to Create Something content
CREATE TABLE IF NOT EXISTS canon_references (
  id TEXT PRIMARY KEY,
  master_id TEXT,
  principle_id TEXT,
  reference_type TEXT,
  reference_slug TEXT,
  reference_domain TEXT,
  description TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (master_id) REFERENCES masters(id) ON DELETE CASCADE,
  FOREIGN KEY (principle_id) REFERENCES principles(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_principles_master ON principles(master_id);
CREATE INDEX IF NOT EXISTS idx_quotes_master ON quotes(master_id);
CREATE INDEX IF NOT EXISTS idx_resources_master ON resources(master_id);
CREATE INDEX IF NOT EXISTS idx_examples_master ON examples(master_id);
CREATE INDEX IF NOT EXISTS idx_canon_refs_master ON canon_references(master_id);
CREATE INDEX IF NOT EXISTS idx_canon_refs_principle ON canon_references(principle_id);
CREATE INDEX IF NOT EXISTS idx_canon_refs_domain ON canon_references(reference_domain, reference_slug);
