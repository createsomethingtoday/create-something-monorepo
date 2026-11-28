-- One row per docs page listed in the llms.txt tree of developers.webflow.com.
CREATE TABLE pages (
  url TEXT PRIMARY KEY,                     -- canonical page URL (no .md, no default version segment)
  source_url TEXT NOT NULL,                 -- the Markdown URL that is fetched
  title TEXT NOT NULL DEFAULT '',
  product TEXT NOT NULL,                    -- first path segment: apps, data, designer, ...
  version TEXT NOT NULL,                    -- current | beta
  rank INTEGER NOT NULL,                    -- lower = preferred when two pages have the same body
  body_hash TEXT,                           -- SHA-256 of the page body; NULL until the first fetch
  alias_of TEXT,                            -- page with the same body that holds the chunks
  index_version INTEGER NOT NULL DEFAULT 0, -- chunk and embedding rule set that produced the chunks
  chunk_count INTEGER NOT NULL DEFAULT 0,
  seen_at TEXT NOT NULL,                    -- last crawl that listed the page
  checked_at TEXT,                          -- last fetch
  indexed_at TEXT,
  error TEXT
);
CREATE INDEX pages_check_order ON pages (checked_at, rank);
CREATE INDEX pages_body_hash ON pages (body_hash);

CREATE TABLE chunks (
  id INTEGER PRIMARY KEY,
  vector_id TEXT NOT NULL UNIQUE,           -- ID of the vector in Vectorize: <page key>:<ordinal>
  page_url TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  heading_path TEXT NOT NULL,               -- "Page title > Section > Subsection"
  anchor TEXT,                              -- heading slug for the URL fragment
  text TEXT NOT NULL,                       -- exact Markdown of the passage
  text_hash TEXT NOT NULL,
  version TEXT NOT NULL
);
CREATE INDEX chunks_page ON chunks (page_url);

-- Keyword side of the search. rowid = chunks.id. No stemmer: the Porter stemmer
-- maps "ads" and "adding" to one token, which put "Adding scopes" above the
-- advertising rule. The query adds the plural or singular form of each word.
CREATE VIRTUAL TABLE chunks_fts USING fts5(heading_path, text, tokenize = 'unicode61');
