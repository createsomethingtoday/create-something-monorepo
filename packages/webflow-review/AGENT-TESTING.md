# Agent Testing Guide - Webflow Review API

How to test the API response logic for agent/console interaction.

---

## Quick Test (Simulated)

**Run the simulated test**:
```bash
cd packages/webflow-review
node test-response-logic.js
```

This shows what the API will return without deploying anything.

**Output**: JSON response with findings, score, and duration

---

## Response Structure

### Top Level

```typescript
{
  findings: Finding[],     // Array of issues found
  score: number,           // 0-100 overall score
  duration: number         // Time taken in milliseconds
}
```

### Finding Object

```typescript
{
  checkType: 'seo' | 'links' | 'a11y' | 'performance',
  severity: 'critical' | 'warning' | 'info',
  message: string,                    // Human-readable description
  pageUrl: string,                    // URL that was checked
  elementSelector?: string,           // CSS selector (if applicable)
  evidence?: Record<string, any>,     // Additional context
  autoFixable?: boolean              // Can this be fixed automatically?
}
```

---

## Agent Interaction Patterns

### Pattern 1: Check for Specific Issues

**Question**: "Are there any links missing URLs?"

**Logic**:
```javascript
const response = await fetch('/api/review/page', { ... });
const data = await response.json();

// Find the specific issue
const missingUrls = data.findings.find(f =>
  f.checkType === 'links' &&
  f.message.includes('missing URL')
);

if (missingUrls) {
  console.log(`Yes, ${missingUrls.evidence.count} links missing URLs`);
  console.log('Examples:', missingUrls.evidence.examples);
} else {
  console.log('No links with missing URLs');
}
```

**Example Output**:
```
Yes, 3 links missing URLs
Examples: [
  { text: 'Services', selector: '.nav-link' },
  { text: 'About Us', selector: '.nav-link' },
  { text: 'Contact', selector: '.footer-link' }
]
```

---

### Pattern 2: Get Summary by Severity

**Question**: "What are the critical issues?"

**Logic**:
```javascript
const critical = data.findings.filter(f => f.severity === 'critical');

console.log(`Found ${critical.length} critical issues:`);
critical.forEach(f => {
  console.log(`- ${f.message}`);
  if (f.elementSelector) {
    console.log(`  Location: ${f.elementSelector}`);
  }
});
```

**Example Output**:
```
Found 2 critical issues:
- Missing meta description
- 3 link(s) missing URL
  Location: .nav-link, .footer-link
```

---

### Pattern 3: Calculate Health Status

**Question**: "How healthy is this page?"

**Logic**:
```javascript
const score = data.score;
const critical = data.findings.filter(f => f.severity === 'critical').length;
const warning = data.findings.filter(f => f.severity === 'warning').length;

let status;
if (score >= 90) status = 'Excellent';
else if (score >= 75) status = 'Good';
else if (score >= 60) status = 'Needs Work';
else status = 'Poor';

console.log(`Score: ${score}/100 (${status})`);
console.log(`Issues: ${critical} critical, ${warning} warnings`);

// Recommendation
if (critical > 0) {
  console.log('⚠️ Fix critical issues immediately');
} else if (warning > 0) {
  console.log('✓ Good, but some improvements recommended');
} else {
  console.log('✅ All checks passed!');
}
```

**Example Output**:
```
Score: 63/100 (Needs Work)
Issues: 2 critical, 3 warnings
⚠️ Fix critical issues immediately
```

---

### Pattern 4: Group by Check Type

**Question**: "What types of issues were found?"

**Logic**:
```javascript
const byType = data.findings.reduce((acc, f) => {
  if (!acc[f.checkType]) {
    acc[f.checkType] = {
      count: 0,
      critical: 0,
      warning: 0,
      info: 0,
      findings: []
    };
  }

  acc[f.checkType].count++;
  acc[f.checkType][f.severity]++;
  acc[f.checkType].findings.push(f);

  return acc;
}, {});

Object.entries(byType).forEach(([type, stats]) => {
  console.log(`${type.toUpperCase()}: ${stats.count} findings`);
  console.log(`  Critical: ${stats.critical}`);
  console.log(`  Warning: ${stats.warning}`);
  console.log(`  Info: ${stats.info}`);
});
```

**Example Output**:
```
SEO: 4 findings
  Critical: 1
  Warning: 2
  Info: 1
LINKS: 3 findings
  Critical: 1
  Warning: 1
  Info: 1
```

---

### Pattern 5: Auto-fixable Issues

**Question**: "Which issues can be fixed automatically?"

**Logic**:
```javascript
const autoFixable = data.findings.filter(f => f.autoFixable === true);

if (autoFixable.length > 0) {
  console.log(`${autoFixable.length} issues can be auto-fixed:`);
  autoFixable.forEach(f => {
    console.log(`- [${f.checkType}] ${f.message}`);
  });
} else {
  console.log('No issues can be auto-fixed automatically');
}
```

**Example Output**:
```
2 issues can be auto-fixed:
- [seo] Missing meta description
- [seo] Title too long (78 chars, maximum 70)
```

---

### Pattern 6: Element Location Mapping

**Question**: "Where are the problematic elements?"

**Logic**:
```javascript
const withSelectors = data.findings.filter(f => f.elementSelector);

const locations = {};
withSelectors.forEach(f => {
  if (!locations[f.elementSelector]) {
    locations[f.elementSelector] = [];
  }
  locations[f.elementSelector].push(f.message);
});

Object.entries(locations).forEach(([selector, issues]) => {
  console.log(`${selector}:`);
  issues.forEach(issue => console.log(`  - ${issue}`));
});
```

**Example Output**:
```
.nav-link:
  - Link missing URL
  - Link missing URL

.footer-link:
  - Link missing URL
```

---

## Testing with Real API

### Step 1: Start Local Server

```bash
cd packages/webflow-review
./test-local.sh
```

This starts the orchestrator worker at `http://localhost:8787`

### Step 2: Test with curl

```bash
curl -X POST http://localhost:8787/api/review/page \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://preview.webflow.com/preview/new-clann?preview=a8cf79ecaf5ea08516e9e9e702e1d54c"
  }' | jq
```

### Step 3: Test with Node.js

```javascript
// test-agent.js
async function testAgent() {
  const response = await fetch('http://localhost:8787/api/review/page', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://preview.webflow.com/preview/new-clann?preview=...'
    })
  });

  const data = await response.json();

  // Agent logic
  console.log('Score:', data.score);
  console.log('Critical issues:',
    data.findings.filter(f => f.severity === 'critical').length
  );

  // Natural language response
  const missingUrls = data.findings.find(f =>
    f.message.includes('missing URL')
  );

  if (missingUrls) {
    console.log(`\nAnswer: Yes, ${missingUrls.evidence.count} links are missing URLs.`);
    console.log('Examples:', missingUrls.evidence.examples.map(e => e.text).join(', '));
  }
}

testAgent();
```

---

## Chrome Extension Testing

The extension uses the same API, but adds UI:

### 1. Background Worker Calls API

```typescript
// background/service-worker.ts
const response = await fetch(`${apiUrl}/api/review/page`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url })
});

const result = await response.json();

// Send to panel
chrome.runtime.sendMessage({
  action: 'reviewComplete',
  result
});
```

### 2. Panel Displays Results

```typescript
// panel/Panel.svelte
function handleReviewResult(result) {
  findings = result.findings;
  score = result.score;

  // Group by severity
  criticalFindings = findings.filter(f => f.severity === 'critical');
  warningFindings = findings.filter(f => f.severity === 'warning');
  infoFindings = findings.filter(f => f.severity === 'info');
}
```

### 3. User Clicks Finding

```typescript
// panel/Panel.svelte
function handleFindingClick(finding) {
  // Send to content script
  chrome.tabs.sendMessage(tabId, {
    action: 'highlightElement',
    selector: finding.elementSelector,
    severity: finding.severity
  });
}
```

### 4. Element Highlights

```typescript
// content/content-script.ts
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'highlightElement') {
    const element = document.querySelector(message.selector);
    element.classList.add(`webflow-review-${message.severity}`);
    element.scrollIntoView({ behavior: 'smooth' });
  }
});
```

---

## Testing Checklist

### API Response Tests

- [ ] Returns valid JSON
- [ ] Has `findings` array
- [ ] Has `score` number (0-100)
- [ ] Has `duration` number
- [ ] All findings have required fields
- [ ] Severity values are valid ('critical', 'warning', 'info')
- [ ] Check types are valid ('seo', 'links', 'a11y', 'performance')

### Agent Interaction Tests

- [ ] Can filter by severity
- [ ] Can filter by check type
- [ ] Can find specific issues by message
- [ ] Can extract evidence
- [ ] Can identify auto-fixable issues
- [ ] Can map element selectors

### Extension Integration Tests

- [ ] Background worker receives response
- [ ] Panel displays findings correctly
- [ ] Score ring shows correct color
- [ ] Findings grouped by severity
- [ ] Click-to-highlight works
- [ ] Evidence details expand/collapse

---

## Common Agent Questions

### "Are there broken links?"

```javascript
const brokenLinks = data.findings.filter(f =>
  f.checkType === 'links' &&
  (f.message.includes('404') || f.message.includes('broken'))
);

console.log(brokenLinks.length > 0 ? 'Yes' : 'No');
```

### "What's wrong with SEO?"

```javascript
const seoIssues = data.findings.filter(f => f.checkType === 'seo');
console.log(seoIssues.map(f => f.message).join('\n'));
```

### "How many critical issues?"

```javascript
const critical = data.findings.filter(f => f.severity === 'critical');
console.log(critical.length);
```

### "Can anything be auto-fixed?"

```javascript
const autoFix = data.findings.filter(f => f.autoFixable);
console.log(autoFix.length > 0 ? 'Yes' : 'No');
```

### "What's the worst issue?"

```javascript
const critical = data.findings.find(f => f.severity === 'critical');
console.log(critical ? critical.message : 'No critical issues');
```

---

## Next Steps

1. **Run simulated test**: `node test-response-logic.js`
2. **Start local server**: `./test-local.sh`
3. **Test with curl**: See "Testing with Real API" above
4. **Build extension**: `cd extension && pnpm build`
5. **Load in Chrome**: See PHASE2.md

---

## Expected Results

### Good Page (90-100)

```json
{
  "findings": [
    { "severity": "info", "message": "No structured data found" }
  ],
  "score": 99,
  "duration": 1234
}
```

### Needs Work (60-74)

```json
{
  "findings": [
    { "severity": "critical", "message": "Missing meta description" },
    { "severity": "warning", "message": "Title too long" },
    { "severity": "info", "message": "Missing canonical URL" }
  ],
  "score": 63,
  "duration": 2341
}
```

### Poor (<60)

```json
{
  "findings": [
    { "severity": "critical", "message": "Missing title" },
    { "severity": "critical", "message": "Missing meta description" },
    { "severity": "critical", "message": "5 broken links" },
    { "severity": "warning", "message": "No H1 heading" },
    { "severity": "warning", "message": "Missing Open Graph" }
  ],
  "score": 45,
  "duration": 3456
}
```

---

**Test the logic anytime**: `node test-response-logic.js`
