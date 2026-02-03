# Hidden Content Testing Workflow

Complete workflow for testing Webflow pages including content hidden in drawers, modals, and interactive states.

---

## Quick Start

```bash
# 1. Open Webflow preview page in Chrome
# 2. Open Console (Cmd+Option+J)
# 3. Paste console-injector.js contents
# 4. Run initial check
await WebflowReview.runFullCheck()

# 5. Find interactive elements
const interactive = WebflowReview.findInteractiveElements()

# 6. Click elements to reveal content
await WebflowReview.clickAndReveal('.nav-toggle')
await WebflowReview.clickAndReveal('.drawer-button')

# 7. Re-check with revealed content
await WebflowReview.checkVisibleContent()
```

---

## The Problem

Webflow sites often hide content in:
- **Navigation drawers** (mobile menus)
- **Modals** (popups, overlays)
- **Tabs** (content panels)
- **Accordions** (expandable sections)
- **Carousels** (hidden slides)

Standard checks miss this content because it's initially hidden (`display: none`).

---

## The Solution: Two-Pass Testing

### Pass 1: Initial State
Check the page as it loads (visible content only).

```javascript
const initialResults = await WebflowReview.runFullCheck()
console.log(`Initial score: ${initialResults.score}/100`)
console.log(`Findings: ${initialResults.findings.length}`)
```

### Pass 2: Revealed State
Click interactive elements, then re-check.

```javascript
// Find what's clickable
const interactive = WebflowReview.findInteractiveElements()
console.log(`Found ${interactive.length} interactive elements`)

// Click each one (manually or programmatically)
for (const el of interactive.slice(0, 5)) {
  await WebflowReview.clickAndReveal(el.selector)
  await new Promise(r => setTimeout(r, 500)) // Wait for animation
}

// Re-check
const revealedResults = await WebflowReview.checkVisibleContent()
console.log(`After reveal score: ${revealedResults.score}/100`)
console.log(`New findings: ${revealedResults.findings.length}`)
```

---

## Systematic Testing Process

### Step 1: Page Discovery

Use `console-batch-tester.js` to find all pages:

```javascript
// Paste console-batch-tester.js in console
const result = await WebflowBatchReview.discoverAndTestAll()
console.log(`Discovered ${result.discoveredPages.length} pages`)

// Export for batch testing
WebflowBatchReview.exportForNodeTesting()
// Copy the output
```

### Step 2: Test Each Page

For each discovered page URL:

1. **Navigate to the page**
   ```
   https://preview.webflow.com/preview/dishora/page-name
   ```

2. **Paste console-injector.js**
   ```javascript
   // Paste entire console-injector.js file
   ```

3. **Run initial check**
   ```javascript
   const initial = await WebflowReview.runFullCheck()
   ```

4. **Find interactive elements**
   ```javascript
   const interactive = WebflowReview.findInteractiveElements()
   console.table(interactive.map(el => ({
     selector: el.selector,
     text: el.text,
     visible: el.visible
   })))
   ```

5. **Manually reveal content**
   - Click hamburger menus
   - Open drawers
   - Trigger modals
   - Expand accordions

6. **Re-check**
   ```javascript
   const revealed = await WebflowReview.checkVisibleContent()
   ```

7. **Compare results**
   ```javascript
   console.log('Initial findings:', initial.findings.length)
   console.log('Revealed findings:', revealed.findings.length)
   console.log('Difference:', revealed.findings.length - initial.findings.length)
   ```

### Step 3: Document Findings

Create a testing log:

```markdown
# Testing Log: Dishora Template

## Page: Home (/)
- Initial score: 79/100
- Interactive elements found: 67
- Revealed score: 85/100 (after opening nav drawer)
- New issues found:
  - Nav drawer link missing URL: "Contact"

## Page: About (/about)
- Initial score: 82/100
- Interactive elements found: 45
- Revealed score: 82/100 (no hidden content)
```

---

## Common Interactive Element Patterns

The `findInteractiveElements()` function looks for:

| Pattern | What It Finds |
|---------|---------------|
| `button[data-toggle]` | Toggle buttons |
| `button[aria-expanded]` | Expandable sections |
| `[data-drawer]` | Drawer triggers |
| `[data-modal]` | Modal triggers |
| `.hamburger` | Mobile menu buttons |
| `.menu-button` | Generic menu buttons |
| `.nav-toggle` | Navigation toggles |
| `[role="button"]` | ARIA button roles |
| `button:not([type="submit"])` | Non-form buttons |

---

## Example: Testing Dishora Template

Based on the console output showing 67 interactive elements:

```javascript
// 1. Run initial check (already done)
// Score: 79/100
// 1 Critical: Missing meta description
// 2 Warnings: No H1, Missing OG image
// 1 Info: No structured data

// 2. Find what's interactive
const interactive = WebflowReview.findInteractiveElements()
console.log(`Found ${interactive.length} interactive elements`)

// Output showed 67 elements - likely includes:
// - Navigation menu toggle
// - Modal triggers
// - Accordion buttons
// - Tab controls

// 3. Test hypothesis: Are there hidden links in navigation drawer?
await WebflowReview.clickAndReveal('.nav-toggle')
// OR manually click the hamburger icon

// 4. Re-check for new link issues
const afterNav = await WebflowReview.checkVisibleContent()

// 5. Look for differences
const newLinkIssues = afterNav.findings.filter(f =>
  f.checkType === 'links' &&
  !initial.findings.find(i => i.message === f.message)
)

if (newLinkIssues.length > 0) {
  console.log('Found new link issues in hidden navigation:')
  console.table(newLinkIssues)
}
```

---

## Automation Considerations

### Why Not Fully Automate?

1. **Same-origin policy**: Can't navigate between pages from console
2. **Animation timing**: Need to wait for transitions (varies by site)
3. **Click targets**: Some elements require specific user interactions
4. **False positives**: Clicking everything could trigger unintended actions

### What CAN Be Automated

Within a single page:

```javascript
async function testAllInteractive() {
  const initial = await WebflowReview.runFullCheck()
  const interactive = WebflowReview.findInteractiveElements()

  console.log(`Testing ${interactive.length} interactive elements...`)

  for (const el of interactive) {
    try {
      await WebflowReview.clickAndReveal(el.selector)
      await new Promise(r => setTimeout(r, 500))
    } catch (err) {
      console.warn(`Failed to click ${el.selector}:`, err.message)
    }
  }

  const final = await WebflowReview.checkVisibleContent()

  return {
    initial: initial.findings.length,
    final: final.findings.length,
    discovered: final.findings.length - initial.findings.length
  }
}

// Run it
const results = await testAllInteractive()
console.log('Results:', results)
```

---

## Best Practices

### DO
- ✅ Test visible content first (baseline)
- ✅ Document which elements you clicked
- ✅ Wait for animations to complete
- ✅ Re-check after each reveal
- ✅ Compare initial vs revealed findings

### DON'T
- ❌ Click submit buttons or CTAs
- ❌ Assume all 67 elements need testing
- ❌ Skip the initial baseline check
- ❌ Forget to document your testing process
- ❌ Test on production sites (use preview URLs)

---

## Integration with Full Pipeline

After manual console testing, use Node.js pipeline for final validation:

```bash
# 1. Console testing found the issues
# 2. Now validate with Node.js pipeline

node test-full-pipeline.js "https://preview.webflow.com/preview/dishora?preview=xxx"
```

**Limitation**: Node.js pipeline only sees initial state (no JavaScript execution).

**Solution**: Use console testing for comprehensive checks, Node.js for quick validation.

---

## Troubleshooting

### "Element not found" error

```javascript
// Check if selector is correct
const el = document.querySelector('.nav-toggle')
console.log('Found:', el)

// Try more general selector
await WebflowReview.clickAndReveal('button')
```

### Animation takes longer than 500ms

```javascript
// Increase wait time
await WebflowReview.clickAndReveal('.nav-toggle')
await new Promise(r => setTimeout(r, 2000)) // Wait 2 seconds
```

### Too many elements to test manually

```javascript
// Filter to likely candidates
const interactive = WebflowReview.findInteractiveElements()
const filtered = interactive.filter(el =>
  el.selector.includes('nav') ||
  el.selector.includes('menu') ||
  el.selector.includes('drawer')
)
console.log(`Filtered to ${filtered.length} navigation-related elements`)
```

---

## Next Steps

1. **Document findings** in a shared spreadsheet
2. **Create issue list** for each page tested
3. **Prioritize fixes** (Critical > Warning > Info)
4. **Re-test after fixes** to validate improvements

---

## Related Documentation

- [console-injector.js](./console-injector.js) - Main testing script
- [console-batch-tester.js](./console-batch-tester.js) - Page discovery
- [AGENT-TESTING.md](./AGENT-TESTING.md) - Agent interaction patterns
- [PIPELINE-TESTING.md](./PIPELINE-TESTING.md) - Node.js testing guide
