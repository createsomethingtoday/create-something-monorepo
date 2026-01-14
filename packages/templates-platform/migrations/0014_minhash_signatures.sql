-- MinHash Signatures for Template Plagiarism Detection
-- 
-- Stores MinHash fingerprints of entire CSS/HTML/JS files
-- for efficient similarity comparison without token limits.
--
-- Migration: 0014_minhash_signatures.sql

CREATE TABLE IF NOT EXISTS template_minhash (
  id TEXT PRIMARY KEY,                    -- Template ID (e.g., 'nimatra', 'kitpro-prokit')
  name TEXT NOT NULL,                     -- Human-readable template name
  url TEXT NOT NULL,                      -- Template URL (webflow.io)
  creator TEXT,                           -- Creator name if known
  
  -- MinHash signatures (base64-encoded 128 x 32-bit hashes = 512 bytes each)
  css_signature TEXT,                     -- MinHash of full CSS file
  html_signature TEXT,                    -- MinHash of full HTML
  combined_signature TEXT,                -- MinHash of HTML + CSS + JS combined
  
  -- LSH Band hashes (16 bands, stored as comma-separated base36 integers)
  -- Used for O(1) candidate lookup instead of O(n) full comparison
  lsh_bands TEXT,                         -- e.g., "a1b2c3,d4e5f6,..."
  
  -- Metadata for signature
  css_shingles INTEGER,                   -- Number of shingles in CSS
  html_shingles INTEGER,                  -- Number of shingles in HTML
  combined_shingles INTEGER,              -- Number of combined shingles
  
  -- Raw file sizes (for reference)
  css_size_bytes INTEGER,
  html_size_bytes INTEGER,
  
  -- Timestamps
  indexed_at INTEGER NOT NULL,            -- When this template was indexed
  updated_at INTEGER                      -- Last update time
);

-- Index for fast lookups by URL
CREATE INDEX IF NOT EXISTS idx_minhash_url ON template_minhash(url);

-- Index for creator lookups (find all templates by same creator)
CREATE INDEX IF NOT EXISTS idx_minhash_creator ON template_minhash(creator);

-- LSH Bucket table for O(1) candidate lookup
-- Each template has 16 band hashes; templates sharing ANY band hash are candidates
CREATE TABLE IF NOT EXISTS minhash_lsh_buckets (
  band_index INTEGER NOT NULL,            -- Band number (0-15)
  band_hash INTEGER NOT NULL,             -- Hash value for this band
  template_id TEXT NOT NULL,              -- Template that has this band hash
  PRIMARY KEY (band_index, band_hash, template_id),
  FOREIGN KEY (template_id) REFERENCES template_minhash(id)
);

-- Index for fast bucket lookups
CREATE INDEX IF NOT EXISTS idx_lsh_bucket ON minhash_lsh_buckets(band_index, band_hash);
