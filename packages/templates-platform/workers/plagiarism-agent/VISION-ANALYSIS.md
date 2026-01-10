# Vision Analysis Enhancement

## What Was Added

The plagiarism detection system now supports **visual comparison** using Cloudflare's free AI vision models. This provides actual screenshot analysis instead of relying solely on text descriptions.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  1. Webhook receives case                                    │
├─────────────────────────────────────────────────────────────┤
│  2. Check R2 for screenshots                                │
│     • {caseId}/original.jpg                                 │
│     • {caseId}/copy.jpg                                     │
├─────────────────────────────────────────────────────────────┤
│  3. If screenshots exist:                                   │
│     → Run vision analysis (Llama 3.2 Vision - FREE)         │
│     → Get detailed visual comparison                        │
├─────────────────────────────────────────────────────────────┤
│  4. Tier 1 screening                                        │
│     • Text analysis + vision insights (if available)        │
│     • Decision: obvious_not | obvious_yes | needs_analysis  │
├─────────────────────────────────────────────────────────────┤
│  5. Tier 2 analysis (if needed)                            │
│     • Claude Haiku + vision insights (if available)         │
│     • Editorial scores + detailed reasoning                 │
└─────────────────────────────────────────────────────────────┘
```

## Vision Model

**Model**: [`@cf/meta/llama-3.2-11b-vision-instruct`](https://developers.cloudflare.com/workers-ai/models/)

**Capabilities**:
- Layout comparison
- Design element detection
- Typography analysis
- Color scheme comparison
- Spacing and proportion analysis
- Component structure recognition

**Cost**: FREE (included with Workers AI)

## How to Use

### Option 1: Manual Screenshot Upload

For cases where you have screenshots:

```bash
# Upload screenshots for case case_abc123
wrangler r2 object put "plagiarism-screenshots/case_abc123/original.jpg" \
  --file=./screenshots/original.jpg

wrangler r2 object put "plagiarism-screenshots/case_abc123/copy.jpg" \
  --file=./screenshots/copy.jpg
```

The worker automatically detects and uses these screenshots for vision analysis.

### Option 2: Automatic Capture (Future)

Browser Rendering API integration ready but not yet enabled. To enable:

1. Ensure Browser Rendering is active in Cloudflare account
2. Uncomment screenshot capture code in `src/index.ts`
3. Test with: `wrangler dev`

## Example Vision Analysis Output

```
Visual Comparison Analysis:

Both websites share similar layout structures with hero sections and
navigation bars. However, key differences include:

1. Color Schemes: Original uses dark theme (#1a1a1a) while copy uses
   light theme (#ffffff)

2. Typography: Original employs sans-serif (Inter) throughout, copy
   uses serif headings (Merriweather)

3. Component Spacing: Original has 24px grid spacing, copy uses 16px

4. Hero Layout: While both use centered hero text, original overlays
   text on image, copy separates with two-column layout

5. Navigation: Original fixed header with 5 items, copy has mobile
   hamburger menu

Overall Assessment: Layouts follow similar patterns but sufficient
transformation in execution to suggest independent work rather than
direct copying.
```

## Database Schema

Screenshot metadata is tracked:

```sql
tier2_screenshot_ids TEXT, -- JSON array: ["case_id/original.jpg", "case_id/copy.jpg"]
```

## API Endpoints

### Check if Vision Was Used

```bash
curl https://plagiarism-agent.createsomething.workers.dev/status/case_abc123
```

Response includes whether vision analysis ran:

```json
{
  "id": "case_abc123",
  "status": "completed",
  "tier1_decision": "needs_analysis",
  "tier2_decision": "minor",
  "final_decision": "minor",
  "cost_usd": 0.02,
  "tier2_screenshot_ids": "[\"case_abc123/original.jpg\", \"case_abc123/copy.jpg\"]"
}
```

## Cost Analysis

**With Vision** (50 reports/month):
- Screenshot storage: FREE (R2)
- Vision analysis: FREE (Workers AI)
- Tier 1: FREE (Workers AI)
- Tier 2: ~$0.70 (Claude Haiku)
- Tier 3: ~$1.50 (Claude Sonnet)
- **Total: ~$2.20/month**

**Same cost** as text-only! Vision analysis adds zero additional cost.

## Fallback Behavior

The system **gracefully degrades** if screenshots aren't available:

| Scenario | Behavior |
|----------|----------|
| Screenshots exist | Full vision + text analysis |
| Screenshots missing | Text-only analysis (original behavior) |
| Vision API fails | Falls back to text-only, logs error |
| R2 unavailable | Falls back to text-only, logs error |

## Testing

Test vision analysis with manual screenshots:

```bash
# 1. Create test case
CASE_ID=$(curl -s -X POST https://plagiarism-agent.createsomething.workers.dev/webhook \
  -H "Content-Type: application/json" \
  -d '{"recordId":"recTEST","fields":{...}}' | jq -r '.caseId')

# 2. Upload screenshots
wrangler r2 object put "plagiarism-screenshots/$CASE_ID/original.jpg" --file=./test1.jpg
wrangler r2 object put "plagiarism-screenshots/$CASE_ID/copy.jpg" --file=./test2.jpg

# 3. Check processing (vision analysis will run automatically)
curl https://plagiarism-agent.createsomething.workers.dev/status/$CASE_ID
```

## Limitations

**Current**:
- No automatic screenshot capture (manual upload required)
- Above-the-fold analysis only (when capture is implemented)
- Single viewport size (1920x1080)

**Future Enhancements**:
- Browser Rendering API integration for auto-capture
- Responsive viewport testing (mobile, tablet, desktop)
- Full-page screenshot comparison
- Element-level diff highlighting

## Sources

- [Cloudflare Workers AI Models](https://developers.cloudflare.com/workers-ai/models/)
- [Browser Rendering REST API](https://developers.cloudflare.com/browser-rendering/rest-api/screenshot-endpoint/)
- [Workers Bindings Documentation](https://developers.cloudflare.com/browser-rendering/workers-bindings/screenshots/)
- [Llama 3.2 Vision Model](https://www.llama.com/docs/model-cards-and-prompt-formats/llama3_2/)

## Canon Reflection

This enhancement embodies **Zuhandenheit** - when vision analysis works, it completely recedes. Users see better decisions without knowing whether vision was used. The infrastructure disappears; only improved accuracy remains.

**Weniger, aber besser**: Less manual review, better plagiarism detection, same cost.
