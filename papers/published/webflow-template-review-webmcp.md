# The Webflow Way, Automated: Agent-Ready Template Reviews on Published Sites (WebMCP + Review Snippet)

## Abstract

We built a published-site review snippet for Webflow templates that exposes a read-only set of “Webflow Way” review checks to agents.

The goal is pragmatic: enable reviewers to cover roughly 80% of a template review without needing Designer access, while keeping the workflow compatible with emerging in-browser tool standards like WebMCP.

The result is a single snippet that can be installed at the Webflow project level (so it loads on every page) and offers:
- A local API (`window.__wfReview`) for humans, extensions, and headless harnesses
- A `postMessage` bridge for external callers (ex: Chrome extension)
- WebMCP-style tool registration when `navigator.modelContext` is available

This paper documents what we built, what it can and cannot check from a published site, and how it fits into a scalable Template Marketplace review workflow.

## I. The Problem: Template Reviews Don’t Scale Linearly

Template reviews are inherently multi-dimensional:
- Content quality (headings, links, media)
- Accessibility hygiene (alt text, labels, “blank” links)
- SEO and social metadata (title/description/OG/canonical)
- Interactions integrity (IX2 and IX3)
- Site behavior (404 pages, sitemap discoverability)

The bottleneck isn’t a lack of standards. It’s that most checks are performed manually, across many pages, with inconsistent coverage.

If we want higher quality and faster throughput, we need a way to make review data machine-readable.

## II. Constraints: What You Can (and Can’t) See From a Published Site

Published Webflow sites are a different world than Designer:

| Surface | Published Site | Designer |
|---------|----------------|----------|
| DOM and runtime behavior | Available | Available |
| Metadata and public page signals | Available | Available |
| Style manager and unused class inventory | Not available | Available |
| Component/symbol structure internals | Not available | Available |
| CMS schema and configuration internals | Not available | Available |

So the system is designed around a hard boundary:

**Published-site audits are “high-signal hygiene checks,” not full Designer audits.**

That boundary is what makes this approach deployable: it works on any published `*.webflow.io` preview without special permissions.

## III. The Approach: A Review Snippet That Surfaces Tooling to Agents

The snippet is installed once (project settings), and then every page exposes a consistent API surface.

### The Three Interfaces

1. `window.__wfReview` (direct calls)

This is the simplest interface. A reviewer, extension, or test harness can call tools directly in-page.

2. `window.postMessage` bridge (external callers)

This allows a Chrome extension or external context to request tool execution and receive structured results.

3. WebMCP registration (`navigator.modelContext`)

When present, the snippet registers tools in a WebMCP-aligned shape so future agent runtimes can discover and call the tools in-browser.

### Design Principles

- **Read-only**: tools report on page state; they don’t mutate content.
- **Public-by-default**: because this runs on published sites, outputs are treated as public information (DOM + public endpoints).
- **Stable tool contracts**: tools return JSON structures designed to be machine-consumed and summarized.

## IV. What We Can Check Today (Tool Surface)

At the time of writing, the published-site tools include:

| Tool | Category | Primary Signals |
|------|----------|-----------------|
| `get_site_info` | Site and discovery | Page/site identifiers and environment signals |
| `get_sitemap_urls` | Site and discovery | `/sitemap.xml` discovery for multi-page review |
| `audit_dom` | Page hygiene | Baseline DOM and environment signals |
| `audit_headings` | Page hygiene | H1 count, skipped levels, empty headings |
| `audit_meta` | Page hygiene | Title/description, OG tags, canonical, robots |
| `audit_links` | Page hygiene | Placeholder links, `_blank` rel safety, missing accessible names |
| `audit_images` | Page hygiene | Missing alt, above-fold lazy-loading, sizing/format hints |
| `audit_forms` | Page hygiene | Missing label associations and accessible names |
| `audit_media` | Page hygiene | Autoplay/controls signals for video/audio |
| `audit_404` | Page hygiene | Non-existent-path probe and observed 404 behavior |
| `audit_ix2` | Interactions | Legacy IX2 configuration/state capture and summaries |
| `audit_ix3` | Interactions | IX3 interaction/timeline capture and summaries |
| `audit_webflow_way` | Aggregation | Consolidated review object (optionally sitemap-driven) |

The practical outcome is that an agent can produce a reviewer-friendly summary (and a machine-verifiable artifact) in one call.

## V. The Hard Part: Interactions Without Designer Access

Interactions are the most “Webflow-specific” category and the hardest to audit from a published site.

Our working approach:
- For IX2: observe initialization and capture the interaction configuration/state that ships to the client.
- For IX3: wrap the runtime registration path so we can capture interaction/timeline definitions as they load.

This gives reviewers concrete quantities (counts) and sample payloads, which are especially useful for:
- Detecting interaction bloat
- Identifying broken runtime states
- Comparing “what ships” across pages

One important caveat:

**Published bundles can include interactions used on other pages**, so naive “unused” flags are often false positives. The system is built to report what is present, and we treat “unused” as a heuristic that needs cross-page context.

## VI. How This Fits a Template Marketplace Workflow

The intended workflow looks like this:

1. Creator publishes a template preview (or review team accesses an existing preview)
2. Snippet is present site-wide (project settings)
3. Reviewer (or agent) runs `audit_webflow_way`
4. Results are summarized into the Webflow Way review checklist
5. Reviewer escalates only the remaining “Designer-only” checks

This splits review labor cleanly:

| Role | Responsibility |
|------|----------------|
| Agents | Repeatable published-site hygiene checks and evidence capture |
| Humans | Judgment calls and Designer-only validation |

## VII. Limitations (Explicit)

What this does not solve:

| Area | Limitation |
|------|------------|
| CSS/style hygiene | Cannot verify unused classes or style manager state |
| CMS internals | Cannot validate CMS schema/configuration details |
| Designer structure | Cannot inspect component/symbol integrity in Designer |
| Performance depth | Cannot replace full lab + field performance analysis |

And what requires tuning:

| Heuristic | Why Tuning Is Needed |
|-----------|----------------------|
| Form labeling checks | Webflow form structures vary across templates |
| Above-fold image checks | Classification depends on viewport and layout context |
| Sitemap discovery | Many templates do not publish `/sitemap.xml` |

These aren’t failures. They’re the shape of the boundary between published-site visibility and Designer state.

## VIII. Why WebMCP Matters Here

The big opportunity is standardization:

If browser-based agent runtimes converge on a shared tool invocation interface (WebMCP), then “review snippets” become portable.

Instead of building one-off integrations for each agent product, we can:
- Expose a stable tool surface in the page
- Let the agent runtime handle discovery/calling
- Keep review logic close to the artifact being reviewed (the published site)

That’s a scalable model for Marketplace QA.

## IX. Roadmap

The next high-leverage improvements:

1. Multi-page coverage without a sitemap
   - Crawl internal links from the DOM when `/sitemap.xml` is missing

2. Better interaction “unused” signals
   - Cross-page sampling and element-presence matching

3. Reviewer-grade output formats
   - Emit a structured checklist + evidence bundle (per page) for audit trails

4. Extension UX
   - Simple UI that runs the aggregate tool and renders the report with actionable diffs

## Appendix A: Implementation Notes

- Snippet version is tracked in-source (current: `0.2.0`).
- The primary implementation lives at:
  - `packages/webflow-review/snippet/webflow-review-snippet.js`

