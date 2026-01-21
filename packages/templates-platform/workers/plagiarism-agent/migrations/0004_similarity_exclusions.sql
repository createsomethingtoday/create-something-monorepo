-- Similarity Exclusions (False Positive Handling)
--
-- When editorial review determines two templates are legitimately similar
-- (same author, licensed, common framework), store the exclusion here.
-- Algorithms check this table before flagging.
--
-- Canon: One table, one check.

CREATE TABLE IF NOT EXISTS similarity_exclusions (
  template_a TEXT NOT NULL,
  template_b TEXT NOT NULL,
  reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (template_a, template_b)
);

CREATE INDEX IF NOT EXISTS idx_exclusions_b_a 
  ON similarity_exclusions(template_b, template_a);
