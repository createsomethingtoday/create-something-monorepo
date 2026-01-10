# Plagiarism Detection Agent

**Three-tier AI system for reviewing template plagiarism reports with visual analysis.**

Reduces manual review time from 12.5 hours/month to automated decisions in 1-2 minutes per case.

## How It Works

1. **Airtable webhook** triggers when new plagiarism report is created
2. **Screenshot Capture** (Cloudflare Browser Rendering - FREE): Captures both templates
3. **Vision Analysis** (Cloudflare Workers AI - FREE): Compares layouts visually using Llama 3.2 Vision
4. **Tier 1** (Workers AI - FREE): Screens obvious cases with vision input (filters ~30%)
5. **Tier 2** (Claude Haiku - $0.02): Detailed analysis with editorial scores + vision (~70% of cases)
6. **Tier 3** (Claude Sonnet - $0.15): Final judgment on edge cases (~20% of original cases)
7. **Airtable updated** with Decision, Outcome, and editorial scores

## Endpoints

### POST /webhook
Receives Airtable webhook payloads for new plagiarism reports.

**Response:**
```json
{
  "caseId": "case_abc123",
  "status": "queued",
  "estimatedTime": "1-2 minutes"
}
```

### GET /status/:caseId
Check processing status of a case.

**Response:**
```json
{
  "id": "case_abc123",
  "status": "completed",
  "final_decision": "minor",
  "cost_usd": 0.02,
  "completed_at": 1704923456789
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

**Estimated monthly cost** (50 reports):
- Screenshot Capture: FREE (Browser Rendering included with Workers)
- Vision Analysis: FREE (Workers AI)
- Tier 1: FREE (Workers AI)
- Tier 2: ~$0.70 (Claude Haiku)
- Tier 3: ~$1.50 (Claude Sonnet)
- **Total: ~$2.20/month**

vs. **$625/month** for 12.5 hours of manual review.

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
