# Webflow Site Analyzer MCP

MCP server for analyzing Webflow sites with a **self-improving intelligence layer**. The system observes its own performance and can modify its automation layer based on feedback.

## Framework Tier

This MCP server operates at the following tiers of the [Three-Tier Framework](../../docs/THREE_TIER_FRAMEWORK.md):

| Tier | Role in This Server |
|------|---------------------|
| **Database** | Web pages (URLs) as the source of truth — site structure, SEO metadata, touchpoints, images, performance data, and Webflow Designer metadata (pages, CSS classes, components, CMS collections, assets) |
| **Automation** | Versioned extraction scripts executed through the owned browser contract (`analyze_touchpoints`, `extract_seo`, `get_page_structure`, `analyze_images`, `get_performance`, `capture_screenshot`, `extract_designer_metadata`); Cloudflare Kitesurf and Browser Run Chromium, with Steel/Browserless retained temporarily for rollback; Temporal workflows for durable execution |
| **Judgment** | Self-improving intelligence layer — feedback collection (`record_feedback`), pattern analysis (`run_analysis_cycle`), script version comparison (`compare_versions`), autonomous improvement proposals, and A/B testing of extraction scripts (`promote_version`, `create_script_version`) |

**Primary tier**: Automation — the server's core value is its suite of versioned browser-based extraction tools, though its Judgment tier (self-improvement loop) is a distinguishing architectural feature.

## Architecture: Three Layers

```
┌─────────────────────────────────────────────────────────────────┐
│ INTELLIGENCE LAYER                                              │
│ Observability, feedback, pattern analysis, self-improvement     │
│ Tools: record_feedback, run_analysis_cycle, compare_versions    │
├─────────────────────────────────────────────────────────────────┤
│ AUTOMATION LAYER                                                │
│ Versioned scripts, browser providers, MCP tools                 │
│ Tools: analyze_touchpoints, extract_seo, get_page_structure     │
├─────────────────────────────────────────────────────────────────┤
│ DATABASE LAYER                                                  │
│ URL - The web pages are the source of truth                     │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### Automation Layer
- **Touchpoint Analysis**: Extract all interactive elements (links, buttons, forms, Webflow interactions)
- **SEO Extraction**: Meta tags, headings, links, images, structured data with scoring
- **Page Structure**: Hierarchical section mapping including navbar, footer, hero detection
- **Image Analysis**: Format detection, optimization scoring, accessibility checks
- **Performance Metrics**: Load times, paint timings, resource breakdown
- **Screenshot Capture**: Full-page or viewport screenshots
- **Designer Metadata**: Extract template metadata from Webflow preview URLs:
  - Pages list (static, CMS templates, ecommerce, utility)
  - CSS classes (global HTML tags, custom Webflow classes)
  - Components with usage counts (detect unused components)
  - Interactions/animations (Page load triggers, element triggers)
  - CMS collections with item counts
  - Assets inventory (images, SVGs, videos)
  - Site plan and breakpoints
- **Policy Ingestion (MCP Source of Truth)**: Fetch and normalize canonical review policy from:
  - `https://webflow.com/templates/submission-guidelines`
  - `https://webflow.com/templates/grading-rubric`
  - Includes provenance (`source_url`, fetch timestamp, content hash) and `policyVersion`

### Intelligence Layer (Self-Improvement)
- **Script Versioning**: All extraction scripts are versioned with semantic versioning
- **A/B Testing**: Test new script versions against production with automatic comparison
- **Feedback Collection**: Record extraction quality ratings and specific issues
- **Pattern Analysis**: Identify common failure patterns and problematic URLs
- **Autonomous Proposals**: Generate modification proposals based on feedback
- **Metrics Tracking**: Success rate, duration, items extracted per version

## Installation

```bash
pnpm add @create-something/webflow-site-analyzer-mcp
```

## Configuration

### Browser Providers

The analyzer supports multiple browser automation providers:

| Provider | Best For | Lifecycle | Cost |
|----------|----------|-----------|------|
| **Cloudflare Kitesurf** (primary) | Compatible public, stateless analysis and screenshots | One operation | Free during beta; 3–7× lower CPU/memory than Chromium in Cloudflare's published corpus |
| **Cloudflare Browser Run Chromium** | Sessionful, authenticated, WebGL, bot/TLS-sensitive, and Designer work | Explicitly closed session | Browser Run session pricing |
| **Steel** (temporary rollback) | Incumbent parity and rollback during burn-in | Long-running session | Incumbent pricing |
| **Browserless** (temporary rollback) | Secondary incumbent fallback | Variable | Incumbent pricing |

### Environment Variables

```bash
# Primary managed-browser platform
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_BROWSER_RUN_API_TOKEN=your-browser-rendering-edit-token
BROWSER_RUN_ENABLED=true

# Temporary rollback provider during burn-in
STEEL_API_KEY=your-steel-api-key

# Optional: Streamable HTTP auth + runtime settings (remote mode)
# WEBFLOW_SITE_ANALYZER_MCP_API_KEY=your-shared-bearer-token
# PORT=8788
# WEBFLOW_ANALYZER_REGISTRY_PATH=/var/lib/webflow-site-analyzer/registry.json

# Fallback / local dev: Browserless
BROWSERLESS_TOKEN=your-browserless-token
# BROWSERLESS_API_KEY=your-browserless-token

# Optional: Custom Browserless endpoint
BROWSERLESS_ENDPOINT=wss://chrome.browserless.io

# Optional: queued template-review runtime controls
# WEBFLOW_TEMPLATE_REVIEW_MAX_CONCURRENT_JOBS=2
# WEBFLOW_TEMPLATE_REVIEW_MAX_QUEUE_SIZE=100

# Optional: MCP telemetry stream
MCP_TELEMETRY_ENABLED=true
# MCP_TELEMETRY_PATH=./webflow-site-analyzer.telemetry.jsonl

# Optional: Langfuse tracing
LANGFUSE_ENABLED=true
LANGFUSE_SECRET_KEY=your-langfuse-api-key
# LANGFUSE_PROJECT_NAME=webflow-site-analyzer-mcp
# LANGFUSE_PUBLIC_KEY=your-langfuse-project-id
```

### Provider Selection

The system classifies the operation before execution:

1. Compatible public analysis/screenshots route to Kitesurf, then Browser Run Chromium on failure.
2. Sessionful and Designer operations route directly to Browser Run Chromium.
3. Steel and Browserless remain later ordered fallbacks only while the burn-in gate is open.
4. Set `BROWSER_RUN_ENABLED=false` and redeploy to select the configured incumbent without deleting or rotating credentials. This is an emergency rollback, not a silent runtime fallback.

Every MCP browser result includes `_browser` evidence with the capability,
selected engine, ordered attempts, duration, fallback reason, result SHA-256,
and usage availability. CDP does not return the Quick Action
`X-Browser-Ms-Used` header, so CDP receipts state usage as unavailable instead
of inventing a cost measurement.

See [Browser Run migration and rollback](./docs/BROWSER_RUN_MIGRATION.md).

### Integration test (opt-in)

An integration test runs the configured managed browser against a Webflow preview and asserts on tool output shape. It is **opt-in**: without credentials it skips and exits 0 (CI-friendly).

```bash
# Skip (no credentials)
pnpm test:integration
# → "Integration test skipped: no Browser Run or incumbent browser credentials configured."

# Run against Browser Run + Webflow preview
CLOUDFLARE_ACCOUNT_ID=your-account-id \
CLOUDFLARE_BROWSER_RUN_API_TOKEN=your-token \
pnpm test:integration
# Optional: override preview URL (default: public Woven Wear template)
CLOUDFLARE_ACCOUNT_ID=your-account-id \
CLOUDFLARE_BROWSER_RUN_API_TOKEN=your-token \
WEBFLOW_PREVIEW_URL=https://preview.webflow.com/preview/... \
pnpm test:integration

# Also test the Designer metadata agent (Flow B: panel navigation P, G, A, H, J). Slower (~1–3 min).
RUN_DESIGNER_METADATA_TEST=1 \
CLOUDFLARE_ACCOUNT_ID=your-account-id \
CLOUDFLARE_BROWSER_RUN_API_TOKEN=your-token \
pnpm test:integration
```

In CI, set the Browser Run account/token (and optionally `WEBFLOW_PREVIEW_URL`) to run the test. Set `RUN_DESIGNER_METADATA_TEST=1` to also exercise Chromium Designer metadata extraction. Incumbent credentials still work for rollback-only comparison.

### MCP Configuration

#### Local stdio

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "webflow-site-analyzer": {
      "command": "node",
      "args": ["./packages/webflow-site-analyzer-mcp/dist/index.js"],
      "env": {
        "BROWSERLESS_TOKEN": "${BROWSERLESS_TOKEN}"
      }
    }
  }
}
```

Or with npx:

```json
{
  "mcpServers": {
    "webflow-site-analyzer": {
      "command": "npx",
      "args": ["@create-something/webflow-site-analyzer-mcp"],
      "env": {
        "BROWSERLESS_TOKEN": "${BROWSERLESS_TOKEN}"
      }
    }
  }
}
```

#### Remote Streamable HTTP

The package now also supports a hosted Streamable HTTP endpoint for Hub/downstream use.

```bash
pnpm build
WEBFLOW_SITE_ANALYZER_MCP_API_KEY=your-token \
CLOUDFLARE_ACCOUNT_ID=your-account-id \
CLOUDFLARE_BROWSER_RUN_API_TOKEN=your-token \
PORT=8788 \
pnpm start:http
```

Health endpoint:

```bash
curl -sS http://localhost:8788/health
```

Protected MCP endpoint:

```bash
curl -sS -X POST http://localhost:8788/mcp \
  -H "Authorization: Bearer $WEBFLOW_SITE_ANALYZER_MCP_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Hosted client config:

```json
{
  "mcpServers": {
    "webflow-site-analyzer": {
      "url": "https://your-host.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${WEBFLOW_SITE_ANALYZER_MCP_API_KEY}"
      }
    }
  }
}
```

Notes:
- `WEBFLOW_SITE_ANALYZER_MCP_API_KEY` is preferred for remote auth. `MCP_API_KEY` is still accepted as a fallback.
- `WEBFLOW_ANALYZER_REGISTRY_PATH` lets a hosted Node process keep script-version state outside the repo checkout.
- The Hub registry points at the remote HTTP analyzer endpoint. The Phase B reviewer bundle also includes the remote `webflow-local` compatibility entry for plagiarism and framework analysis.

#### Retired Container-backed Remote Host

The Cloudflare Containers remote host is retired for reviewer workflows. It now
deploys as a quarantine shim: `/` and `/health` report retired status, while MCP
traffic returns `410 Gone` without starting the old analyzer container. Reviewer
hubs should use `webflow-template-review-mcp` published-site validation and
sandbox evidence instead.

```bash
pnpm --dir packages/webflow-site-analyzer-mcp/workers/remote run check
pnpm --dir packages/webflow-site-analyzer-mcp/workers/remote run deploy
```

Files:
- `packages/webflow-site-analyzer-mcp/workers/remote/src/index.ts`
- `packages/webflow-site-analyzer-mcp/workers/remote/wrangler.jsonc`
- `packages/webflow-site-analyzer-mcp/workers/remote/Dockerfile`
- `packages/webflow-site-analyzer-mcp/scripts/prepare-remote-runtime.mjs`

Runtime notes:
- The active Worker no longer binds `AnalyzerContainer` and no longer proxies to `node dist/http.js`.
- `prepare:runtime`, `preflight`, and `Dockerfile` remain as historical rollback context only.
- Rollback requires restoring the container binding config, running the old preflight/runtime preparation, and redeploying through the production promotion path.

The companion marketplace MCP deploys separately:

```bash
infisical run --env=prod --path=/ --include-imports=true -- pnpm run deploy:webflow-local-mcp
```

## Tools

### `analyze_touchpoints`

Extract all interactive elements from a Webflow page.

```typescript
// Input
{
  url: "https://example.webflow.io",
  waitForSelector?: ".hero-section",  // Optional selector to wait for
  timeout?: 60000,                    // Timeout in ms
  includeHidden?: false               // Include hidden elements
}

// Output
{
  url: string,
  timestamp: string,
  totalCount: number,
  byType: {
    link: number,
    button: number,
    form: number,
    input: number,
    cta: number,
    navigation: number,
    interactive: number
  },
  touchpoints: [{
    id: string,
    type: string,
    tag: string,
    selector: string,
    text: string,
    href?: string,
    position: { x, y, width, height },
    attributes: Record<string, string>,
    isVisible: boolean,
    isAboveFold: boolean,
    webflowClass?: string,
    webflowInteraction?: string
  }],
  warnings: string[]
}
```

### `extract_seo`

Extract SEO data with scoring and recommendations.

```typescript
// Input
{
  url: "https://example.webflow.io",
  checkLinks?: false,  // Check for broken links
  timeout?: 60000
}

// Output
{
  url: string,
  timestamp: string,
  title: string,
  description: string,
  canonical?: string,
  metaTags: [{ name?, property?, content }],
  openGraph: Record<string, string>,
  twitterCard: Record<string, string>,
  headings: [{ tag, text, level, order }],
  h1Count: number,
  internalLinks: number,
  externalLinks: number,
  brokenLinks: string[],
  imagesWithAlt: number,
  imagesWithoutAlt: number,
  hasRobotsMeta: boolean,
  isIndexable: boolean,
  hasStructuredData: boolean,
  structuredDataTypes: string[],
  score: number,           // 0-100
  issues: [{ severity, code, message, element? }],
  recommendations: string[]
}
```

### `get_page_structure`

Extract hierarchical page structure.

```typescript
// Input
{
  url: "https://example.webflow.io",
  depth?: 3,      // Max traversal depth
  timeout?: 60000
}

// Output
{
  url: string,
  timestamp: string,
  viewport: { width, height },
  documentHeight: number,
  sections: [{
    id: string,
    tag: string,
    className: string,
    position: { x, y, width, height },
    depth: number,
    children: Section[],
    isNavbar?: boolean,
    isFooter?: boolean,
    isHero?: boolean,
    webflowSymbol?: string
  }],
  navbar?: Section,
  footer?: Section,
  mainContent?: Section
}
```

### `analyze_images`

Analyze images for optimization opportunities.

```typescript
// Input
{
  url: "https://example.webflow.io",
  checkFileSizes?: false,  // Fetch actual sizes (slower)
  timeout?: 60000
}

// Output
{
  url: string,
  timestamp: string,
  totalImages: number,
  images: [{
    src: string,
    alt: string,
    width: number,
    height: number,
    naturalWidth: number,
    naturalHeight: number,
    loading: 'lazy' | 'eager' | 'auto',
    format: string,
    fileSize?: number,
    isOptimized: boolean,
    issues: string[]
  }],
  byFormat: Record<string, number>,
  totalEstimatedSize: number,
  optimizationScore: number,  // 0-100
  recommendations: string[]
}
```

### `get_performance`

Get performance metrics for a page.

```typescript
// Input
{
  url: "https://example.webflow.io",
  timeout?: 60000
}

// Output
{
  url: string,
  timestamp: string,
  loadTime: number,
  domContentLoaded: number,
  firstPaint?: number,
  firstContentfulPaint?: number,
  largestContentfulPaint?: number,
  totalRequests: number,
  totalTransferSize: number,
  resourcesByType: Record<string, { count, size }>,
  webflowScriptSize: number,
  interactionsScriptSize: number,
  customCodeSize: number
}
```

### `capture_screenshot`

Capture a screenshot of a page.

```typescript
// Input
{
  url: "https://example.webflow.io",
  fullPage?: true,
  viewport?: { width: 1920, height: 1080 },
  format?: 'png',  // 'png' | 'jpeg' | 'webp'
  quality?: 80     // For jpeg/webp
}

// Output
{
  screenshot: string,  // Base64 encoded
  format: string
}
```

### `extract_designer_metadata`

Extract template metadata from Webflow Designer Preview URL. This tool navigates through the Designer's panels to gather comprehensive template information.

**Codified steps:** See [docs/WEBFLOW_PREVIEW_STEPS.md](docs/WEBFLOW_PREVIEW_STEPS.md) for the exact agent steps (iframe handling for page extraction; panel shortcuts P, G, A, H, J for Designer metadata).

**Note**: Only works with Webflow preview URLs (`preview.webflow.com/preview/...`).

```typescript
// Input
{
  url: "https://preview.webflow.com/preview/template-name?preview=...",
  timeout?: 120000  // Extended timeout for panel navigation
}

// Output
{
  url: string,
  timestamp: string,
  siteName: string,         // "Nurturing"
  sitePlan: string,         // "Starter", "Basic", "CMS", "Business", "Enterprise"
  
  // Pages (from P key panel)
  pages: [{
    name: string,           // "About Us"
    type: string,           // "static" | "cms-template" | "ecommerce" | "utility"
    category?: string       // "Innerpages", "CMS collection pages", etc.
  }],
  totalPages: number,
  
  // CSS Classes (from Style Selectors - G key)
  styleClasses: [{
    name: string,           // "Nav / Toggle Block"
    isGlobal: boolean       // true for "All H1 Headings", false for custom
  }],
  totalClasses: number,
  globalClasses: number,    // HTML tag styles (H1, H2, etc.)
  customClasses: number,    // Custom Webflow classes
  
  // Components (from Shift+A panel)
  components: [{
    name: string,           // "Button / Primary"
    instanceCount: number,  // 7
    isUnused: boolean       // true if instanceCount === 0
  }],
  totalComponents: number,
  unusedComponents: number, // Components with 0 instances
  
  // Interactions (from H key panel)
  interactions: [{
    trigger: string,        // "Page load"
    targetElement: string,  // "Hero / Left Top / Image 2"
    type: string            // "page-load", "element-trigger", etc.
  }],
  totalInteractions: number,
  
  // CMS Collections (from CMS tab)
  cmsCollections: [{
    name: string,           // "Blog'Categories"
    itemCount: number       // 4
  }],
  totalCMSItems: number,    // Sum of all collection items
  
  // Assets (from J key panel)
  assets: [{
    filename: string,       // "hero-image.jpg"
    type: string            // "image" | "svg" | "video" | "other"
  }],
  totalAssets: number,
  
  // Responsive Breakpoints
  breakpoints: string[]     // ["Desktop: Base breakpoint", "Tablet: 991px and down", ...]
}
```

**Use cases**:
- Template auditing (unused components, class naming conventions)
- Documentation generation (auto-document pages, classes, components)
- Quality assurance (verify all CMS collections have items)
- Asset inventory (count images, SVGs, videos)

### `get_webflow_review_policy`

Fetches the latest review policy from canonical Webflow pages and returns normalized data plus provenance.

```typescript
// Input
{
  refresh?: false  // Set true to bypass cache and fetch immediately
}

// Output
{
  policyVersion: string,            // Hash of source content hashes
  generatedAt: string,
  sources: {
    submissionGuidelines: {
      url: string,
      title: string,
      fetchedAt: string,
      contentHash: string
    },
    gradingRubric: {
      url: string,
      title: string,
      fetchedAt: string,
      contentHash: string
    }
  },
  submissionGuidelines: {
    sections: Array<{ name: string, items: string[] }>
  },
  gradingRubric: {
    criteriaRows: Array<{
      criteria: string,
      satisfactory: string,
      good: string,
      exceptional: string
    }>
  }
}
```

### `refresh_webflow_review_policy`

Forces a fresh policy fetch from canonical URLs (no cache).

```typescript
// Input
{}
// Output
// Same as get_webflow_review_policy
```

### `get_provider_status`

Check browser provider health and session metrics.

```typescript
// Input
{}

// Output
{
  provider: string,
  isHealthy: boolean,
  mode: "passive",
  metrics: [{
    provider: string,
    isHealthy: boolean,
    successRate: number,
    averageLatencyMs: number,
    failureCount: number
  }],
  sessionMetrics: {
    sessionsCreated: number,
    sessionsClosed: number,
    sessionErrors: number,
    totalDurationMs: number,
    averageDurationMs: number,
    pageLoadsCompleted: number,
    pageLoadErrors: number
  }
}
```

### `enqueue_template_review`

Queue an async template-review job. This is the preferred production entrypoint.

```typescript
// Input
{
  previewUrl: string,
  publishedUrl: string,
  timeout?: number,
  includeManual?: boolean,
  crawlMaxPages?: number,
  crawlMaxDepth?: number
}

// Output
{
  jobId: string,
  status: "queued" | "running" | "succeeded" | "failed" | "canceled",
  queuedAt: string,
  progress: {
    phase: "queued" | "precheck" | "designer" | "published" | "normalizing" | "completed" | "failed" | "canceled",
    progress: number,
    total: number,
    message: string,
    updatedAt: string
  }
}
```

### `get_template_review_job`

Fetch one queued review job by ID.

```typescript
// Input
{ jobId: string }

// Output
{
  jobId: string,
  status: "queued" | "running" | "succeeded" | "failed" | "canceled",
  queuedAt: string,
  startedAt?: string,
  completedAt?: string,
  progress: {
    phase: string,
    progress: number,
    total: number,
    message: string,
    updatedAt: string
  },
  error?: string,
  result?: {
    provider: string,
    providerMetrics: {
      sessionsCreated: number,
      browserMinutes: number
    },
    summary: {...},
    published: {...}
  }
}
```

### `list_template_review_jobs`

List recent queued review jobs.

```typescript
// Input
{
  status?: "queued" | "running" | "succeeded" | "failed" | "canceled",
  limit?: number
}

// Output
TemplateReviewJobRecord[]
```

## Intelligence Layer Tools

### `list_script_versions`

List all versions of an extraction script.

```typescript
// Input
{ scriptName: "touchpoints" | "seo" | "structure" | "images" | "performance" }

// Output
{
  scriptName: string,
  activeVersion: string,      // Currently in production
  testingVersion: string | null,  // A/B testing if set
  versions: [{
    id: string,               // e.g., "touchpoints-v1.2.0"
    version: string,
    status: "draft" | "testing" | "active" | "deprecated",
    createdAt: string,
    createdBy: "human" | "agent",
    changelog: string
  }]
}
```

### `get_version_metrics`

Get performance metrics for a specific script version.

```typescript
// Input
{ versionId: "touchpoints-v1.2.0" }

// Output
{
  versionId: string,
  metrics: {
    executionCount: number,
    successCount: number,
    failureCount: number,
    averageDurationMs: number,
    averageItemsExtracted: number,
    errorRate: number,
    userFeedbackScore?: number  // 1-5 average rating
  }
}
```

### `record_feedback`

Record feedback about an extraction to improve future versions.

```typescript
// Input
{
  versionId: "touchpoints-v1.0.0",
  url: "https://example.webflow.io",
  rating: 1 | 2 | 3 | 4 | 5,
  issues?: [{
    type: "missing" | "incorrect" | "extra" | "timeout" | "error",
    description: "Button in hero section not detected",
    selector?: ".hero-cta"
  }],
  notes?: "CTAs using custom Webflow interactions not captured",
  extractedData?: {...},  // What was extracted
  expectedData?: {...}    // What should have been
}

// Output
{ success: true, feedbackId: "feedback-..." }
```

### `run_analysis_cycle`

Analyze feedback patterns and generate improvement recommendations.

```typescript
// Input
{ scriptName: "touchpoints" }

// Output
{
  scriptName: string,
  timestamp: string,
  issuePatterns: [{
    type: "missing",
    description: "Webflow IX2 interactions not detected",
    occurrences: 15,
    urls: [...],
    selectors: [...]
  }],
  problematicUrls: [{
    domain: "client-site.webflow.io",
    lowRatingRate: 0.45,
    commonIssues: [...]
  }],
  proposals: [{
    targetScript: "touchpoints",
    proposedChanges: [{
      type: "add_selector",
      description: "Add selector for IX2 interactions",
      codeChange: { search: "...", replace: "..." }
    }],
    rationale: "Pattern detected 15 times",
    evidence: [...]
  }],
  abTestAnalysis: {
    recommendation: "Promote v1.2.0 - 12% better success rate"
  },
  recommendedActions: [{
    type: "promote_version",
    priority: "high",
    description: "..."
  }]
}
```

### `compare_versions`

Compare metrics between two versions to evaluate improvements.

```typescript
// Input
{
  baseVersionId: "touchpoints-v1.0.0",
  compareVersionId: "touchpoints-v1.1.0"
}

// Output
{
  comparison: {
    baseVersion: string,
    compareVersion: string,
    metrics: { base: {...}, compare: {...} },
    improvement: {
      successRate: 12.5,    // % improvement
      duration: -8.3,       // % faster (negative = good)
      itemsExtracted: 15.2  // % more items
    },
    recommendation: "promote" | "keep_testing" | "rollback" | "deprecate"
  }
}
```

### `promote_version`

Promote a version to testing (A/B) or active (production).

```typescript
// Input
{
  versionId: "touchpoints-v1.2.0",
  to: "testing" | "active"
}

// Output
{ success: true }
```

### `create_script_version`

Create a new version of an extraction script (agent-driven improvement).

```typescript
// Input
{
  scriptName: "touchpoints",
  code: "(() => { ... })()",  // New script code
  changelog: "Added detection for Webflow IX2 interactions"
}

// Output
{ versionId: "touchpoints-v1.3.0" }
```

## Self-Improvement Loop

The intelligence layer enables autonomous improvement:

```
1. ANALYZE: Run analysis tools against URLs
   └─ Tool returns data + _version field

2. OBSERVE: Record feedback on extraction quality  
   └─ record_feedback with rating and issues

3. ANALYZE: Run intelligence analysis cycle
   └─ run_analysis_cycle identifies patterns

4. PROPOSE: Review generated proposals
   └─ Proposals include code changes + evidence

5. TEST: Create new version and A/B test
   └─ create_script_version + promote_version to "testing"

6. EVALUATE: Compare version metrics
   └─ compare_versions shows improvement

7. DEPLOY: Promote winner to active
   └─ promote_version to "active"
```

## Observability

This package uses telemetry + Langfuse for MCP tracing:

- Telemetry events are emitted per tool invocation as structured JSON logs (prefixed with `[telemetry]`).
- If `MCP_TELEMETRY_PATH` is set, the same events are appended as JSONL for downstream ingestion.
- Langfuse traces are emitted per tool invocation when `LANGFUSE_SECRET_KEY` is configured.

Analysis-level quality metrics are still recorded through `@create-something/observability` helpers.

### Metrics Tracked

| Metric | Description |
|--------|-------------|
| `analysis_duration_ms` | Time taken for each analysis |
| `estimated_cost_usd` | Browser time cost estimate |
| `items_extracted` | Count of items found |
| `seo_score` | SEO health score (0-100) |
| `image_optimization_score` | Image optimization score (0-100) |
| `touchpoint_count` | Number of interactive elements |
| `template_review_job_status` | Async review queue state |
| `template_review_browser_minutes` | Per-review browser budget usage |

### Events Logged

- `analysis_completed` / `analysis_failed`
- `analysis_error` with stack trace
- `analysis_timeout`
- `provider_health_check`
- `session_metrics`

### Atlas Metadata

Uses AI Interaction Atlas vocabulary:

```typescript
{
  'touchpoint.type': 'mcp_server',
  'touchpoint.mcp_server': 'webflow-site-analyzer-mcp',
  'ai_task.type': 'extract',
  'ai_task.skill': 'analyze_touchpoints',
  'browser.provider': 'cloudflare-kitesurf',
  'webflow.url': 'https://...'
}
```

## Cost Tracking

Browser time is tracked per provider session and surfaced on template-review reports via `providerMetrics.browserMinutes`. Each tool result's `_browser` receipt is the stronger per-run source of truth. Direct CDP does not expose Quick Action usage headers, so usage remains explicitly unavailable until Cloudflare exposes it on that boundary.

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Streamable HTTP dev server
pnpm dev:http

# Type check
pnpm typecheck

# Refresh and print canonical Webflow policy snapshot
pnpm policy:refresh
```

## Durable Execution with Temporal

For long-running or crash-resilient extraction workflows, this package includes **Temporal** integration. Each extraction step becomes a resumable activity—if the worker crashes, it resumes from the last completed step, not from scratch.

### Why Temporal?

| Without Temporal | With Temporal |
|------------------|---------------|
| Crash = restart from beginning | Crash = resume from last activity |
| No visibility into progress | Full UI showing each step |
| Manual retry logic | Automatic retries with backoff |
| Lost work on failure | Work persisted to Temporal server |

### Quick Start

**1. Start Temporal Server** (local development):

```bash
# Install Temporal CLI if needed
brew install temporal

# Start local server
pnpm temporal:server
# Opens UI at http://localhost:8233
```

**2. Start the Worker**:

```bash
# In a separate terminal
pnpm temporal:worker
```

**3. Trigger a Workflow**:

```bash
pnpm temporal:trigger "https://preview.webflow.com/preview/your-template?..."
```

### Workflow Steps

The extraction workflow runs 10 sequential activities:

1. `createSession` - Create Steel browser session
2. `extractSiteInfo` - Get site name and breakpoints
3. `extractPages` - Navigate Pages panel (P key)
4. `extractStyleClasses` - Navigate Styles panel (G key)
5. `extractComponents` - Navigate Components panel (Shift+A)
6. `extractInteractions` - Navigate Interactions panel (H key)
7. `extractCMSCollections` - Check CMS tab
8. `extractAssets` - Navigate Assets panel (J key)
9. `extractSitePlan` - Check Settings for plan type
10. `closeSession` - Clean up session

If the worker crashes at step 7, it resumes at step 7—steps 1-6 return cached results instantly.

### Testing Resume Capability

```bash
# Start a workflow
pnpm temporal:trigger "https://preview.webflow.com/..."

# While it's running, kill the worker (Ctrl+C)
# Then restart the worker:
pnpm temporal:worker

# The workflow automatically resumes where it left off
```

### Architecture

```
src/temporal/
├── activities.ts   # I/O operations (Steel, Puppeteer)
├── workflows.ts    # Deterministic orchestration
├── worker.ts       # Runs workflows + activities
└── trigger.ts      # Client to start workflows
```

**Key Principle**: Workflows contain NO I/O. All non-deterministic operations (browser sessions, page evaluation, network requests) happen in activities. This is what makes replay possible.

### Connecting to Temporal Cloud (Production)

For production, use [Temporal Cloud](https://temporal.io/cloud):

```bash
export TEMPORAL_ADDRESS=your-namespace.tmprl.cloud:7233
export TEMPORAL_TLS_CERT=/path/to/client.pem
export TEMPORAL_TLS_KEY=/path/to/client.key

pnpm temporal:worker
```

### Integration with Cloudflare Workers

Cloudflare Workers can trigger Temporal workflows via the HTTP API:

```typescript
// In a Cloudflare Worker
const response = await fetch('http://temporal-server:7243/api/v1/namespaces/default/workflows', {
  method: 'POST',
  body: JSON.stringify({
    workflowId: `extraction-${Date.now()}`,
    workflowType: 'webflowExtractionWorkflow',
    taskQueue: 'webflow-extraction',
    input: [url]
  })
});
```

Start Temporal with the HTTP API port:

```bash
temporal server start-dev --http-port 7243
```

## Architecture

```
src/
├── index.ts             # MCP server entry point
├── types.ts             # Type definitions
├── observability.ts     # Tracing and metrics
├── providers/
│   ├── index.ts                    # Owned capability router and receipts
│   ├── cloudflare-browser-run.ts   # Kitesurf and Chromium CDP adapter
│   ├── steel.ts                    # Temporary rollback provider
│   └── browserless.ts              # Temporary rollback provider
├── scripts/
│   ├── index.ts         # Script exports
│   ├── touchpoints.ts   # Touchpoint extraction
│   ├── seo.ts           # SEO extraction
│   ├── structure.ts     # Page structure extraction
│   ├── images.ts        # Image analysis
│   ├── performance.ts   # Performance metrics
│   └── designer-metadata.ts  # Designer panel extraction scripts
└── versioning/
    ├── types.ts         # Versioning types
    ├── registry.ts      # Version registry manager
    └── intelligence.ts  # Analysis and proposal generation
```

## Browser platform

Cloudflare Browser Run is the owned managed-browser platform. Kitesurf handles
compatible stateless work; Chromium handles persistent, authenticated, WebGL,
bot/TLS-sensitive, and Designer work. Steel and Browserless remain only as
explicit rollback providers until CRE-1645's production burn-in gate passes.

The analyzer keeps its provider interface, capability policy, receipts, and
rollback switch independent of Cloudflare so the execution adapter remains
replaceable.

## License

MIT © CREATE SOMETHING
