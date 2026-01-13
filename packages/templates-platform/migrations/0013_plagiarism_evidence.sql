-- Plagiarism Evidence Artifacts
-- Stores tangible, inspectable analysis outputs (code metrics, vector similarity, neighbors)

CREATE TABLE IF NOT EXISTS plagiarism_evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (case_id) REFERENCES plagiarism_cases(id)
);

CREATE INDEX IF NOT EXISTS idx_plagiarism_evidence_case
ON plagiarism_evidence(case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_plagiarism_evidence_kind
ON plagiarism_evidence(kind, created_at DESC);

