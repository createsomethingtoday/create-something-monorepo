# Webflow Plagiarism Detection - Session Log

## Session: January 20, 2026

### Overview

Implemented 7-phase improvement plan for plagiarism detection system, then validated with tests and template comparisons.

---

## Phase 1: Threshold Calibration

**Status:** COMPLETED

**Changes:**
- Added `VERDICT_THRESHOLDS` constant in `algorithms.ts`
- Raised thresholds from 0.3/0.5/0.75 to 0.4/0.65/0.75
- Reduces false positives by requiring stronger evidence

**File:** `packages/templates-platform/workers/plagiarism-agent/src/algorithms.ts`

---

## Phase 2: Expanded Framework Detection

**Status:** COMPLETED

**New Frameworks Added:**
- **Client-First** - `.is-*`, `.cc-*`, spacing tokens
- **Relume** - `.rl-*`, layout system, CMS integration
- **Lumos** - `.lumos-*`, design tokens
- **Wized** - data binding
- **Memberstack** - membership

**Expanded:**
- **Finsweet** - all `fs-*` data attributes

**File:** `packages/templates-platform/workers/plagiarism-agent/src/algorithms.ts`

---

## Phase 3: Temporal Analysis

**Status:** COMPLETED

**New Migration:** `0005_template_metadata.sql`

**Columns Added:**
- `first_indexed_at` - When template was first seen
- `marketplace_published_at` - Webflow marketplace date
- `date_source` - Provenance tracking

**View Created:** `template_temporal_priority`

---

## Phase 4: Directed PageRank

**Status:** COMPLETED

**Changes:**
- Updated `buildSimilarityGraph()` to accept `templateDates` parameter
- Edges now point from newer to older (older = more authoritative)
- Falls back to bidirectional when dates unavailable

**File:** `packages/templates-platform/workers/plagiarism-agent/src/algorithms.ts`

---

## Phase 5: Weight Validation Script

**Status:** COMPLETED

**New File:** `scripts/weight-tuning.ts`

**Features:**
- Grid search over weight combinations
- Tests against Airtable labeled cases
- Outputs optimal configuration with F1 score

---

## Phase 6: Automated Tests

**Status:** COMPLETED

**New Test Files:**
- `src/__tests__/minhash.test.ts` (10 tests)
- `src/__tests__/lsh.test.ts` (8 tests)
- `src/__tests__/bayesian.test.ts` (9 tests)
- `src/__tests__/pagerank.test.ts` (14 tests)

**Test Results:**
```
 Test Files  4 passed (4)
      Tests  41 passed (41)
   Duration  691ms
```

---

## Phase 7: Caching Layer

**Status:** COMPLETED

**New Migration:** `0006_signature_cache.sql`

**Tables Added:**
- `signature_cache` - MinHash signatures
- `embedding_cache` - OpenAI embeddings (30-day TTL)

**New File:** `src/cache.ts`

**Functions:**
- `getOrComputeSignature()` - Cached MinHash
- `getOrComputeEmbedding()` - Cached embeddings
- `getCacheStats()` - Statistics
- `cleanupExpiredCache()` - TTL cleanup

---

## Integration Testing

### Worker Health Check

```json
{
  "status": "healthy",
  "timestamp": 1769904088227,
  "stats": {
    "templatesIndexed": 9593,
    "casesProcessed": 14,
    "lshBands": 153472
  },
  "version": "2.3.0"
}
```

### Template Comparison Results

**Templates Tested:**
1. `artifact-saas-software-webflow-template.webflow.io`
2. `prospect-finance-saas-webflow-template.webflow.io`
3. `pathwise-schools-coaching.webflow.io`

**Vector Similarity (Semantic):**

| Comparison | Overall | CSS | HTML |
|------------|---------|-----|------|
| Artifact vs Pathwise | 95.2% | 97.6% | 95.2% |
| Prospect vs Pathwise | 94.7% | 98.0% | 93.7% |
| Artifact vs Prospect | 96.7% | 98.3% | 95.0% |

**MinHash Similarity (Character-Level):**

| Comparison | Combined | CSS | Classes |
|------------|----------|-----|---------|
| Artifact vs Prospect | 14.1% | 15.6% | 8.6% |
| Artifact vs Pathwise | 50.8% | 40.6% | 2.5% |

### Key Finding

**Discrepancy Analysis:**
- Vector: 95%+ (high structural similarity)
- MinHash: 14-51% (different class names)

**Interpretation:**
- All three templates share similar structure
- Class names differ (derivative work pattern)
- System correctly identifies this as "moderate_similarity"

---

## Ground MCP Analysis

**Pre-Implementation Check:**
- 18 pre-existing duplicate functions
- All within `index.ts` and helper files
- Not addressed in this session (separate refactoring task)

**Post-Implementation Check:**
- Same 18 duplicates (no new issues introduced)
- No dead exports
- All new code passes lint

---

## Loom Task Tracking

**Task ID:** `lm-ce82`

**Status:** COMPLETED

**Evidence:**
> 7 phases completed: threshold calibration, framework detection (Client-First/Relume/Lumos), temporal analysis migration, directed PageRank, weight tuning script, automated tests, signature/embedding cache

---

## Files Modified

### New Files
- `src/__tests__/minhash.test.ts`
- `src/__tests__/lsh.test.ts`
- `src/__tests__/bayesian.test.ts`
- `src/__tests__/pagerank.test.ts`
- `src/cache.ts`
- `scripts/weight-tuning.ts`
- `migrations/0005_template_metadata.sql`
- `migrations/0006_signature_cache.sql`
- `vitest.config.ts`

### Modified Files
- `src/algorithms.ts` - Thresholds, frameworks, PageRank
- `package.json` - Added vitest

---

## Next Steps

1. Apply migrations to production D1
2. Deploy updated Worker
3. Run weight tuning against labeled cases
4. Monitor threshold effectiveness

---

## Session Metrics

| Metric | Value |
|--------|-------|
| Phases Completed | 7/7 |
| Tests Added | 41 |
| Tests Passing | 41 |
| New Migrations | 2 |
| New Files | 9 |
| Modified Files | 2 |

---

*Session completed: January 20, 2026*
