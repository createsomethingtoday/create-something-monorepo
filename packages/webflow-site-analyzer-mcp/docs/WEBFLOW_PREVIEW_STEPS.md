# Webflow Preview: Agent Steps (Codified)

This document is the single reference for what the agent does when given a Webflow preview URL (`preview.webflow.com/preview/...`). The production route lives in `src/providers/cloudflare-browser-run.ts`; Steel/Browserless and `src/temporal/` remain temporary rollback/legacy paths during CRE-1645 burn-in.

---

## Flow A: Page extraction (touchpoints, SEO, structure, images, performance)

Used by tools: `analyze_touchpoints`, `extract_seo`, `get_page_structure`, `analyze_images`, `get_performance`.

**Steps:**

1. **Detect Webflow preview** — `url.includes('preview.webflow.com/preview/')`.
2. **Create Browser Run Chromium session** (Steel or Browserless only on rollback).
3. **New page** — viewport 1920×1080 (or from options).
4. **Navigate** — `page.goto(url)` (domcontentloaded or networkidle2 per tool).
5. **Optional** — wait for custom selector and/or 1s settle.
6. **Webflow-only: iframe handling**
   - Wait for selector `#site-iframe-next` (timeout 30s).
   - Wait 3s for content to settle.
   - Get frame: `page.$('#site-iframe-next')` → `contentFrame()`.
   - Wait for `body` in frame (timeout 10s).
   - **Run extraction script inside the frame** (`frame.evaluate(script)`), not on the top-level page.
7. **Non-Webflow** — run script on `page` (`page.evaluate(script)`).
8. **Teardown** — close browser, release session.

**Why iframe:** The Designer UI wraps the actual site in `#site-iframe-next`. All page-level extraction (touchpoints, SEO, structure, etc.) must run in that frame so results reflect the site, not the Designer chrome.

**Implementation:** `CloudflareBrowserRunProvider.analyze()` with Chromium selection for previews; incumbent providers preserve the same steps for rollback.

---

## Flow B: Designer metadata extraction

Used by tool: `extract_designer_metadata`. Only works with Webflow preview URLs.

**Steps (order is fixed):**

| Step | Activity / action | Shortcut / note |
|------|-------------------|------------------|
| 1 | Create browser session | Long timeout (e.g. 15 min). |
| 2 | Navigate to preview URL | `page.goto(url)`, then wait 3s. |
| 3 | **Site info** | `document.title` (site name), aria-labels (breakpoints). |
| 4 | **Pages** | Open Pages panel | **P** |
| 5 | **Style classes** | Open Style selectors | **G** |
| 6 | **Components** | Open Components panel | **Escape** then **A** (Shift+A in UI). |
| 7 | **Interactions** | Open Interactions panel | **H** |
| 8 | **CMS collections** | Check CMS tab / content. |
| 9 | **Assets** | Open Assets panel | **J** |
| 10 | **Site plan** | Settings / plan type. |
| 11 | Close browser, release session. | |

**Panel convention:** Before each panel key, send **Escape** to close any open panel, short wait (~300 ms), then the panel key. Wait 1.5–3s after opening so content is visible before scraping.

**Where implemented:**

- **Temporal path:** `src/temporal/workflows.ts` (orchestration) and `src/temporal/activities.ts` (one activity per step; resume-safe).
- **Inline path:** `CloudflareBrowserRunProvider.extractDesignerMetadata()` with `extractWebflowDesignerMetadata()`; incumbent providers preserve their prior implementations for rollback.

**Designer UI scope:** All DOM reads for metadata (pages, styles, components, etc.) exclude the iframe: `!el.closest('#site-iframe-next')` so we scrape the Designer chrome (panels, labels), not the site inside the iframe.

---

## Summary

| Flow | Trigger | Key Webflow-specific behavior |
|------|---------|-------------------------------|
| A | Any tool that runs a page script (touchpoints, SEO, structure, images, performance) | Run script **inside** `#site-iframe-next` after wait. |
| B | `extract_designer_metadata` | Navigate Designer panels with **P, G, A, H, J** (+ Escape); scrape Designer DOM only (exclude iframe). |

Both flows are **codified in code**; this doc is the single place that lists the steps and shortcuts for agents and maintainers.
