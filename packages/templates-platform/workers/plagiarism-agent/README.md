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
│                    ┌────────▼────────┐                          │
│                    │    Dashboard    │                          │
│                    │   /dashboard    │                          │
│                    └─────────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Two Detection Systems

### 1. MinHash Fingerprinting ($0 cost)
- **9,500+ templates indexed** with LSH banding
- **Property-value focused** - catches plagiarism even when class names change
- **Evidence hierarchy**: Identical rules → Property combos → Colors → Structure
- **O(1) candidate lookup** via Locality-Sensitive Hashing

### 2. AI Tier System (for reported cases)
1. **Tier 1** (Workers AI - FREE): Vision-based screening
2. **Tier 2** (Claude Haiku - $0.02): Detailed analysis
3. **Tier 3** (Claude Sonnet - $0.15): Edge case judgment

## Endpoints

### Dashboard & UI
| Endpoint | Description |
|----------|-------------|
| `GET /dashboard` | Visual dashboard for stats, clusters, scanning |
| `GET /compare/:id1/:id2` | Tufte-style comparison page |
| `GET /case/:id/rescan` | Compliance rescan UI |
| `GET /health` | Health check for monitoring |

### MinHash API
| Endpoint | Description |
|----------|-------------|
| `POST /scan/template` | Scan URL against index |
| `GET /scan/suspicious` | Find suspicious template pairs |
| `POST /minhash/index` | Index a template |
| `GET /minhash/similar/:id` | Find similar templates |
| `GET /minhash/stats` | Index statistics |
| `POST /compare` | Detailed comparison (JSON) |

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
