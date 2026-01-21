# Plagiarism Detection Agent

**Multi-layer plagiarism detection for Webflow templates using MinHash fingerprinting and AI analysis.**

## Architecture

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
│                    │    Dashboard    │                          │
│                    │   /dashboard    │                          │
│                    └─────────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Detection Systems

### 1. MinHash Fingerprinting ($0 cost)
- **9,500+ templates indexed** with LSH banding
- **Property-value focused** - catches plagiarism even when class names change
- **Evidence hierarchy**: Identical rules → Property combos → Colors → Structure
- **O(1) candidate lookup** via Locality-Sensitive Hashing

### 2. AI Tier System (for reported cases)
1. **Tier 1** (Workers AI - FREE): Vision-based screening
2. **Tier 2** (Claude Haiku - $0.02): Detailed analysis
3. **Tier 3** (Claude Sonnet - $0.15): Edge case judgment

### 3. Probabilistic Sketches (v2.1.0)

Inspired by [packages/ground](../../ground/README.md):

| Sketch | Purpose | Cost |
|--------|---------|------|
| **Bloom Filter** | Fast "have we seen this URL?" checks | $0 |
| **HyperLogLog** | Count unique templates/colors/patterns | $0 |

- **Bloom filter**: 50,000 capacity, 1% false positive rate
- **HyperLogLog**: 14-bit precision (~0.8% error)
- **D1 persistence**: Sketches survive Worker restarts

```bash
# Get sketch statistics
curl https://plagiarism-agent.createsomething.workers.dev/sketches/stats
```

### 4. JS Function-Level Detection (v2.1.0)

Catches **component-level plagiarism** that file-level analysis misses:

- Extracts functions/classes from JavaScript
- Normalizes and hashes for comparison
- Detects copied GSAP animations and ScrollTrigger configs
- Tracks Webflow interaction patterns

```bash
# Compare JS between two templates
curl -X POST https://plagiarism-agent.createsomething.workers.dev/js-analysis \
  -H "Content-Type: application/json" \
  -d '{"url1": "https://template1.webflow.io", "url2": "https://template2.webflow.io"}'

# Find templates with duplicate functions
curl https://plagiarism-agent.createsomething.workers.dev/js-duplicates/template-id
```

### 5. Agent-Native Algorithms (v2.2.0)

Classic CS algorithms exposed as **MCP tools for team AI agents**.

> **"Agent-native"** = Designed for team distribution. Any team member's AI agent
> can invoke these tools via MCP to analyze templates for plagiarism.
> 
> **MCP Server**: `packages/webflow-mcp/`
> 
> Available MCP tools:
> - `plagiarism_health` - Check system status
> - `plagiarism_stats` - Algorithm statistics
> - `plagiarism_scan` - Scan URL for similar templates
> - `plagiarism_lsh_index` - Index functions for O(1) lookup
> - `plagiarism_similar_functions` - Find duplicate code
> - `plagiarism_pagerank` - Identify originals vs copies  
> - `plagiarism_pagerank_leaderboard` - Top authoritative templates
> - `plagiarism_detect_frameworks` - Identify JS libraries used
> - `plagiarism_confidence` - Calculate plagiarism probability
> - `plagiarism_exclude` - Mark pair as false positive
> 
> The algorithms are proven CS techniques (LSH 1998, PageRank 1996, Bayesian),
> wrapped as tools for AI agent consumption.
> 
> **Configuration** (add to `.cursor/mcp.json` or Claude Desktop config):
> ```json
> {
>   "mcpServers": {
>     "webflow": {
>       "command": "node",
>       "args": ["packages/webflow-mcp/dist/index.js"]
>     }
>   }
> }
> ```

#### LSH for JS Functions
**O(1) similar function lookup** using MinHash signatures with LSH banding:

- 128-permutation MinHash signatures per function
- 16 LSH bands for O(1) candidate lookup
- Jaccard similarity estimation from signatures

```bash
# Index function LSH signatures
curl -X POST https://plagiarism-agent.createsomething.workers.dev/compute/lsh-index \
  -H "Content-Type: application/json" \
  -d '{"limit": 100}'

# Find similar functions for a template
curl -X POST https://plagiarism-agent.createsomething.workers.dev/compute/similar-functions \
  -H "Content-Type: application/json" \
  -d '{"templateId": "template-id"}'
```

#### PageRank for Template Authority
Identifies **originals vs copies** using graph analysis:

- Builds similarity graph from MinHash comparisons
- Computes PageRank scores (higher = more authoritative)
- Classifies templates as `original`, `derivative`, or `isolated`

```bash
# Compute PageRank (builds graph if needed)
curl -X POST https://plagiarism-agent.createsomething.workers.dev/compute/pagerank \
  -H "Content-Type: application/json" \
  -d '{"threshold": 0.5}'

# Get PageRank leaderboard
curl https://plagiarism-agent.createsomething.workers.dev/compute/pagerank/leaderboard
```

#### Framework Detection
Detects **15+ JavaScript frameworks** with features and version hints:

| Framework | Features Detected |
|-----------|-------------------|
| GSAP | scrolltrigger, splittext, flip, drawsvg, morphsvg |
| Lenis | smooth-scroll, scroll-events |
| Locomotive | smooth-scroll, parallax |
| Barba.js | page-transitions, hooks |
| Swiper | carousel, pagination, navigation, autoplay |
| Splide | carousel, autoscroll |
| Webflow | ix2, ready, ecommerce, forms |
| Finsweet | cms-filter, cms-nest, attributes |
| Three.js | 3d-graphics, webgl |
| Spline | 3d-embed |
| AOS | scroll-animations |
| + more | intersection/resize/mutation observers |

```bash
# Detect frameworks in a template
curl -X POST https://plagiarism-agent.createsomething.workers.dev/compute/frameworks \
  -H "Content-Type: application/json" \
  -d '{"url": "https://template.webflow.io"}'
```

#### Bayesian Confidence Scoring
Multi-signal plagiarism probability using **Bayes' theorem**:

- Combines CSS, JS, structural, and framework evidence
- Weighted factors with configurable priors
- Verdicts: `no_plagiarism`, `possible`, `likely`, `definite`

```bash
# Calculate confidence for a template pair
curl -X POST https://plagiarism-agent.createsomething.workers.dev/compute/confidence \
  -H "Content-Type: application/json" \
  -d '{"templateA": "id1", "templateB": "id2"}'

# Get computational stats
curl https://plagiarism-agent.createsomething.workers.dev/compute/stats
```

## Endpoints

### Dashboard & UI
| Endpoint | Description |
|----------|-------------|
| `GET /dashboard` | Visual dashboard for stats, clusters, scanning |
| `GET /compare/:id1/:id2` | Tufte-style comparison page |
| `GET /case/:id/rescan` | Compliance rescan UI |
| `GET /health` | Health check + sketch stats |

### MinHash API
| Endpoint | Description |
|----------|-------------|
| `POST /scan/template` | Scan URL against index |
| `GET /scan/suspicious` | Find suspicious template pairs |
| `POST /minhash/index` | Index a template |
| `GET /minhash/similar/:id` | Find similar templates |
| `GET /minhash/stats` | Index statistics |
| `POST /compare` | Detailed comparison (JSON) |

### Sketches & JS Analysis (v2.1.0)
| Endpoint | Description |
|----------|-------------|
| `GET /sketches/stats` | Bloom filter + HyperLogLog statistics |
| `POST /js-analysis` | Compare JS between two templates |
| `GET /js-duplicates/:id` | Find templates with duplicate functions |

### Agent-Native Tools (v2.2.0)
| Endpoint | Algorithm | Agent Use Case |
|----------|-----------|----------------|
| `POST /compute/lsh-index` | MinHash + LSH | Index functions for similarity search |
| `POST /compute/similar-functions` | LSH lookup | Find duplicate code across templates |
| `POST /compute/pagerank` | PageRank | Identify original vs derivative templates |
| `GET /compute/pagerank/leaderboard` | PageRank | Rank templates by authority |
| `POST /compute/frameworks` | Regex patterns | Detect JS libraries in templates |
| `POST /compute/confidence` | Bayes' theorem | Score plagiarism probability |
| `GET /compute/stats` | - | Monitor algorithm usage |
| `POST /exclusions` | - | Add false positive exclusion |
| `POST /exclusions/check` | - | Check if pair is excluded |
| `GET /exclusions` | - | List all exclusions |

### Case Management
| Endpoint | Description |
|----------|-------------|
| `POST /webhook` | Airtable webhook receiver |
| `GET /status/:caseId` | Case processing status |
| `GET /case/:id` | Case details + rescan history |
| `POST /case/:id/rescan` | Run compliance rescan |

### Example: Scan a Template
```bash
curl -X POST https://plagiarism-agent.createsomething.workers.dev/scan/template \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.webflow.io"}'
```

**Response:**
```json
{
  "url": "https://example.webflow.io",
  "isIndexed": false,
  "matchCount": 5,
  "topMatches": [
    { "id": "similar-template", "similarity": 0.72, "verdict": "High similarity" }
  ]
}
```

## Editorial Framework

The agent scores each case on 4 dimensions:

| Dimension | Options |
|-----------|---------|
| **Extent** | Minimal, Moderate, Substantial, Extensive |
| **Transformation** | None, Low, Minimal, Moderate, High |
| **Importance** | Peripheral, Minor, Significant, Major |
| **Impact** | Little/no harm, Moderate harm, Significant harm |

These map to the Airtable editorial fields (✏️ prefix).

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for setup instructions.

## Development

```bash
# Install dependencies
npm install

# Run locally
wrangler dev

# Deploy
wrangler deploy

# Tail logs
wrangler tail --name=plagiarism-agent
```

## Vision Analysis

The system supports visual comparison using Cloudflare's free vision models:

- **Model**: `@cf/meta/llama-3.2-11b-vision-instruct`
- **Analyzes**: Layout, design elements, typography, color schemes, spacing, component structure
- **Storage**: Screenshots in R2 bucket (`{caseId}/original.jpg` and `{caseId}/copy.jpg`)
- **Trigger**: Vision analysis runs automatically if screenshots exist
- **Fallback**: System works perfectly without screenshots (text-only analysis)

### Manual Screenshot Upload

To enable vision analysis for a specific case:

```bash
# Upload screenshots to R2
wrangler r2 object put "plagiarism-screenshots/case_abc123/original.jpg" --file=./original.jpg
wrangler r2 object put "plagiarism-screenshots/case_abc123/copy.jpg" --file=./copy.jpg
```

The worker will automatically use these screenshots for vision analysis in Tier 1 and Tier 2.

### Future: Automatic Screenshot Capture

Browser Rendering API integration can be added to automatically capture screenshots. The code is ready - just needs Browser Rendering enabled in the Cloudflare account.

## Cost

**MinHash Detection**: $0 (runs on Cloudflare Workers compute)

**AI Tier System** (50 reports/month):
- Screenshot Capture: FREE (Browser Rendering)
- Vision Analysis: FREE (Workers AI)
- Tier 1: FREE (Workers AI)
- Tier 2: ~$0.70 (Claude Haiku)
- Tier 3: ~$1.50 (Claude Sonnet)
- **Total: ~$2.20/month**

vs. **$625/month** for 12.5 hours of manual review.

## Compliance Rescan

When a case is flagged as "minor", the offending creator can make changes:

```
POST /case/:id/rescan
```

**Verdicts:**
- `resolved` - Similarity < 35% AND drift ≥ 20%
- `insufficient_changes` - Drift < 10%  
- `still_similar` - Changes made but still too similar
- `no_baseline` - Case pre-dates signature capture

## Monitoring

**Health check endpoint:**
```bash
curl https://plagiarism-agent.createsomething.workers.dev/health
```

**Response:**
```json
{
  "status": "healthy",
  "stats": {
    "templatesIndexed": 9592,
    "casesProcessed": 14,
    "lshBands": 153472
  },
  "version": "2.0.0"
}
```

## Safety Mechanisms

### Confidence Threshold for Auto-Delisting

To prevent **Enframing** (automation replacing human judgment), major violations with confidence < 90% are flagged for human review instead of auto-delisting:

```typescript
const MAJOR_VIOLATION_CONFIDENCE_THRESHOLD = 0.9;

// Low confidence major violations flagged, not auto-acted upon
if (decision === 'major' && confidence < 0.9) {
  outcome = `Flagged for review (confidence: ${confidence * 100}%)`;
} else {
  outcome = 'Delisted template'; // High confidence auto-action
}
```

This ensures high-stakes decisions receive human oversight when the AI is uncertain.

## Recent Improvements

**False Positive Handling (Jan 2026 - v2.3.0)**:
- ✅ **Exclusion table** - Store legitimately similar pairs
- ✅ **Automatic check** - `/compute/confidence` returns `{excluded: true}` for known pairs
- ✅ **MCP tool** - `plagiarism_exclude` for editorial workflow

```bash
# Add exclusion (false positive)
curl -X POST https://plagiarism-agent.createsomething.workers.dev/exclusions \
  -H "Content-Type: application/json" \
  -d '{"templateA": "id1", "templateB": "id2", "reason": "same_author"}'

# Check if pair is excluded
curl -X POST https://plagiarism-agent.createsomething.workers.dev/exclusions/check \
  -H "Content-Type: application/json" \
  -d '{"templateA": "id1", "templateB": "id2"}'
```

See migration `0019_similarity_exclusions.sql`.

**Agent-Native Algorithms (Jan 2026 - v2.2.0)**:
Classic CS algorithms exposed as MCP tools for AI agent invocation:
- ✅ **LSH for JS Functions** - O(1) similar function lookup via MinHash (1998)
- ✅ **PageRank for Authority** - Graph centrality for original vs copy detection (1996)
- ✅ **Framework Detection** - 15+ JS library fingerprints via regex patterns
- ✅ **Bayesian Confidence** - Multi-signal plagiarism probability scoring
- ✅ **MCP Integration** - Tools available via `webflow-mcp` server
- ✅ **7 HTTP Endpoints** - `/compute/*` for direct API access

See migration `0018_computational_algorithms.sql` for new tables.
See `packages/webflow-mcp/` for the dedicated MCP server.

**Ground MCP Integration (Jan 2026 - v2.1.0)**:
- ✅ **Bloom Filter** - Fast "have we indexed this URL?" pre-check (skip DB queries)
- ✅ **HyperLogLog** - Count unique templates/colors/patterns without COUNT(*)
- ✅ **JS Function Detection** - Catch component-level plagiarism via AST analysis
- ✅ **Animation Fingerprints** - Detect copied GSAP/ScrollTrigger configurations
- ✅ **D1 Persistence** - Sketches survive Worker restarts

See migration `0017_plagiarism_sketches.sql` for new tables.

**Heideggerian Code Review (Jan 2026)**:
- ✅ **Unified case closure** - 4 functions → 1 with decision mapping
- ✅ **DRY compliance** - Extracted vision analysis, JSON parsing
- ✅ **Removed dead code** - Browser binding, unused tables (`creator_violations`, `plagiarism_queue_metrics`), `tier3_flags_human` column
- ✅ **Confidence threshold** - Major violations flagged for review below 90% confidence
- ✅ **Centralized constants** - Cost values, Airtable field mappings

See migration `0012_cleanup_unused_plagiarism_schema.sql` for database cleanup.

## Canon Reflection

This worker embodies **Zuhandenheit** (ready-to-hand): when it works correctly, the infrastructure disappears. Template marketplace administrators see decisions in Airtable—not queues, tiers, or AI models.

The three-tier architecture is **subtractive**:
- Tier 1 removes the obvious (30%)
- Tier 2 removes the analyzable (50% more)
- Tier 3 handles only what genuinely requires judgment (20%)

**Weniger, aber besser**: Less human time, better consistency, same quality of decisions.
