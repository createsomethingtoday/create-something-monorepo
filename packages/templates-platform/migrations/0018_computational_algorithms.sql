-- Agent-Native Algorithms for Plagiarism Detection
--
-- Classic CS algorithms exposed as tools for AI agents:
-- - LSH for JS Functions (MinHash + LSH banding for O(1) lookup)
-- - PageRank for Template Authority (graph centrality ranking)
-- - Framework Fingerprinting (regex pattern matching)
-- - Bayesian Confidence (probabilistic scoring)
--
-- "Agent-native" = designed for AI agents to invoke as tools
--
-- Migration: 0018_computational_algorithms.sql

-- =============================================================================
-- LSH FUNCTION SIGNATURES
-- =============================================================================

-- MinHash signatures for JS functions
CREATE TABLE IF NOT EXISTS function_minhash (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Source reference
  template_id TEXT NOT NULL,
  function_id TEXT NOT NULL,           -- Unique function identifier
  function_name TEXT NOT NULL,
  
  -- MinHash signature (JSON array of 128 integers)
  signature_json TEXT NOT NULL,
  
  -- Metadata
  line_count INTEGER NOT NULL,
  normalized_length INTEGER NOT NULL,
  
  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  
  UNIQUE(template_id, function_id)
);

-- LSH band hashes for O(1) candidate lookup
CREATE TABLE IF NOT EXISTS function_lsh_bands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Reference to function_minhash
  function_minhash_id INTEGER NOT NULL,
  
  -- Band identifier (0-15)
  band_index INTEGER NOT NULL,
  
  -- Band hash (bucket key)
  band_hash TEXT NOT NULL,
  
  FOREIGN KEY (function_minhash_id) REFERENCES function_minhash(id) ON DELETE CASCADE
);

-- Index for O(1) candidate lookup by band hash
CREATE INDEX IF NOT EXISTS idx_lsh_band_hash 
  ON function_lsh_bands(band_hash);

-- Index for function lookup
CREATE INDEX IF NOT EXISTS idx_lsh_function 
  ON function_lsh_bands(function_minhash_id);

-- =============================================================================
-- PAGERANK GRAPH
-- =============================================================================

-- Template similarity edges for PageRank
CREATE TABLE IF NOT EXISTS template_similarity_graph (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Edge endpoints
  template_a TEXT NOT NULL,
  template_b TEXT NOT NULL,
  
  -- Similarity score (0-1)
  similarity REAL NOT NULL,
  
  -- Similarity type
  similarity_type TEXT NOT NULL         -- 'css', 'js', 'combined', 'vector'
    CHECK(similarity_type IN ('css', 'js', 'combined', 'vector')),
  
  -- Timestamps
  computed_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  
  UNIQUE(template_a, template_b, similarity_type)
);

-- Indexes for graph traversal
CREATE INDEX IF NOT EXISTS idx_similarity_a 
  ON template_similarity_graph(template_a);

CREATE INDEX IF NOT EXISTS idx_similarity_b 
  ON template_similarity_graph(template_b);

-- PageRank scores (computed periodically)
CREATE TABLE IF NOT EXISTS template_pagerank (
  template_id TEXT PRIMARY KEY,
  
  -- PageRank score
  score REAL NOT NULL,
  
  -- Graph metrics
  in_degree INTEGER NOT NULL DEFAULT 0,
  out_degree INTEGER NOT NULL DEFAULT 0,
  
  -- Classification based on score
  classification TEXT NOT NULL          -- 'original', 'derivative', 'isolated'
    CHECK(classification IN ('original', 'derivative', 'isolated')),
  
  -- Timestamps
  computed_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- =============================================================================
-- FRAMEWORK FINGERPRINTS
-- =============================================================================

-- Detected frameworks per template
CREATE TABLE IF NOT EXISTS template_frameworks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Template reference
  template_id TEXT NOT NULL,
  
  -- Framework info
  framework_name TEXT NOT NULL,         -- e.g., 'gsap', 'lenis', 'barba'
  framework_version TEXT,               -- Optional version
  
  -- Features detected (JSON array)
  features_json TEXT NOT NULL,          -- e.g., '["scrolltrigger", "splittext"]'
  
  -- Confidence score
  confidence REAL NOT NULL,
  
  -- Timestamps
  detected_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  
  UNIQUE(template_id, framework_name)
);

-- Index for framework lookups
CREATE INDEX IF NOT EXISTS idx_framework_name 
  ON template_frameworks(framework_name);

-- Aggregated framework fingerprint per template
CREATE TABLE IF NOT EXISTS template_framework_fingerprint (
  template_id TEXT PRIMARY KEY,
  
  -- Normalized fingerprint string for quick comparison
  fingerprint TEXT NOT NULL,            -- e.g., 'gsap:scrolltrigger,splittext|lenis:smooth-scroll'
  
  -- Framework count
  framework_count INTEGER NOT NULL,
  
  -- Timestamps
  computed_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- Index for fingerprint matching
CREATE INDEX IF NOT EXISTS idx_framework_fingerprint 
  ON template_framework_fingerprint(fingerprint);

-- =============================================================================
-- BAYESIAN CONFIDENCE
-- =============================================================================

-- Plagiarism case confidence scores
CREATE TABLE IF NOT EXISTS plagiarism_confidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Template pair
  template_a TEXT NOT NULL,
  template_b TEXT NOT NULL,
  
  -- Bayesian score
  probability REAL NOT NULL,
  verdict TEXT NOT NULL                 -- 'no_plagiarism', 'possible', 'likely', 'definite'
    CHECK(verdict IN ('no_plagiarism', 'possible', 'likely', 'definite')),
  
  -- Evidence factors (JSON)
  factors_json TEXT NOT NULL,
  
  -- Raw evidence values (JSON)
  evidence_json TEXT NOT NULL,
  
  -- Timestamps
  computed_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  
  UNIQUE(template_a, template_b)
);

-- Index for template lookups
CREATE INDEX IF NOT EXISTS idx_confidence_a 
  ON plagiarism_confidence(template_a);

CREATE INDEX IF NOT EXISTS idx_confidence_verdict 
  ON plagiarism_confidence(verdict);

-- =============================================================================
-- ANALYSIS METADATA
-- =============================================================================

-- Track when AI-native analysis was run
CREATE TABLE IF NOT EXISTS ai_analysis_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Analysis type
  analysis_type TEXT NOT NULL           -- 'lsh_index', 'pagerank', 'framework_detect', 'bayesian'
    CHECK(analysis_type IN ('lsh_index', 'pagerank', 'framework_detect', 'bayesian')),
  
  -- Scope
  template_count INTEGER NOT NULL,
  
  -- Results
  success_count INTEGER NOT NULL,
  error_count INTEGER NOT NULL DEFAULT 0,
  
  -- Timing
  started_at INTEGER NOT NULL,
  completed_at INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  
  -- Metadata (JSON)
  metadata_json TEXT
);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- View for finding similar functions via LSH
CREATE VIEW IF NOT EXISTS lsh_candidates AS
SELECT 
  a.function_minhash_id as function_a_id,
  b.function_minhash_id as function_b_id,
  a.band_hash,
  COUNT(*) as matching_bands
FROM function_lsh_bands a
JOIN function_lsh_bands b 
  ON a.band_hash = b.band_hash 
  AND a.function_minhash_id < b.function_minhash_id
GROUP BY a.function_minhash_id, b.function_minhash_id
HAVING matching_bands >= 1
ORDER BY matching_bands DESC;

-- View for PageRank leaderboard
CREATE VIEW IF NOT EXISTS pagerank_leaderboard AS
SELECT 
  pr.template_id,
  pr.score,
  pr.in_degree,
  pr.out_degree,
  pr.classification,
  tm.name as template_name,
  tm.url as template_url
FROM template_pagerank pr
LEFT JOIN template_minhash tm ON pr.template_id = tm.id
ORDER BY pr.score DESC
LIMIT 100;

-- View for framework distribution
CREATE VIEW IF NOT EXISTS framework_distribution AS
SELECT 
  framework_name,
  COUNT(DISTINCT template_id) as template_count,
  AVG(confidence) as avg_confidence,
  GROUP_CONCAT(DISTINCT template_id) as template_ids
FROM template_frameworks
WHERE confidence >= 0.7
GROUP BY framework_name
ORDER BY template_count DESC;

-- View for high-confidence plagiarism cases
CREATE VIEW IF NOT EXISTS high_confidence_cases AS
SELECT 
  pc.template_a,
  pc.template_b,
  pc.probability,
  pc.verdict,
  pc.computed_at,
  tm_a.name as name_a,
  tm_b.name as name_b,
  tm_a.url as url_a,
  tm_b.url as url_b
FROM plagiarism_confidence pc
LEFT JOIN template_minhash tm_a ON pc.template_a = tm_a.id
LEFT JOIN template_minhash tm_b ON pc.template_b = tm_b.id
WHERE pc.probability >= 0.5
ORDER BY pc.probability DESC;
