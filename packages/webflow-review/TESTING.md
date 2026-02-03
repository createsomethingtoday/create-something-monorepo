# Testing Guide - Webflow Review

Comprehensive testing procedures for all phases.

---

## Phase 1: Core API Testing

### Local Development

```bash
# Terminal 1: Start orchestrator
cd packages/webflow-review/workers/orchestrator
pnpm install
pnpm dev

# Terminal 2: Start queue consumer
cd packages/webflow-review/workers/queue-consumer
pnpm install
pnpm dev
```

### Test 1: Health Check

```bash
curl http://localhost:8787/health

# Expected:
{
  "status": "healthy",
  "timestamp": 1704067200000,
  "version": "1.0.0"
}
```

### Test 2: Single Page Review

```bash
curl -X POST http://localhost:8787/api/review/page \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://preview.webflow.com/preview/test-template",
    "checks": ["seo", "links"]
  }'

# Expected response time: <5 seconds
# Expected findings: Array of SEO and link issues
# Expected score: 0-100

# Example response:
{
  "findings": [
    {
      "checkType": "seo",
      "severity": "critical",
      "message": "Missing meta description",
      "pageUrl": "https://...",
      "autoFixable": true
    },
    {
      "checkType": "links",
      "severity": "critical",
      "message": "3 link(s) missing URL",
      "elementSelector": ".nav-link",
      "evidence": {
        "count": 3,
        "examples": [...]
      }
    }
  ],
  "score": 72,
  "duration": 2341
}
```

### Test 3: Database Verification

```bash
# Check that review was logged
wrangler d1 execute webflow-review-db --local \
  --command "SELECT * FROM api_usage ORDER BY created_at DESC LIMIT 5"

# Expected: Recent API call logged
```

### Test 4: SEO Checker Validation

Test various SEO scenarios:

```bash
# Missing title
curl -X POST http://localhost:8787/api/review/page \
  -d '{"url": "https://example.com/no-title"}'

# Title too short
curl -X POST http://localhost:8787/api/review/page \
  -d '{"url": "https://example.com/short-title"}'

# Missing meta description
curl -X POST http://localhost:8787/api/review/page \
  -d '{"url": "https://example.com/no-meta-desc"}'

# Missing H1
curl -X POST http://localhost:8787/api/review/page \
  -d '{"url": "https://example.com/no-h1"}'

# Images without alt text
curl -X POST http://localhost:8787/api/review/page \
  -d '{"url": "https://example.com/missing-alt"}'

# Missing Open Graph
curl -X POST http://localhost:8787/api/review/page \
  -d '{"url": "https://example.com/no-og"}'

# Perfect page (should score 90-100)
curl -X POST http://localhost:8787/api/review/page \
  -d '{"url": "https://example.com/perfect-seo"}'
```

### Test 5: Link Validator Validation

```bash
# Links missing URLs
curl -X POST http://localhost:8787/api/review/page \
  -d '{"url": "https://example.com/empty-links"}'

# Broken links (404)
curl -X POST http://localhost:8787/api/review/page \
  -d '{"url": "https://example.com/broken-links"}'

# JavaScript links
curl -X POST http://localhost:8787/api/review/page \
  -d '{"url": "https://example.com/js-links"}'
```

### Test 6: Full Project Review

```bash
# Trigger async review
REVIEW_ID=$(curl -X POST http://localhost:8787/api/review/project \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-project",
    "pages": [
      "https://preview.webflow.com/preview/test/page-1",
      "https://preview.webflow.com/preview/test/page-2",
      "https://preview.webflow.com/preview/test/page-3"
    ]
  }' | jq -r '.reviewId')

echo "Review ID: $REVIEW_ID"

# Poll for status (every 2s)
watch -n 2 "curl -s http://localhost:8787/api/review/$REVIEW_ID/status | jq"

# Expected progression:
# { "status": "queued", "progress": 0 }
# { "status": "running", "progress": 33 }
# { "status": "running", "progress": 66 }
# { "status": "completed", "progress": 100, "score": 85 }

# Get full report
curl http://localhost:8787/api/review/$REVIEW_ID/report | jq
```

### Test 7: Database Queries

```bash
# All reviews
wrangler d1 execute webflow-review-db --local \
  --command "SELECT id, project_id, status, overall_score FROM reviews"

# Findings for a review
wrangler d1 execute webflow-review-db --local \
  --command "SELECT check_type, severity, message FROM findings WHERE review_id = 'xxx'"

# Review pages status
wrangler d1 execute webflow-review-db --local \
  --command "SELECT page_url, status, score FROM review_pages WHERE review_id = 'xxx'"

# API usage stats
wrangler d1 execute webflow-review-db --local \
  --command "SELECT endpoint, COUNT(*) as calls, AVG(duration_ms) as avg_duration FROM api_usage GROUP BY endpoint"
```

---

## Phase 2: Chrome Extension Testing

### Build Extension

```bash
cd packages/webflow-review/extension
pnpm install
pnpm build
```

### Load in Chrome

1. Navigate to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select `packages/webflow-review/extension/dist/`
5. Extension should appear in toolbar

### Test 1: Content Script Injection

1. Navigate to any Webflow project in Designer
2. Open DevTools Console
3. Look for: `[Webflow Review] Content script loaded`
4. Check that extension icon is active (not grayed out)

### Test 2: Single Page Review from Extension

1. In Webflow Designer, click extension icon
2. Click "Review This Page"
3. Side panel should open within 1 second
4. Findings should appear within 5 seconds
5. Click a finding → should highlight element in Designer
6. Severity colors should be visible:
   - Red = Critical
   - Yellow = Warning
   - Blue = Info

### Test 3: Real-time Updates (SSE)

1. Click "Review This Page"
2. Watch side panel as findings appear
3. Each finding should appear as it's discovered (not all at once)
4. Progress bar should update
5. Final score should appear when complete

### Test 4: Settings Panel

1. Click extension icon → "Settings"
2. Enter API key (if using production)
3. Toggle check preferences:
   - [ ] SEO
   - [ ] Links
   - [ ] Accessibility (future)
   - [ ] Performance (future)
4. Save settings
5. Settings should persist across sessions

---

## Phase 3: Full Project Review Testing

### Test 1: Background Queue Processing

```bash
# Deploy to production
pnpm deploy:all

# Trigger review with webhook
curl -X POST https://webflow-review-orchestrator.YOUR.workers.dev/api/review/project \
  -d '{
    "projectId": "large-project",
    "webhookUrl": "https://webhook.site/YOUR-UUID",
    "pages": [...]  # 10+ pages
  }'

# Monitor queue
wrangler queues list

# Monitor logs
wrangler tail webflow-review-queue-consumer
```

### Test 2: Concurrent Processing

```bash
# Trigger 3 reviews simultaneously
for i in {1..3}; do
  curl -X POST https://webflow-review-orchestrator.YOUR.workers.dev/api/review/project \
    -d "{\"projectId\": \"project-$i\", \"pages\": [...]}" &
done

# All should complete in parallel
# Check D1 for all 3 reviews
```

### Test 3: Webhook Delivery

1. Create webhook at https://webhook.site
2. Trigger project review with webhook URL
3. Wait for completion
4. Verify webhook received POST request with:
   - `reviewId`
   - `projectId`
   - `status: "completed"`
   - `score`
   - `findingsCount`
   - `reportUrl`

---

## Phase 4: AI Agent Testing

### Test 1: Natural Language Query

```bash
curl -X POST https://webflow-review-orchestrator.YOUR.workers.dev/api/agent/query \
  -d '{
    "question": "Are there any links missing URLs?",
    "projectId": "test-project"
  }'

# Expected response:
{
  "answer": "Yes, I found 3 links without URLs in the navigation",
  "evidence": [
    {
      "checkType": "links",
      "severity": "critical",
      "pageUrl": "/",
      "elementSelector": ".nav-link",
      "message": "Link missing URL"
    }
  ],
  "suggestions": [
    "Add href attribute to .nav-link elements",
    "Use Webflow's link settings panel to configure URLs"
  ]
}
```

### Test 2: Different Query Types

```bash
# SEO query
curl -X POST .../api/agent/query \
  -d '{"question": "Why is this page scoring low on SEO?", "projectId": "..."}'

# Accessibility query
curl -X POST .../api/agent/query \
  -d '{"question": "Show me all accessibility issues", "projectId": "..."}'

# Footer-specific query
curl -X POST .../api/agent/query \
  -d '{"question": "What is broken in the footer?", "projectId": "..."}'

# General health query
curl -X POST .../api/agent/query \
  -d '{"question": "Give me a summary of all issues", "projectId": "..."}'
```

---

## Performance Benchmarks

### Target Metrics

| Metric | Target | Acceptable | Unacceptable |
|--------|--------|------------|--------------|
| Single page review | <5s | <10s | >10s |
| Full project (10 pages) | <30s | <60s | >60s |
| Queue processing | <3s/page | <5s/page | >5s/page |
| Extension load | <1s | <2s | >2s |
| SSE latency | <100ms | <500ms | >500ms |

### Load Testing

```bash
# 100 concurrent requests
for i in {1..100}; do
  curl -X POST http://localhost:8787/api/review/page \
    -d '{"url": "https://example.com"}' &
done

# Should complete without timeouts or 429s
```

---

## Error Scenarios

### Test 1: Invalid URL

```bash
curl -X POST http://localhost:8787/api/review/page \
  -d '{"url": "not-a-url"}'

# Expected: 400 Bad Request
# Expected: Error message explaining issue
```

### Test 2: Unreachable URL

```bash
curl -X POST http://localhost:8787/api/review/page \
  -d '{"url": "https://this-domain-does-not-exist-12345.com"}'

# Expected: Findings with critical error
# Expected: Score reflects failure
```

### Test 3: Timeout Handling

```bash
# URL that takes >60s to load
curl -X POST http://localhost:8787/api/review/page \
  -d '{"url": "https://httpstat.us/200?sleep=70000"}'

# Expected: Timeout error in findings
# Expected: Graceful degradation
```

### Test 4: Database Failure

```bash
# Simulate D1 unavailability
# (Manually disable D1 binding in wrangler.toml temporarily)

curl -X POST http://localhost:8787/api/review/page \
  -d '{"url": "https://example.com"}'

# Expected: 500 Internal Server Error
# Expected: Error logged but review still attempted
```

---

## Regression Testing

Before each release:

- [ ] All Phase 1 tests pass
- [ ] All Phase 2 tests pass (if extension built)
- [ ] All Phase 3 tests pass (if queue implemented)
- [ ] Performance benchmarks met
- [ ] Error scenarios handled gracefully
- [ ] Database migrations apply cleanly
- [ ] No TypeScript errors: `pnpm exec tsc --noEmit`
- [ ] Wrangler validates: `wrangler deploy --dry-run`

---

## CI/CD Testing (Future)

```yaml
# .github/workflows/test.yml
name: Test Webflow Review

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: pnpm install
      - run: pnpm test
      - run: wrangler deploy --dry-run
```

---

## Debugging Tips

### Enable Verbose Logging

```typescript
// In workers/orchestrator/src/index.ts
console.log('[DEBUG] Request:', await c.req.json());
console.log('[DEBUG] Findings:', findings);
console.log('[DEBUG] Score:', score);
```

### Tail Worker Logs

```bash
# Real-time logs
wrangler tail webflow-review-orchestrator

# Filtered logs
wrangler tail webflow-review-orchestrator --status error
```

### Inspect D1 Data

```bash
# Open D1 console
wrangler d1 execute webflow-review-db --command "SELECT * FROM reviews ORDER BY created_at DESC LIMIT 10"

# Export to CSV
wrangler d1 export webflow-review-db > backup.sql
```

### Check Queue Status

```bash
# Queue depth
wrangler queues consumer list webflow-review-queue

# Dead letter queue
wrangler queues consumer list webflow-review-dlq
```

---

## Success Criteria

✅ **Phase 1**:
- Single page review completes in <5s
- SEO checker identifies 10+ types of issues
- Link validator detects broken links and missing URLs
- Full project review queues successfully
- Database stores all findings correctly

✅ **Phase 2**:
- Extension loads in Webflow Designer
- Side panel opens within 1s
- Findings appear within 5s
- Element highlighting works

✅ **Phase 3**:
- Queue processes 10 pages in <30s
- Parallel processing handles 10 concurrent reviews
- Webhooks deliver on completion

✅ **Phase 4**:
- AI agent answers natural language queries
- Intent classification is >80% accurate
- Evidence includes relevant findings
- Suggestions are actionable

---

## Demo Readiness Checklist

Before presenting:

- [ ] All workers deployed and healthy
- [ ] Sample Webflow template prepared with known issues
- [ ] Extension loaded and tested
- [ ] Database has sample historical data
- [ ] Webhook endpoint configured (webhook.site)
- [ ] Backup plan if live demo fails (screenshots/video)
- [ ] Cost calculator ready (show $0.05 vs $0.50)
- [ ] Architecture diagram printed
- [ ] Demo script practiced 3x
- [ ] Q&A answers prepared
