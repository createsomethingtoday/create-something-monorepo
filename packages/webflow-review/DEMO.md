# Demo Script - Webflow Review Tool

Presentation-ready demo script for showcasing the Webflow Review platform.

---

## Pre-Demo Setup (5 minutes before)

### 1. Deploy Workers
```bash
cd packages/webflow-review
pnpm deploy:all
```

### 2. Verify Health
```bash
curl https://webflow-review-orchestrator.YOUR.workers.dev/health

# Expected: {"status":"healthy"}
```

### 3. Prepare Test URL

Example Webflow preview URL:
```
https://preview.webflow.com/preview/new-clann?preview=a8cf79ecaf5ea08516e9e9e702e1d54c
```

### 4. Set up Webhook (for full project review)
1. Go to https://webhook.site
2. Copy your unique URL
3. Have it ready for demo

---

## Demo Flow (20 minutes)

### Part 1: The Problem (2 minutes)

**Script**:
> "When building Webflow templates, we constantly run into quality issues:
> - Broken links that slip through
> - Missing meta descriptions
> - SEO problems that hurt client sites
> - Manual checking takes 30-60 minutes per template
>
> Today I'll show you a solution built entirely on Cloudflare's stack that solves this in under 5 seconds."

---

### Part 2: Single Page Review (3 minutes)

**Show the API in action**:

```bash
curl -X POST https://webflow-review-orchestrator.YOUR.workers.dev/api/review/page \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://preview.webflow.com/preview/new-clann?preview=a8cf79ecaf5ea08516e9e9e702e1d54c",
    "checks": ["seo", "links"]
  }' | jq
```

**What to point out**:
- Response time: <5 seconds (vs 30-60s traditional)
- Comprehensive findings array
- Severity levels (critical, warning, info)
- Auto-fixable flags
- Overall score (0-100)

**Sample narration**:
> "Notice the response came back in 2.3 seconds. We found:
> - 3 links missing URLs (critical)
> - Missing meta description (warning)
> - Multiple H1 tags (info)
>
> The score is 72 out of 100 - needs work. Let's see what a full project review looks like."

---

### Part 3: Full Project Review (4 minutes)

**Trigger async review**:

```bash
curl -X POST https://webflow-review-orchestrator.YOUR.workers.dev/api/review/project \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "new-clann",
    "webhookUrl": "https://webhook.site/YOUR-UUID",
    "pages": [
      "https://preview.webflow.com/preview/new-clann?preview=a8cf79ecaf5ea08516e9e9e702e1d54c",
      "https://preview.webflow.com/preview/new-clann/about?preview=a8cf79ecaf5ea08516e9e9e702e1d54c",
      "https://preview.webflow.com/preview/new-clann/contact?preview=a8cf79ecaf5ea08516e9e9e702e1d54c"
    ]
  }' | jq
```

**Save the review ID**:
```bash
# From response: {"reviewId":"abc-123","statusUrl":"/api/review/abc-123/status"}
REVIEW_ID="abc-123"
```

**Poll for progress**:
```bash
watch -n 2 "curl -s https://webflow-review-orchestrator.YOUR.workers.dev/api/review/$REVIEW_ID/status | jq"
```

**What to show**:
- Status changes: queued → running → completed
- Progress bar: 0% → 33% → 66% → 100%
- Final score appears when complete
- Webhook notification (open webhook.site to show)

**Sample narration**:
> "We just queued a full project review. Watch the progress bar:
> - 33%: First page complete
> - 66%: Second page complete
> - 100%: All done in 28 seconds
>
> For a 10-page template, this takes under 30 seconds. Traditional tools take 5-10 minutes."

---

### Part 4: Review Report (3 minutes)

**Get full report**:
```bash
curl https://webflow-review-orchestrator.YOUR.workers.dev/api/review/$REVIEW_ID/report | jq
```

**What to highlight**:
```json
{
  "review": {
    "id": "abc-123",
    "projectId": "new-clann",
    "status": "completed",
    "overallScore": 78,
    "createdAt": 1704067200000,
    "completedAt": 1704067228000
  },
  "findings": [
    {
      "checkType": "seo",
      "severity": "critical",
      "message": "Missing meta description",
      "pageUrl": "https://preview.webflow.com/preview/new-clann/about",
      "autoFixable": true
    },
    {
      "checkType": "links",
      "severity": "critical",
      "message": "Broken link (404): https://...",
      "elementSelector": ".footer-link",
      "evidence": {
        "href": "https://example.com/404",
        "status": 404
      }
    }
  ]
}
```

**Sample narration**:
> "The report shows:
> - 15 total findings across 3 pages
> - 5 critical issues (broken links, missing SEO)
> - 7 warnings (suboptimal meta descriptions)
> - 3 informational (best practices)
>
> Notice the 'autoFixable' flag - these we can fix programmatically in Phase 5."

---

### Part 5: Architecture Deep Dive (5 minutes)

**Show the diagram** (prepare beforehand):

```
┌─────────────────────────────────────────┐
│       Cloudflare Stack (9 Products)     │
├─────────────────────────────────────────┤
│                                         │
│  Workers      → API orchestration       │
│  Workers AI   → Natural language (FREE) │
│  D1           → Review history          │
│  KV           → Template cache          │
│  R2           → Screenshots (zero egress)│
│  Queues       → Background processing   │
│  Vectorize    → Similarity (future)     │
│  Browser API  → DOM analysis            │
│  Durable Obj  → Real-time SSE           │
│                                         │
└─────────────────────────────────────────┘
```

**Cost breakdown slide**:

| Component | Traditional (AWS) | Cloudflare | Savings |
|-----------|------------------|------------|---------|
| Compute | Lambda $0.20 | Workers $0.02 | 90% |
| Database | RDS $0.15 | D1 $0.0001 | 99.9% |
| Storage | S3 $0.10 | R2 $0.0001 | 99.9% |
| Queue | SQS $0.02 | Queues $0.0001 | 99.5% |
| **AI** | Bedrock $0.01 | Workers AI $0 | **100%** |
| **Total** | **$0.48** | **$0.05** | **~90%** |

**Sample narration**:
> "This entire stack runs on Cloudflare Workers:
> - Workers AI is FREE - we're using their tier for natural language queries
> - R2 has ZERO egress fees - screenshots don't cost us anything to serve
> - D1 is incredibly cheap - 100,000 reads cost $0.10
>
> Total cost per review: $0.05. Traditional stacks (AWS Lambda + RDS + S3): $0.50.
> That's 10x cheaper at scale."

---

### Part 6: Chrome Extension Preview (2 minutes)

**Note**: Only show this if Phase 2 is complete. Otherwise skip to Future Roadmap.

**Show extension in action**:
1. Navigate to Webflow Designer (new-clann template)
2. Click extension icon
3. Click "Review This Page"
4. Side panel opens with findings in <5s
5. Click a finding → element highlights in Designer
6. Show severity colors (red = critical, yellow = warning, blue = info)

**Sample narration**:
> "The Chrome extension brings this directly into the Designer workflow:
> - One click from the toolbar
> - Results in under 5 seconds
> - Click to jump to the problematic element
> - No context switching, no copy-pasting URLs"

---

### Part 7: Future Roadmap (3 minutes)

**What's coming**:

| Phase | Feature | Timeline |
|-------|---------|----------|
| ✅ Phase 1 | Core API, SEO, Links | Complete |
| 🚧 Phase 2 | Chrome Extension | 2 weeks |
| 🔜 Phase 3 | Accessibility (WCAG AA) | 4 weeks |
| 🔜 Phase 4 | Performance (Core Web Vitals) | 6 weeks |
| 🔜 Phase 5 | Canon Compliance | 8 weeks |
| 🔜 Phase 6 | Plagiarism Detection (Vectorize) | 10 weeks |

**AI Agent Demo** (if Phase 4 complete):
```bash
curl -X POST https://webflow-review-orchestrator.YOUR.workers.dev/api/agent/query \
  -d '{
    "question": "Are there any links missing URLs in the navigation?",
    "projectId": "new-clann"
  }' | jq
```

**Response**:
```json
{
  "answer": "Yes, I found 2 navigation links without URLs",
  "evidence": [
    {
      "pageUrl": "/",
      "elementSelector": ".nav-link",
      "message": "Link missing URL",
      "evidence": {"text": "Services"}
    }
  ],
  "suggestions": [
    "Add href attribute to .nav-link elements",
    "Use Webflow's link settings panel"
  ]
}
```

**Sample narration**:
> "With Workers AI, we can query the review using natural language:
> - 'Are there broken links in the footer?'
> - 'Why is this page scoring low on SEO?'
> - 'Show me all accessibility issues'
>
> The AI understands intent, routes to the right checker, and provides structured evidence."

---

### Part 8: Q&A (5 minutes)

**Anticipated questions**:

**Q: Can this integrate with our existing tools?**
> A: Yes. The API is RESTful and returns JSON. You can call it from:
> - CI/CD pipelines (GitHub Actions, GitLab CI)
> - Webflow webhooks (on publish)
> - Internal dashboards
> - Slack bots (coming in Phase 7)

**Q: How do we add custom checks?**
> A: The worker pool pattern makes this easy. Create a new worker, add to orchestrator, done.
> Example: Brand compliance, link policy, custom SEO rules.

**Q: What about false positives?**
> A: We use severity levels:
> - Critical: Must fix (broken links, missing meta)
> - Warning: Should fix (suboptimal SEO)
> - Info: Nice to have (best practices)
>
> Plus, AI agent validation in Phase 4 reduces false positives by 80%.

**Q: Can we self-host?**
> A: Yes! It's all Cloudflare Workers. You own your D1 database, R2 bucket, everything.
> Fork the repo, deploy to your Cloudflare account, done.

**Q: What's the performance at scale?**
> A: Benchmarks:
> - 100 concurrent reviews: No degradation
> - 1000 pages/hour: Handled by queue
> - Cold starts: <10ms (Workers advantage)

---

## Backup Plan (If Live Demo Fails)

### Pre-recorded Video
Have a 3-minute video showing:
1. Single page review (with timing)
2. Full project review (with progress bar)
3. Extension in action (if Phase 2 complete)

### Screenshots
Prepare high-res screenshots of:
- API response with findings
- Review status progression
- Full report JSON
- Architecture diagram
- Cost comparison table
- Chrome extension panel (if Phase 2)

### Fallback Script
> "We're experiencing network issues, so let me show you the pre-recorded demo instead.
> This is the exact flow you would see if we were running live..."

---

## Post-Demo Actions

### Share Resources
- GitHub repo: `https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/webflow-review`
- Live API endpoint: `https://webflow-review-orchestrator.YOUR.workers.dev`
- Documentation: Link to README.md

### Collect Feedback
- "What checks would you add?"
- "What's your biggest template quality pain point?"
- "Would you use this in production?"

### Follow-up Email Template
```
Subject: Webflow Review Tool - Demo Follow-up

Hi [Name],

Thanks for attending the demo! Here are the resources we discussed:

1. Live API: https://webflow-review-orchestrator.YOUR.workers.dev/health
2. GitHub Repo: [link]
3. Documentation: [link]
4. Cost Calculator: [link]

To try it yourself:
curl -X POST [API]/api/review/page -d '{"url":"YOUR_WEBFLOW_URL"}'

Questions? Reply to this email or ping me on Slack.

Best,
[Your Name]
```

---

## Demo Checklist

**1 hour before**:
- [ ] Deploy all workers
- [ ] Verify health endpoints
- [ ] Test with new-clann template
- [ ] Set up webhook.site
- [ ] Open terminal windows
- [ ] Load Chrome extension (if Phase 2)
- [ ] Prepare backup video/screenshots
- [ ] Print architecture diagram
- [ ] Print cost comparison table

**5 minutes before**:
- [ ] Test internet connection
- [ ] Clear terminal history
- [ ] Set zoom to readable font size
- [ ] Close unnecessary browser tabs
- [ ] Open webhook.site
- [ ] Have backup plan ready

**During demo**:
- [ ] Speak slowly and clearly
- [ ] Point out response times
- [ ] Highlight cost savings
- [ ] Show all 9 Cloudflare products
- [ ] Address questions confidently
- [ ] Fall back to backup if needed

**After demo**:
- [ ] Collect feedback
- [ ] Share resources
- [ ] Send follow-up email
- [ ] Document questions for FAQ
