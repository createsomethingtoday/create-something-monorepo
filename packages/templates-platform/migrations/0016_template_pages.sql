-- Page-Level Signatures for Granular Plagiarism Detection
-- 
-- Enables comparison of specific pages across templates:
-- - "About" vs "About" page comparison
-- - Identify which specific pages were copied
-- - Track page-type patterns across the template ecosystem
--
-- Migration: 0016_template_pages.sql

-- Individual page signatures within templates
CREATE TABLE IF NOT EXISTS template_pages (
  id TEXT PRIMARY KEY,                    -- Composite: "nimatra::about" 
  template_id TEXT NOT NULL,              -- Parent template ID
  page_url TEXT NOT NULL,                 -- Full URL or path: "/about/"
  page_path TEXT NOT NULL,                -- Normalized path: "/about/"
  
  -- Page classification
  page_type TEXT NOT NULL,                -- Classified type: "home", "about", "portfolio", "blog", "contact", etc.
  page_type_confidence REAL DEFAULT 1.0,  -- How confident we are in the classification (0-1)
  
  -- MinHash signature for this specific page
  page_signature TEXT NOT NULL,           -- MinHash of page HTML+CSS
  page_shingles INTEGER NOT NULL,         -- Number of shingles in this page
  
  -- Content metrics
  html_size_bytes INTEGER,
  unique_classes INTEGER,                 -- Number of unique CSS classes on this page
  structural_depth INTEGER,               -- Max nesting depth of HTML
  
  -- Timestamps
  indexed_at INTEGER NOT NULL,
  
  FOREIGN KEY (template_id) REFERENCES template_minhash(id) ON DELETE CASCADE
);

-- Fast lookups by template
CREATE INDEX IF NOT EXISTS idx_template_pages_template ON template_pages(template_id);

-- Fast lookups by page type (for cross-template comparison)
CREATE INDEX IF NOT EXISTS idx_template_pages_type ON template_pages(page_type);

-- Fast lookups by path (find all "/about/" pages across templates)
CREATE INDEX IF NOT EXISTS idx_template_pages_path ON template_pages(page_path);

-- Composite index for type+template queries
CREATE INDEX IF NOT EXISTS idx_template_pages_type_template ON template_pages(page_type, template_id);


-- Page-level similarity cache (optional, for frequently compared page types)
CREATE TABLE IF NOT EXISTS page_similarity_cache (
  id TEXT PRIMARY KEY,                    -- "nimatra::about<>developer::about"
  page1_id TEXT NOT NULL,
  page2_id TEXT NOT NULL,
  similarity REAL NOT NULL,               -- Jaccard similarity (0-1)
  computed_at INTEGER NOT NULL,
  
  FOREIGN KEY (page1_id) REFERENCES template_pages(id) ON DELETE CASCADE,
  FOREIGN KEY (page2_id) REFERENCES template_pages(id) ON DELETE CASCADE
);

-- Index for finding all similarities for a page
CREATE INDEX IF NOT EXISTS idx_page_similarity_page1 ON page_similarity_cache(page1_id);
CREATE INDEX IF NOT EXISTS idx_page_similarity_page2 ON page_similarity_cache(page2_id);


-- LSH bands for page-level similarity search
CREATE TABLE IF NOT EXISTS page_lsh_bands (
  band_id TEXT NOT NULL,                  -- "band_0", "band_1", etc.
  hash_value INTEGER NOT NULL,            -- Hash value for this band
  page_id TEXT NOT NULL,                  -- Page that has this band hash
  
  PRIMARY KEY (band_id, hash_value, page_id),
  FOREIGN KEY (page_id) REFERENCES template_pages(id) ON DELETE CASCADE
);

-- Index for fast bucket lookups
CREATE INDEX IF NOT EXISTS idx_page_lsh_bucket ON page_lsh_bands(band_id, hash_value);
