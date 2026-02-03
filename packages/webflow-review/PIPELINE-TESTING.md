# Pipeline Testing Guide

Complete console-based testing of the Webflow review pipeline with real HTML.

---

## Quick Start

```bash
cd packages/webflow-review

# Test with default URL (new-clann preview)
node test-full-pipeline.js

# Test with custom URL
node test-full-pipeline.js "https://preview.webflow.com/preview/your-site?preview=xxx"
```

---

## What It Does

The full pipeline test:

1. **Fetches** the actual Webflow preview page HTML
2. **Runs** SEO and link validation checks
3. **Calculates** an overall score (0-100)
4. **Displays** findings grouped by severity
5. **Shows** agent-style natural language query responses

**No deployment needed** - runs entirely locally using Node.js.

---

## Example Output

```
╔═══════════════════════════════════════════════════════════════╗
║         Webflow Template Review - Full Pipeline Test         ║
╚═══════════════════════════════════════════════════════════════╝

📡 Fetching: https://preview.webflow.com/preview/new-clann...

✅ Fetched successfully (615ms, 256KB)

🔍 Running checks...

┌─────────────────────────────────────────────────────────────┐
│ Score: 79/100 (Good)
├─────────────────────────────────────────────────────────────┤
│ 🔴 Critical: 1   🟡 Warning: 2   🔵 Info: 1        │
└─────────────────────────────────────────────────────────────┘

🔴 CRITICAL (1)
────────────────────────────────────────────────────────────

  [SEO] Missing meta description
  💡 No meta description tag found
  ✅ Auto-fixable

🟡 WARNING (2)
────────────────────────────────────────────────────────────

  [SEO] No H1 heading found
  💡 H1 headings help structure content

  [SEO] Missing Open Graph image (og:image)
  💡 Social media previews will not show an image
```

---

## Agent Query Examples

The pipeline demonstrates how AI agents can parse the results:

### Query 1: "Are there any links missing URLs?"

```javascript
const missingUrlsFinding = findings.find(f => f.message.includes('missing URL'));
if (missingUrlsFinding) {
  console.log(`Yes, ${missingUrlsFinding.evidence.count} links missing URLs`);
  console.log('Examples:', missingUrlsFinding.evidence.examples.map(e => e.text));
} else {
  console.log('No links with missing URLs found.');
}
```

### Query 2: "What SEO issues were found?"

```javascript
const seoFindings = findings.filter(f => f.checkType === 'seo');
console.log(`Found ${seoFindings.length} SEO issues:`);
seoFindings.forEach(f => console.log(`  • ${f.message}`));
```

### Query 3: "Which issues can be auto-fixed?"

```javascript
const autoFixable = findings.filter(f => f.autoFixable);
console.log(`${autoFixable.length} issues can be auto-fixed:`);
autoFixable.forEach(f => console.log(`  • ${f.message}`));
```

---

## Programmatic Usage

You can import the pipeline functions for automated testing:

```javascript
const { runPipeline, checkSEO, validateLinks } = require('./test-full-pipeline.js');

async function automatedTest() {
  const result = await runPipeline('https://example.com');

  if (result.success) {
    console.log(`Score: ${result.score}/100`);
    console.log(`Findings: ${result.findings.length}`);

    // Filter by severity
    const critical = result.findings.filter(f => f.severity === 'critical');
    if (critical.length > 0) {
      console.log('FAIL: Critical issues found');
      process.exit(1);
    }
  } else {
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }
}
```

---

## Check Types

### SEO Checks

| Check | Severity | Auto-Fixable |
|-------|----------|--------------|
| Missing `<title>` | Critical | Yes |
| Title too long (>70 chars) | Warning | Yes |
| Title too short (<10 chars) | Warning | Yes |
| Missing meta description | Critical | Yes |
| Meta description too long (>160 chars) | Warning | Yes |
| No H1 heading | Warning | No |
| Multiple H1 headings | Info | No |
| Images missing alt text | Warning | No |
| Missing Open Graph image | Warning | No |
| No structured data (Schema.org) | Info | No |

### Link Checks

| Check | Severity |
|-------|----------|
| Link missing URL (`href=""` or `href="#"`) | Critical |
| Link uses `javascript:` protocol | Warning |
| Relative links | Info |

---

## Score Calculation

Score starts at 100, penalties are subtracted:

| Severity | Penalty |
|----------|---------|
| Critical | -10 points |
| Warning | -5 points |
| Info | -1 point |

**Example:**
- 1 critical = -10
- 2 warnings = -10
- 1 info = -1
- **Score: 100 - 21 = 79**

**Quality Ratings:**
- 90-100: Excellent (🟢 Green)
- 75-89: Good (🔵 Blue)
- 60-74: Needs Work (🟡 Yellow)
- 0-59: Poor (🔴 Red)

---

## Comparison with Simulated Test

| Feature | Simulated Test | Full Pipeline |
|---------|---------------|---------------|
| HTML Source | Fake/mocked | Real Webflow page |
| HTTP Requests | None | Fetches actual URL |
| Findings | Hardcoded examples | Actual issues found |
| Use Case | Demo response structure | Validate real sites |
| Speed | Instant | ~500-1000ms (network) |

**When to use each:**
- **Simulated** (`test-response-logic.js`): Demo API structure, teach agents response format
- **Full Pipeline** (`test-full-pipeline.js`): Validate real Webflow sites, find actual issues

---

## Testing Multiple URLs

Create a batch test:

```javascript
// test-batch.js
const { runPipeline } = require('./test-full-pipeline.js');

const urls = [
  'https://preview.webflow.com/preview/new-clann?preview=...',
  'https://preview.webflow.com/preview/another-site?preview=...',
  'https://preview.webflow.com/preview/third-site?preview=...',
];

async function batchTest() {
  console.log(`Testing ${urls.length} URLs...\n`);

  for (const url of urls) {
    const result = await runPipeline(url);
    console.log(`${url}: ${result.score}/100 (${result.findings.length} findings)\n`);
  }
}

batchTest();
```

---

## Integration with Workers

This pipeline test uses the **same logic** as the deployed Workers:

| Component | Local Test | Deployed Worker |
|-----------|------------|-----------------|
| SEO Checker | `checkSEO()` function | `workers/seo-checker/src/index.ts` |
| Link Validator | `validateLinks()` function | `workers/link-validator/src/index.ts` |
| Score Calculator | `calculateScore()` function | `workers/orchestrator/src/scoring.ts` |

**Benefit**: Test locally before deploying to Cloudflare.

---

## Next Steps

1. **Test your own Webflow sites**: Replace the URL with your preview URL
2. **Automate CI/CD**: Run tests before deployments
3. **Extend checks**: Add accessibility (a11y) and performance checks
4. **Deploy to Cloudflare**: Use this as validation for Workers deployment

---

## Troubleshooting

### Error: `fetch is not defined`

**Solution**: Node.js 18+ required. Check version:

```bash
node --version  # Should be v18.0.0 or higher
```

### Error: `HTTP 403: Forbidden`

**Cause**: Webflow preview URL expired or requires authentication.

**Solution**: Get a fresh preview URL from Webflow Designer.

### Error: `ENOTFOUND` or `ECONNREFUSED`

**Cause**: Network issue or invalid URL.

**Solution**: Check your internet connection and URL format.

---

## Testing Hidden Content

The Node.js pipeline only tests visible content (no JavaScript execution). To test content in drawers, modals, and interactive states:

### Browser Console Testing

```bash
# 1. Open Webflow preview page
# 2. Open Console (Cmd+Option+J)
# 3. Paste console-injector.js
# 4. Paste console-auto-reveal.js
# 5. Run automatic test
await AutoRevealTest.runFullTest()
```

**What it does:**
- Finds all interactive elements (buttons, toggles, drawers)
- Clicks them automatically with appropriate delays
- Re-checks content after revealing hidden elements
- Compares initial vs revealed findings

**Example output:**
```
🚀 Starting automatic reveal test...
📊 Step 1: Running baseline check...
   Initial score: 79/100
   Initial findings: 4

🔍 Step 2: Finding interactive elements...
   Found 67 total interactive elements

🎯 Step 3: Filtering and prioritizing...
   Testing 12 high-priority elements

👆 Step 4: Clicking elements and waiting for reveals...
   1/12: Clicking .nav-toggle ("Menu")
   2/12: Clicking .drawer-trigger ("Open")
   Successfully clicked: 12/12

🔍 Step 5: Re-checking with revealed content...
   Revealed score: 75/100
   Revealed findings: 6

📈 Step 6: Analyzing differences...

Score change: -4 points
New findings: 2
Fixed findings: 0
Unchanged: 4

🆕 NEW FINDINGS (discovered in hidden content):
   🔴 [LINKS] 2 link(s) missing URL
      Examples: [{text: "Contact", selector: ".nav-link"}]
```

### Manual Console Testing

For more control:

```bash
# Test navigation only
await AutoRevealTest.testNavigationOnly()

# Test modals/drawers only
await AutoRevealTest.testModalsOnly()

# Manually click specific elements
await WebflowReview.clickAndReveal('.nav-toggle')
await WebflowReview.checkVisibleContent()
```

See [HIDDEN-CONTENT-TESTING.md](./HIDDEN-CONTENT-TESTING.md) for complete workflow.

---

## Related Documentation

- [AGENT-TESTING.md](./AGENT-TESTING.md) - How agents interact with API responses
- [HIDDEN-CONTENT-TESTING.md](./HIDDEN-CONTENT-TESTING.md) - Testing drawers, modals, hidden states
- [test-response-logic.js](./test-response-logic.js) - Simulated response testing
- [test-local.sh](./test-local.sh) - Local orchestrator worker testing
- [console-injector.js](./console-injector.js) - Browser console testing script
- [console-auto-reveal.js](./console-auto-reveal.js) - Automated hidden content testing
