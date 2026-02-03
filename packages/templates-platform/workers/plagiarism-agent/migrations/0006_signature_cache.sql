-- Signature and Embedding Cache
--
-- Caches computed MinHash signatures and OpenAI embeddings to avoid
-- recomputation and reduce API costs.
--
-- Canon: Compute once, use many.

-- MinHash signature cache
-- Stores computed signatures so we don't recompute for the same content
CREATE TABLE IF NOT EXISTS signature_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_hash TEXT NOT NULL UNIQUE,  -- SHA-256 of normalized content
  template_id TEXT,                    -- Optional link to template
  signature_type TEXT NOT NULL,        -- 'css', 'html', 'combined', 'js_function'
  signature_data TEXT NOT NULL,        -- JSON-serialized signature
  shingle_count INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  access_count INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_signature_cache_hash 
  ON signature_cache(content_hash);

CREATE INDEX IF NOT EXISTS idx_signature_cache_template 
  ON signature_cache(template_id);

CREATE INDEX IF NOT EXISTS idx_signature_cache_type 
  ON signature_cache(signature_type);

-- Embedding cache
-- Stores OpenAI embeddings with TTL (embeddings may change across model versions)
CREATE TABLE IF NOT EXISTS embedding_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_hash TEXT NOT NULL,          -- SHA-256 of input text
  model_version TEXT NOT NULL,         -- Model identifier (e.g., 'text-embedding-3-small')
  feature_type TEXT NOT NULL,          -- 'html', 'css', 'js', 'webflow', 'dom'
  embedding_data TEXT NOT NULL,        -- JSON array of floats
  dimensions INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,                     -- TTL for cache invalidation
  UNIQUE(content_hash, model_version, feature_type)
);

CREATE INDEX IF NOT EXISTS idx_embedding_cache_hash 
  ON embedding_cache(content_hash, model_version, feature_type);

CREATE INDEX IF NOT EXISTS idx_embedding_cache_expires 
  ON embedding_cache(expires_at);

-- Cache statistics view
CREATE VIEW IF NOT EXISTS cache_stats AS
SELECT 
  'signature' as cache_type,
  COUNT(*) as entries,
  SUM(access_count) as total_accesses,
  AVG(access_count) as avg_accesses_per_entry,
  MIN(created_at) as oldest_entry,
  MAX(last_accessed_at) as most_recent_access
FROM signature_cache
UNION ALL
SELECT 
  'embedding' as cache_type,
  COUNT(*) as entries,
  NULL as total_accesses,
  NULL as avg_accesses_per_entry,
  MIN(created_at) as oldest_entry,
  MAX(created_at) as most_recent_access
FROM embedding_cache;

-- Cleanup trigger: remove expired embeddings on access
-- (D1 doesn't support triggers that delete, so this is for documentation)
-- In practice, run periodic cleanup: DELETE FROM embedding_cache WHERE expires_at < datetime('now')
