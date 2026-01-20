-- Probabilistic Sketch Storage for Plagiarism Detection
--
-- Stores Bloom filters and HyperLogLog sketches for efficient:
-- - URL deduplication (Bloom filter)
-- - Cardinality estimation (HyperLogLog)
--
-- Inspired by packages/ground (Rust implementation)
-- Adapted for D1 persistence in Cloudflare Workers
--
-- Migration: 0017_plagiarism_sketches.sql

CREATE TABLE IF NOT EXISTS plagiarism_sketches (
  -- Sketch identifier
  name TEXT PRIMARY KEY,              -- e.g., 'url_bloom', 'template_hll', 'color_hll'
  
  -- Sketch type
  sketch_type TEXT NOT NULL           -- 'bloom' or 'hll'
    CHECK(sketch_type IN ('bloom', 'hll')),
  
  -- Serialized sketch data (base64 encoded)
  data_b64 TEXT NOT NULL,
  
  -- Metadata for reconstruction
  -- Bloom: { numBits, numHashes, count }
  -- HLL: { precision, count }
  metadata_json TEXT NOT NULL,
  
  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL
);

-- JS function signatures for component-level detection
-- Stores extracted function fingerprints for comparison
CREATE TABLE IF NOT EXISTS template_js_functions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Template reference
  template_id TEXT NOT NULL,
  template_url TEXT NOT NULL,
  
  -- Function metadata
  function_name TEXT NOT NULL,
  function_type TEXT NOT NULL          -- 'function', 'arrow', 'method', 'class'
    CHECK(function_type IN ('function', 'arrow', 'method', 'class')),
  is_async INTEGER NOT NULL DEFAULT 0,
  line_count INTEGER NOT NULL,
  
  -- Normalized signature for comparison
  normalized_hash TEXT NOT NULL,        -- SHA-256 of normalized body
  normalized_body TEXT,                 -- Optional: store for debugging
  
  -- Source position
  start_pos INTEGER,
  end_pos INTEGER,
  
  -- Timestamps
  indexed_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  
  FOREIGN KEY (template_id) REFERENCES template_minhash(id)
);

-- Index for finding duplicate functions across templates
CREATE INDEX IF NOT EXISTS idx_js_functions_hash 
  ON template_js_functions(normalized_hash);

-- Index for template lookups
CREATE INDEX IF NOT EXISTS idx_js_functions_template 
  ON template_js_functions(template_id);

-- Animation fingerprints for detecting copied interactions
CREATE TABLE IF NOT EXISTS template_animation_fingerprints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Template reference
  template_id TEXT NOT NULL,
  
  -- Fingerprint (e.g., 'tween:to:opacity,x,y', 'st:hero:scrub=true:pin=false')
  fingerprint TEXT NOT NULL,
  
  -- Category
  category TEXT NOT NULL               -- 'gsap', 'scrolltrigger', 'webflow', 'intersection'
    CHECK(category IN ('gsap', 'scrolltrigger', 'webflow', 'intersection', 'other')),
  
  -- Timestamps
  indexed_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  
  FOREIGN KEY (template_id) REFERENCES template_minhash(id)
);

-- Index for finding templates with matching animation patterns
CREATE INDEX IF NOT EXISTS idx_animation_fp 
  ON template_animation_fingerprints(fingerprint);

-- Index for template lookups
CREATE INDEX IF NOT EXISTS idx_animation_template 
  ON template_animation_fingerprints(template_id);

-- Sketch statistics view
CREATE VIEW IF NOT EXISTS sketch_stats AS
SELECT 
  name,
  sketch_type,
  json_extract(metadata_json, '$.count') as item_count,
  CASE 
    WHEN sketch_type = 'bloom' THEN json_extract(metadata_json, '$.numBits')
    WHEN sketch_type = 'hll' THEN (1 << json_extract(metadata_json, '$.precision'))
  END as capacity,
  updated_at,
  datetime(updated_at / 1000, 'unixepoch') as updated_at_readable
FROM plagiarism_sketches;
