# Agent-Native Plagiarism Detection for Webflow Marketplace

**Project:** Webflow Marketplace Plagiarism Detection System  
**Authors:** Micah Johnson, CREATE SOMETHING  
**Collaborators:** Joey Best-James (Webflow Marketplace Team)  
**Date:** January 2026  
**Version:** 2.3.0  
**Status:** Production

---

## Executive Summary

This document catalogues the **agent-native plagiarism detection system** built for the Webflow Marketplace. The system combines classic computer science algorithms with AI analysis to detect template copying at scale, while exposing all capabilities as MCP tools for team AI agents.

### Key Metrics

| Metric | Value |
|--------|-------|
| Templates Indexed | 9,593 |
| JS Functions Extracted | 517,850 |
| LSH Bands | 153,472 |
| Cases Processed | 14+ |
| Unit Tests | 41 passing |

### Cost Efficiency

| Approach | Monthly Cost | Notes |
|----------|--------------|-------|
| Manual Review (12.5 hrs) | $625 | Human time @ $50/hr |
| **Automated System** | **$2.20** | AI tiers + compute |
| **Savings** | **99.6%** | |

### "Agent-Native" Definition

> **Agent-native** = designed for team AI agents to invoke via MCP.
> Any team member's AI agent can use these tools for template analysis.
> The algorithms are proven CS techniques wrapped as tools for AI agent consumption.

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     PLAGIARISM DETECTION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   MinHash    │    │   AI Tiers   │    │   Rescan     │      │
│  │  Detection   │    │   1 → 2 → 3  │    │  Compliance  │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │                │
│         └───────────────────┴───────────────────┘                │
│                             │                                    │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Bloom Filter │    │ HyperLogLog  │    │ JS Function  │      │
│  │   (dedup)    │    │  (counting)  │    │  Detection   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │                │
│         └───────────────────┴───────────────────┘                │
│                             │                                    │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  LSH for JS  │    │  PageRank    │    │  Framework   │      │
│  │  Functions   │    │  Authority   │    │  Detection   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │                │
│         └───────────────────┼───────────────────┘                │
│                             │                                    │
│                    ┌────────▼────────┐                          │
│                    │    Bayesian     │                          │
│                    │   Confidence    │                          │
│                    └─────────────────┘                          │
│                             │                                    │
│                    ┌────────▼────────┐                          │
│                    │   MCP Tools     │                          │
│                    │  (10 exposed)   │                          │
│                    └─────────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│              AI Agent (Claude, Cursor, etc.)            │
│                         ↓                                │
│                   MCP Protocol                           │
│                         ↓                                │
├─────────────────────────────────────────────────────────┤
│                   webflow-mcp                            │
│   plagiarism_scan, plagiarism_pagerank, etc.            │
│                         ↓                                │
│                   HTTP Requests                          │
│                         ↓                                │
├─────────────────────────────────────────────────────────┤
│         Plagiarism Agent (Cloudflare Worker)            │
│   https://plagiarism-agent.createsomething.workers.dev  │
│                         ↓                                │
│              Classic CS Algorithms                       │
│   LSH (1998) • PageRank (1996) • Bayesian • Regex       │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
Template URL
    ↓
┌───────────────────┐
│  Bloom Filter     │ ─── Already indexed? Skip
│  (O(1) pre-check) │
└───────────────────┘
    ↓
┌───────────────────┐
│  Content Fetch    │ ─── HTML, CSS, JS extraction
│  (Multi-page)     │
└───────────────────┘
    ↓
┌───────────────────┐
│  SuperMinHash     │ ─── 128-permutation signatures
│  + LSH Banding    │ ─── 16 bands for O(1) lookup
└───────────────────┘
    ↓
┌───────────────────┐
│  Vector Embed     │ ─── OpenAI text-embedding-3-small
│  (Semantic)       │ ─── 1536 dimensions
└───────────────────┘
    ↓
┌───────────────────┐
│  D1 Storage       │ ─── Signatures, embeddings, metadata
│  + Vectorize      │
└───────────────────┘
```

---

## Implemented Algorithms

### Academic Foundations

| Algorithm | Year | Authors | Purpose | Complexity |
|-----------|------|---------|---------|------------|
| **MinHash** | 1997 | Broder | Set similarity estimation | O(n) |
| **SuperMinHash** | 2017 | Ertl | Improved MinHash accuracy | O(n) |
| **LSH Banding** | 1998 | Indyk & Motwani | Approximate nearest neighbor | O(1) lookup |
| **PageRank** | 1996 | Page & Brin | Graph authority ranking | O(V + E) |
| **Bloom Filter** | 1970 | Bloom | Probabilistic membership | O(k) |
| **HyperLogLog** | 2007 | Flajolet et al. | Cardinality estimation | O(1) |
| **Bayesian Inference** | 1763 | Bayes | Probabilistic reasoning | O(n) |

### Algorithm Implementations

#### 1. SuperMinHash (Template Fingerprinting)

**File:** `packages/templates-platform/workers/plagiarism-agent/src/minhash.ts`

```typescript
// 128-permutation SuperMinHash signature
const MINHASH_PERMUTATIONS = 128;
const SHINGLE_SIZE = 7; // Character 7-grams

// Generates compact fingerprint from CSS/HTML/JS
export function computeSuperMinHash(shingles: Set<string>): MinHashSignature
```

**Key Properties:**
- 128 hash values per signature (~512 bytes)
- Character 7-grams for shingle generation
- Jaccard similarity estimation with ~2% error
- Confidence classification (low/medium/high)

#### 2. LSH Banding (O(1) Candidate Lookup)

**File:** `packages/templates-platform/workers/plagiarism-agent/src/minhash.ts`

```typescript
const LSH_BANDS = 16;           // Number of bands
const LSH_ROWS_PER_BAND = 8;    // 128 / 16 = 8 rows per band

// Computes band hashes for fast lookup
export function computeLSHBandHashes(signature: number[]): number[]
```

**Collision Probability:**
- For similarity s and b bands of r rows: P(collision) = 1 - (1 - s^r)^b
- At 80% similarity: ~99.97% collision rate
- At 20% similarity: ~6% collision rate

#### 3. PageRank (Template Authority)

**File:** `packages/templates-platform/workers/plagiarism-agent/src/algorithms.ts`

```typescript
// Builds directed graph from similarity data
// Edges point from newer to older (older = more authoritative)
export function buildSimilarityGraph(
  similarities: Array<{template1, template2, similarity}>,
  threshold: number,
  templateDates?: Map<string, string>  // For directed edges
): Map<string, Map<string, number>>

// Standard PageRank with damping
export function computePageRank(
  graph: Map<string, Map<string, number>>,
  damping: number = 0.85,
  iterations: number = 50
): Map<string, number>
```

**Classifications:**
- `original` - High PageRank, more incoming than outgoing
- `derivative` - Low PageRank, more outgoing than incoming
- `isolated` - No connections in similarity graph

#### 4. Bayesian Confidence Scoring

**File:** `packages/templates-platform/workers/plagiarism-agent/src/algorithms.ts`

```typescript
// Evidence weights (calibrated Jan 2026)
const EVIDENCE_WEIGHTS = {
  cssSimilarity:        { weight: 0.25, threshold: 0.7 },
  jsSimilarity:         { weight: 0.20, threshold: 0.6 },
  structuralSimilarity: { weight: 0.15, threshold: 0.7 },
  frameworkMatch:       { weight: 0.15, threshold: 0.8 },
  animationMatch:       { weight: 0.10, threshold: 0.5 },
  colorMatch:           { weight: 0.05, threshold: 0.8 },
  pageRankDiff:         { weight: 0.10, threshold: 0.3 }
};

// Calibrated verdict thresholds (Jan 2026)
const VERDICT_THRESHOLDS = {
  no_plagiarism: 0.4,   // Below = no_plagiarism
  possible: 0.65,       // Below = possible
  definite: 0.75        // Above = definite
};
```

**Formula:**
```
P(plagiarism|evidence) = σ(log(prior/(1-prior)) + 3 * (likelihood - 0.5))
```

Where σ is the logistic function bounding probability to [0, 1].

#### 5. Probabilistic Sketches

**File:** `packages/templates-platform/workers/plagiarism-agent/src/sketches.ts`

| Sketch | Purpose | Parameters |
|--------|---------|------------|
| **Bloom Filter** | URL deduplication | 50,000 capacity, 1% FP rate |
| **HyperLogLog** | Template counting | 14-bit precision (~0.8% error) |

---

## Framework Detection

### Detected Libraries (20+)

**File:** `packages/templates-platform/workers/plagiarism-agent/src/algorithms.ts`

| Category | Frameworks | Features Detected |
|----------|------------|-------------------|
| **Animation** | GSAP | scrolltrigger, splittext, flip, drawsvg, morphsvg |
| | Lenis | smooth-scroll, scroll-events |
| | Locomotive | smooth-scroll, parallax |
| | Barba.js | page-transitions, hooks |
| | AOS | scroll-animations |
| **Carousel** | Swiper | carousel, pagination, navigation, autoplay |
| | Splide | carousel, autoscroll |
| **Design Systems** | Client-First | state-classes (.is-*), component-classes (.cc-*), spacing-tokens |
| | Relume | relume-classes (.rl-*), layout-system, cms-integration |
| | Lumos | lumos-classes, design-tokens |
| **Webflow** | Native | ix2, ready, ecommerce, forms |
| | Finsweet | cms-filter, cms-nest, cms-load, cms-sort, attributes, cookie-consent |
| | Wized | data-binding, element-binding |
| | Memberstack | membership |
| **3D** | Three.js | 3d-graphics, webgl |
| | Spline | 3d-embed |
| **Observers** | Native | intersection, resize, mutation |

### Detection Method

Each framework has a detection function with:
- Regex patterns for JS/CSS
- Feature extraction
- Confidence scoring (0-1)
- Optional version detection

```typescript
detect: (js: string, css?: string) => {
  features: string[];
  confidence: number;
  version?: string;
}
```

---

## MCP Integration

### webflow-mcp Server

**Location:** `packages/webflow-mcp/`

The MCP server exposes 10 tools for AI agent consumption:

| Tool | Algorithm | Input | Output |
|------|-----------|-------|--------|
| `plagiarism_health` | - | None | System status, version, stats |
| `plagiarism_stats` | - | None | Algorithm metrics |
| `plagiarism_scan` | MinHash | URL | Similar templates, verdicts |
| `plagiarism_lsh_index` | MinHash + LSH | Limit | Indexed function count |
| `plagiarism_similar_functions` | LSH | Template ID | Duplicate code locations |
| `plagiarism_pagerank` | PageRank | Threshold | Authority scores |
| `plagiarism_pagerank_leaderboard` | PageRank | Limit | Top original templates |
| `plagiarism_detect_frameworks` | Regex | URL | Libraries, features, versions |
| `plagiarism_confidence` | Bayes | Template pair | Probability, verdict, factors |
| `plagiarism_exclude` | - | Template pair, reason | Exclusion confirmation |

### Configuration

```json
{
  "mcpServers": {
    "webflow": {
      "command": "node",
      "args": ["packages/webflow-mcp/dist/index.js"]
    }
  }
}
```

### Usage Example

```
User: Check if https://suspicious-template.webflow.io is similar to any indexed templates

Agent: [Uses plagiarism_scan tool]

Result: {
  "url": "https://suspicious-template.webflow.io",
  "matchCount": 3,
  "topMatches": [
    { "id": "original-template", "similarity": 0.87, "verdict": "High similarity" }
  ]
}
```

---

## AI Tier System

### Three-Tier Architecture

```
Reported Case
    ↓
┌───────────────────────────────────────┐
│  Tier 1: Vision Screening (FREE)      │
│  Workers AI - @cf/meta/llama-3.2-11b  │
│  → Removes 30% (obvious non-matches)  │
└───────────────────────────────────────┘
    ↓
┌───────────────────────────────────────┐
│  Tier 2: Detailed Analysis ($0.02)    │
│  Claude Haiku                         │
│  → Removes 50% more (analyzable)      │
└───────────────────────────────────────┘
    ↓
┌───────────────────────────────────────┐
│  Tier 3: Edge Case Judgment ($0.15)   │
│  Claude Sonnet                        │
│  → Handles 20% (genuine edge cases)   │
└───────────────────────────────────────┘
```

### Editorial Framework

Each case is scored on 4 dimensions:

| Dimension | Options |
|-----------|---------|
| **Extent** | Minimal, Moderate, Substantial, Extensive |
| **Transformation** | None, Low, Minimal, Moderate, High |
| **Importance** | Peripheral, Minor, Significant, Major |
| **Impact** | Little/no harm, Moderate harm, Significant harm |

### Safety Mechanism

```typescript
const MAJOR_VIOLATION_CONFIDENCE_THRESHOLD = 0.9;

// Low confidence major violations flagged for human review
if (decision === 'major' && confidence < 0.9) {
  outcome = `Flagged for review (confidence: ${confidence * 100}%)`;
} else {
  outcome = 'Delisted template'; // High confidence auto-action
}
```

---

## Database Schema

### Core Tables

| Table | Rows | Purpose |
|-------|------|---------|
| `template_minhash` | 9,593 | Template fingerprints, metadata |
| `template_js_functions` | 517,850 | Extracted JS functions |
| `minhash_lsh_bands` | 153,472 | LSH band hashes for O(1) lookup |
| `function_minhash` | - | JS function signatures |
| `function_lsh_bands` | - | Function LSH bands |
| `template_pagerank` | - | PageRank scores |
| `template_framework_detection` | - | Framework fingerprints |
| `plagiarism_confidence` | - | Bayesian scores |
| `similarity_exclusions` | - | False positive pairs |

### Cache Tables (v2.3.0)

| Table | Purpose | TTL |
|-------|---------|-----|
| `signature_cache` | MinHash signatures | Permanent |
| `embedding_cache` | OpenAI embeddings | 30 days |

### Sketch Persistence

| Table | Purpose |
|-------|---------|
| `sketch_bloom` | Bloom filter state |
| `sketch_hll` | HyperLogLog registers |

---

## Validation Results

### Unit Tests (41/41 Passing)

| Test Suite | Tests | Status |
|------------|-------|--------|
| MinHash/SuperMinHash | 10 | PASS |
| LSH Banding | 8 | PASS |
| Bayesian Confidence | 9 | PASS |
| PageRank | 14 | PASS |

### Integration Tests

**Templates Tested:**
1. `artifact-saas-software-webflow-template.webflow.io`
2. `prospect-finance-saas-webflow-template.webflow.io`
3. `pathwise-schools-coaching.webflow.io`

**Vector Similarity Results (Semantic/Structural):**

| Comparison | Overall | CSS | HTML | Verdict |
|------------|---------|-----|------|---------|
| Artifact vs Pathwise | **95.2%** | 97.6% | 95.2% | high_similarity |
| Prospect vs Pathwise | **94.7%** | 98.0% | 93.7% | high_similarity |
| Artifact vs Prospect | **96.7%** | 98.3% | 95.0% | high_similarity |

**MinHash Results (Character-Level):**

| Comparison | Combined | CSS | Class Names |
|------------|----------|-----|-------------|
| Artifact vs Prospect | 14.1% | 15.6% | 8.6% |
| Artifact vs Pathwise | **50.8%** | 40.6% | 2.5% |

### Key Finding: Similarity Discrepancy

The discrepancy between Vector (95%) and MinHash (14-50%) reveals:

1. **Vector embeddings** capture semantic/structural similarity
   - Templates share same layout patterns
   - Similar component organization
   - Equivalent visual structure

2. **MinHash** captures character-level similarity
   - Different class names = lower similarity
   - Surface-level differences detected
   - Catches direct copy-paste

3. **Combining both** provides complete picture
   - High vector + low MinHash = derivative work (renamed classes)
   - High vector + high MinHash = direct copy
   - Low both = unrelated templates

---

## Cost Analysis

### Per-Operation Costs

| Component | Cost | Notes |
|-----------|------|-------|
| MinHash Detection | $0 | Workers compute (included) |
| Bloom Filter | $0 | O(1) memory operation |
| LSH Lookup | $0 | D1 query |
| Vector Embedding | ~$0.0001 | OpenAI text-embedding-3-small |
| PageRank | $0 | Workers compute |
| Framework Detection | $0 | Regex patterns |
| Tier 1 Vision | $0 | Workers AI (free) |
| Tier 2 Analysis | $0.02 | Claude Haiku |
| Tier 3 Judgment | $0.15 | Claude Sonnet |

### Monthly Projection (50 reports)

| Tier | Cases | Cost |
|------|-------|------|
| Tier 1 (all) | 50 | $0 |
| Tier 2 (70%) | 35 | $0.70 |
| Tier 3 (20%) | 10 | $1.50 |
| **Total** | | **$2.20** |

### ROI Calculation

```
Manual Review: 50 cases × 15 min × $50/hr = $625/month
Automated:     $2.20/month
Savings:       $622.80/month (99.6%)
Annual:        $7,473.60 saved
```

---

## Implementation Timeline

### v2.0.0 (Dec 2025)
- MinHash fingerprinting
- Three-tier AI system
- Airtable integration

### v2.1.0 (Jan 2026)
- Bloom filter deduplication
- HyperLogLog counting
- JS function extraction
- Animation fingerprints

### v2.2.0 (Jan 2026)
- LSH for JS functions
- PageRank authority
- Framework detection (15+)
- Bayesian confidence
- MCP integration (webflow-mcp)

### v2.3.0 (Jan 2026)
- False positive exclusions
- Calibrated thresholds
- Expanded framework detection (20+)
- Directed PageRank (temporal)
- Signature/embedding caching
- 41 automated tests

---

## Learnings

### Technical Insights

1. **Multiple Similarity Signals Required**
   - Vector embeddings alone produce false positives (common patterns)
   - MinHash alone misses derivative work (renamed classes)
   - Combining signals with Bayesian scoring reduces both

2. **O(1) Lookup Critical at Scale**
   - 9,500+ templates means 45M+ pairwise comparisons
   - LSH banding reduces to ~1,000 candidates per query
   - Bloom filter eliminates redundant indexing

3. **Temporal Data Improves Authority**
   - Directed PageRank (newer → older) identifies originals
   - Creation date from marketplace or first-indexed timestamp
   - Older templates accumulate authority from derivatives

### Agentic Architecture Insights

1. **Agent-Native ≠ AI-Only**
   - Classic algorithms (1970-2017) do the heavy lifting
   - AI handles edge cases requiring judgment
   - MCP wraps deterministic tools for AI consumption

2. **Tool Design for Agents**
   - Clear input/output schemas
   - Atomic operations (one tool = one task)
   - Composable (agents chain tools as needed)

3. **Human-in-the-Loop Safety**
   - 90% confidence threshold for auto-actions
   - Low-confidence cases flagged for review
   - False positive exclusion workflow

### Canon Reflection

> **Zuhandenheit (ready-to-hand):** When the system works correctly, the infrastructure disappears. Marketplace administrators see decisions in Airtable—not queues, tiers, or AI models.

> **Subtractive Architecture:** The three-tier system removes work at each stage:
> - Tier 1 removes the obvious (30%)
> - Tier 2 removes the analyzable (50%)
> - Tier 3 handles only genuine edge cases (20%)

> **Weniger, aber besser:** Less human time, better consistency, same quality of decisions.

---

## Future Work

### Planned Improvements

1. **Visual Similarity Layer**
   - Screenshot capture via Browser Rendering API
   - Vision model comparison (layout, colors, spacing)
   - Complement code-level analysis

2. **Creator Attribution**
   - Track template authors across submissions
   - Build creator reputation scores
   - Identify serial violators

3. **Real-time Monitoring**
   - Webhook on new marketplace submissions
   - Automatic indexing and comparison
   - Alert on high-similarity submissions

4. **Weight Optimization**
   - Run grid search against labeled cases
   - A/B test threshold configurations
   - Continuous calibration

---

## API Reference

### HTTP Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | System health + stats |
| `/dashboard` | GET | Visual dashboard |
| `/scan/template` | POST | Scan URL against index |
| `/minhash/compare` | POST | Compare two templates |
| `/api/compare` | POST | Vector similarity comparison |
| `/compute/lsh-index` | POST | Index functions for LSH |
| `/compute/similar-functions` | POST | Find duplicate code |
| `/compute/pagerank` | POST | Compute authority scores |
| `/compute/pagerank/leaderboard` | GET | Top original templates |
| `/compute/frameworks` | POST | Detect JS libraries |
| `/compute/confidence` | POST | Bayesian probability |
| `/exclusions` | POST/GET | Manage false positives |

### Example Requests

```bash
# Health check
curl https://plagiarism-agent.createsomething.workers.dev/health

# Scan template
curl -X POST https://plagiarism-agent.createsomething.workers.dev/scan/template \
  -H "Content-Type: application/json" \
  -d '{"url": "https://template.webflow.io"}'

# Compare templates
curl -X POST https://plagiarism-agent.createsomething.workers.dev/api/compare \
  -H "Content-Type: application/json" \
  -d '{"originalUrl": "https://original.webflow.io", "allegedCopyUrl": "https://copy.webflow.io"}'
```

---

## References

### Academic Papers

1. Broder, A. Z. (1997). "On the resemblance and containment of documents." *Compression and Complexity of Sequences.*
2. Ertl, O. (2017). "SuperMinHash - A New Minwise Hashing Algorithm for Jaccard Similarity Estimation."
3. Indyk, P., & Motwani, R. (1998). "Approximate nearest neighbors: towards removing the curse of dimensionality." *STOC.*
4. Page, L., & Brin, S. (1996). "The anatomy of a large-scale hypertextual web search engine."
5. Bloom, B. H. (1970). "Space/time trade-offs in hash coding with allowable errors."
6. Flajolet, P. et al. (2007). "HyperLogLog: the analysis of a near-optimal cardinality estimation algorithm."

### Source Files

| Component | Location |
|-----------|----------|
| MinHash | `packages/templates-platform/workers/plagiarism-agent/src/minhash.ts` |
| Algorithms | `packages/templates-platform/workers/plagiarism-agent/src/algorithms.ts` |
| Sketches | `packages/templates-platform/workers/plagiarism-agent/src/sketches.ts` |
| Cache | `packages/templates-platform/workers/plagiarism-agent/src/cache.ts` |
| MCP Server | `packages/webflow-mcp/src/index.ts` |
| Tests | `packages/templates-platform/workers/plagiarism-agent/src/__tests__/` |

### Related Documents

- [Agentic Architecture Framework](../../../specs/webflow-marketplace/agentic-architecture.md)
- [Plagiarism Agent README](../../../packages/templates-platform/workers/plagiarism-agent/README.md)
- [webflow-mcp README](../../../packages/webflow-mcp/README.md)

---

*Experiment conducted using CREATE SOMETHING methodology*  
*Framework: Agent-Native Design + Subtractive Architecture*
