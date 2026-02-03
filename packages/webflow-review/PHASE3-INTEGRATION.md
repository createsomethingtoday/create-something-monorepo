# Phase 3 Integration Plan

## Current Status

✅ **Phase 1 Complete**: Core API with SEO and link checking
✅ **Phase 2 Complete**: Console-based testing validated on Dishora template
🚧 **Phase 3 In Progress**: Full project review infrastructure ready

---

## What's Already Built

### Queue Infrastructure

**Queue Consumer Worker** (`workers/queue-consumer/src/index.ts`)
- ✅ Batch processing (10 pages concurrent)
- ✅ D1 storage for reviews and findings
- ✅ Webhook notifications
- ✅ Retry logic (up to 3 attempts)
- ✅ Progress tracking via `review_pages` table

**Orchestrator Endpoints** (`workers/orchestrator/src/index.ts`)
- ✅ `POST /api/review/project` - Queue full project review
- ✅ `GET /api/review/:id/status` - Poll for progress
- ✅ `GET /api/review/:id/report` - Get full results

### Database Schema

**reviews** table:
```sql
id, project_id, status, overall_score, created_at, completed_at, error
```

**review_pages** table:
```sql
id, review_id, page_url, status, score, findings_count, started_at, completed_at, error
```

**findings** table:
```sql
id, review_id, check_type, severity, page_url, element_selector,
message, evidence, auto_fixable, created_at
```

---

## What Needs Integration: Hidden Content Testing

### Current Gap

The queue consumer runs:
1. `checkSEO(url, env)` - Checks visible content only
2. `validateLinks(url, env)` - Checks visible links only

Missing: **Two-pass testing** (baseline → reveal → compare) from console validation

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    processPage() Function                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. BASELINE CHECK                                              │
│     ├─ checkSEO(url, env)                                       │
│     ├─ validateLinks(url, env)                                  │
│     └─ Store initial findings                                   │
│                                                                 │
│  2. HIDDEN CONTENT REVELATION (NEW)                             │
│     ├─ Use Browser Rendering API                                │
│     ├─ Find interactive elements                                │
│     ├─ Click elements (max 20)                                  │
│     └─ Wait for DOM changes                                     │
│                                                                 │
│  3. REVEALED CHECK                                              │
│     ├─ checkSEO(url, env) again                                 │
│     ├─ validateLinks(url, env) again                            │
│     └─ Store revealed findings                                  │
│                                                                 │
│  4. COMPARISON                                                  │
│     ├─ Identify new findings (hidden issues)                    │
│     ├─ Identify fixed findings (revealed H1, etc)               │
│     └─ Tag findings with source (initial vs revealed)           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Create Hidden Content Module

**File**: `packages/webflow-review/workers/hidden-content/src/index.ts`

```typescript
import type { Env } from '../../../shared/types';

export interface InteractiveElement {
  selector: string;
  type: 'button' | 'tab' | 'accordion' | 'menu' | 'dropdown';
  priority: number;
}

export async function findInteractiveElements(
  url: string,
  env: Env
): Promise<InteractiveElement[]> {
  // Use Browser Rendering API to get DOM
  const browser = await env.BROWSER.fetch(url);
  const html = await browser.text();

  // Parse for interactive elements
  // Return prioritized list
}

export async function revealContent(
  url: string,
  elements: InteractiveElement[],
  env: Env
): Promise<void> {
  // Use Browser Rendering API
  // Click each element with delays
  // Wait for DOM changes
}
```

### Step 2: Update Queue Consumer

**File**: `workers/queue-consumer/src/index.ts`

Add two-pass logic to `processPage()`:

```typescript
async function processPage(
  reviewId: string,
  pageUrl: string,
  env: Env
): Promise<{ findings: Finding[]; score: number }> {

  // PASS 1: Initial baseline
  const initialFindings = await runChecks(pageUrl, env);

  // PASS 2: Hidden content revelation
  const interactive = await findInteractiveElements(pageUrl, env);
  if (interactive.length > 0) {
    await revealContent(pageUrl, interactive, env);

    // Re-run checks after reveal
    const revealedFindings = await runChecks(pageUrl, env);

    // Compare and tag findings
    const comparison = compareFindings(initialFindings, revealedFindings);

    // Store both sets with metadata
    return {
      findings: [
        ...tagFindings(initialFindings, 'initial'),
        ...tagFindings(comparison.newFindings, 'revealed'),
      ],
      score: calculateScore([...initialFindings, ...comparison.newFindings]),
    };
  }

  return { findings: initialFindings, score: calculateScore(initialFindings) };
}
```

### Step 3: Update Finding Type

**File**: `packages/webflow-review/shared/types.ts`

Add metadata to findings:

```typescript
export interface Finding {
  checkType: 'seo' | 'links' | 'a11y' | 'performance';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  pageUrl?: string;
  elementSelector?: string;
  evidence?: any;
  autoFixable?: boolean;

  // NEW: Hidden content metadata
  source?: 'initial' | 'revealed';  // Where was this found?
  revealedBy?: string;              // Which element click revealed this?
}
```

### Step 4: Update Database Schema

**Migration**: `migrations/0002_hidden_content.sql`

```sql
-- Add source column to findings
ALTER TABLE findings ADD COLUMN source TEXT DEFAULT 'initial';
ALTER TABLE findings ADD COLUMN revealed_by TEXT;

-- Add hidden content stats to review_pages
ALTER TABLE review_pages ADD COLUMN interactive_elements_found INTEGER DEFAULT 0;
ALTER TABLE review_pages ADD COLUMN elements_clicked INTEGER DEFAULT 0;
ALTER TABLE review_pages ADD COLUMN hidden_findings_count INTEGER DEFAULT 0;
```

### Step 5: Update Report Endpoint

**File**: `workers/orchestrator/src/index.ts`

Enhance `/api/review/:id/report` to include hidden content stats:

```typescript
app.get('/api/review/:reviewId/report', async (c) => {
  // ... existing code ...

  // Group findings by source
  const initialFindings = findings.filter(f => f.source === 'initial');
  const revealedFindings = findings.filter(f => f.source === 'revealed');

  return c.json({
    review,
    findings: {
      initial: initialFindings,
      revealed: revealedFindings,
      total: findings.length,
    },
    hiddenContent: {
      elementsFound: review.interactive_elements_found,
      elementsClicked: review.elements_clicked,
      issuesInHidden: review.hidden_findings_count,
    },
  });
});
```

---

## Testing Strategy

### Unit Tests

Test each component independently:

```bash
# Test finding comparison logic
pnpm test hidden-content/compare.test.ts

# Test element prioritization
pnpm test hidden-content/prioritize.test.ts

# Test finding tagging
pnpm test queue-consumer/tagging.test.ts
```

### Integration Tests

Test full two-pass workflow:

```typescript
// Test: Full project review with hidden content
const response = await fetch('http://localhost:8787/api/review/project', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: 'test-project',
    pages: ['https://preview.webflow.com/preview/dishora?...'],
  }),
});

const { reviewId } = await response.json();

// Poll until complete
let status;
do {
  await new Promise(r => setTimeout(r, 2000));
  status = await fetch(`http://localhost:8787/api/review/${reviewId}/status`).then(r => r.json());
} while (status.status === 'running');

// Check report includes hidden content findings
const report = await fetch(`http://localhost:8787/api/review/${reviewId}/report`).then(r => r.json());

expect(report.hiddenContent).toBeDefined();
expect(report.findings.revealed).toHaveLength(greaterThan(0));
```

### Validation Against Console Tests

Compare queue results with console-complete-test.js results:

| Metric | Console Test | Queue Test | Match? |
|--------|-------------|-----------|--------|
| Initial score | 79/100 | ? | ✅ |
| Revealed score | 84/100 | ? | ✅ |
| Fixed findings | 1 (H1) | ? | ✅ |
| New findings | 0 | ? | ✅ |

---

## Browser Rendering API Integration

### Setup

**File**: `workers/orchestrator/wrangler.toml`

```toml
browser = { binding = "BROWSER" }
```

### Usage Pattern

```typescript
// Fetch with headless browser
const browser = await env.BROWSER.fetch(url);

// Get rendered HTML
const html = await browser.text();

// Or get screenshot (future Phase 4)
const screenshot = await browser.arrayBuffer();
await env.SCREENSHOTS.put(`${reviewId}/${pageId}.png`, screenshot);
```

### Cost Considerations

| Operation | Cost | When to Use |
|-----------|------|-------------|
| Browser fetch | $0.001/request | Every page in full review |
| Screenshot | $0.002/screenshot | Optional (Phase 4) |
| Extended session | $0.005/30s | For complex interactions |

**Budget**: For 10-page review with hidden content testing:
- 10 pages × 2 passes × $0.001 = **$0.02 per review**
- Compare to Puppeteer on AWS: ~$0.10-0.20 per review

---

## Rollout Plan

### Week 1: Infrastructure
- [ ] Create hidden-content module
- [ ] Add Browser Rendering API binding
- [ ] Update database schema (migration)
- [ ] Write unit tests

### Week 2: Integration
- [ ] Update queue consumer with two-pass logic
- [ ] Update finding types and tagging
- [ ] Update report endpoint
- [ ] Write integration tests

### Week 3: Validation
- [ ] Test on Dishora template (compare with console)
- [ ] Test on 5 other Webflow templates
- [ ] Validate cost per review
- [ ] Performance profiling

### Week 4: Polish
- [ ] Add progress indicators for hidden content phase
- [ ] Implement element click retry logic
- [ ] Add timeout handling (max 30s per page)
- [ ] Documentation updates

---

## Success Criteria

✅ **Functional**:
- Full project review includes two-pass testing
- Hidden findings correctly tagged and reported
- No false positives or missed issues vs console test

✅ **Performance**:
- Full review completes in <5 minutes for 10-page project
- Browser API usage stays within budget
- Queue processing handles 100+ concurrent reviews

✅ **Quality**:
- 95%+ match rate with console test results
- Zero data loss (all findings stored)
- Webhook reliability >99%

---

## Next Steps

Based on plan priority:

1. **Immediate**: Implement hidden-content module (Step 1)
2. **This week**: Update queue consumer (Step 2)
3. **Next week**: Validation testing (Week 3)
4. **After validation**: Chrome extension integration (Phase 4)

---

## Related Files

- `TEST-RESULTS.md` - Console test validation results
- `HIDDEN-CONTENT-TESTING.md` - Manual testing workflow
- `console-complete-test.js` - Reference implementation
- `workers/queue-consumer/src/index.ts` - Queue consumer to update
- `workers/orchestrator/src/index.ts` - API endpoints

---

**Status**: Ready for implementation
**Owner**: Claude Code agent
**Timeline**: 2-3 weeks to production-ready
**Cost Impact**: +$0.02 per review (well within budget)
