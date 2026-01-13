# Transparency: Inspectable Evidence (HTML/CSS/JS + Vectors)

This worker now persists **tangible analysis artifacts** to D1 for each plagiarism case, so decisions can be audited and tuned without relying only on LLM reasoning.

## Evidence Table

Artifacts are stored in D1 table: `plagiarism_evidence`

Each row:
- `case_id`: e.g. `case_2s7u9xh4r9g`
- `kind`: artifact type
- `data_json`: JSON payload (metrics, scores, neighbors)
- `created_at`: unix ms

### Kinds

- `tier3_code_metrics`
  - Structured counts/samples derived from HTML/CSS/JS (no full source stored)
  - Includes `copyPatterns` + per-original `deltas` (diffs + shared libs)
- `tier3_vector_similarity`
  - Embedding similarity scores across HTML/CSS/JS/Webflow/DOM + `overall` + `verdict`
- `tier3_vectorize_neighbors`
  - Vectorize nearest-neighbor templates for the copy URL (topK list)

## How to Query (Production)

### 1) List available artifacts for a case

```bash
wrangler d1 execute templates-platform-db --remote \
  --command "SELECT kind, created_at, length(data_json) AS bytes FROM plagiarism_evidence WHERE case_id='CASE_ID' ORDER BY created_at DESC"
```

### 2) Pull vector similarity (most “numeric” signal)

```bash
wrangler d1 execute templates-platform-db --remote \
  --command "SELECT json_extract(data_json,'$.overall') AS overall, json_extract(data_json,'$.verdict') AS verdict, data_json FROM plagiarism_evidence WHERE case_id='CASE_ID' AND kind='tier3_vector_similarity' ORDER BY created_at DESC LIMIT 1"
```

### 3) Pull code metrics (counts + diffs)

```bash
wrangler d1 execute templates-platform-db --remote \
  --command "SELECT data_json FROM plagiarism_evidence WHERE case_id='CASE_ID' AND kind='tier3_code_metrics' ORDER BY created_at DESC LIMIT 1"
```

### 4) Pull Vectorize neighbors (who else looks similar)

```bash
wrangler d1 execute templates-platform-db --remote \
  --command "SELECT data_json FROM plagiarism_evidence WHERE case_id='CASE_ID' AND kind='tier3_vectorize_neighbors' ORDER BY created_at DESC LIMIT 1"
```

## Why this helps tuning

You can now create rule-based “objective” signals (thresholds on `overall`, `sharedLibraries`, interaction diffs, etc.) and compare them to human outcomes to calibrate:
- false positives (high similarity but legitimate)
- false negatives (low similarity but obvious cloning)

