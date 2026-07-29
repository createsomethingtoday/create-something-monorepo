---
name: template-review
description: Review a Webflow Marketplace template submission against the official quality rubric and submission guidelines. Use when given a published template URL (e.g. https://example.webflow.io) or a review version_id from the wf-template-review MCP. Produces structured feedback split into hard-requirement violations (blockers) and rubric-tier assessments (Satisfactory / Good / Exceptional).
model: claude-sonnet-4-6
---

# Webflow Template Review

You are reviewing a template submission for the Webflow Marketplace. The bar to pass is **"Good"** on every rubric dimension AND zero unresolved hard-requirement violations. Templates landing in "Satisfactory" can get one round of revision feedback; anything below "Satisfactory" is rejected.

## Inputs

Accept one of:

1. **Published template URL** — e.g. `https://aurae-temlis.webflow.io/`
2. **Version ID** from the review queue — used with the `wf-template-review-micah-bridge` MCP

If a `version_id` is provided and the MCP is available, call `webflow-template-review-mcp__template_review_get_review_context` first to pull reviewer-facing context (template name, designer, claimed category/tags). The published URL is still required for content checks.

## Workflow

Run these phases in order. Don't skip phases — incomplete reviews waste designer revision cycles.

### Phase 1 — Crawl

Fetch the homepage with WebFetch. Extract:
- Nav links (used to discover main pages)
- Footer (must contain "Powered by Webflow" link + "Licensing" link)
- Page `<title>` and meta tags
- All `<script>` tags (used to detect disallowed custom code)
- Image references (used for asset audit)
- Heading hierarchy

Then fetch each main page from the nav. Always fetch: `/style-guide`, `/licenses`, `/changelog`, `/instructions` (if linked), `/404`.

**Critical: WebFetch summarizes — it can lie about hard requirements.** Observed failures during testing: WebFetch reported H1 counts based on visual rendering rather than HTML tags, claimed `noindex` meta tags were missing when they were present, and said "Powered by Webflow" was a real link when its `href` was `#`. **Before reporting any hard-requirement violation, verify it with raw HTML inspection** using Bash + curl + grep. Example pattern:

```bash
# Verify Powered by Webflow link target (not just phrase presence)
curl -s https://example.webflow.io/ | grep -ioE '<a[^>]*>[^<]*powered by webflow[^<]*</a>'
# Verify noindex on licenses/changelog
curl -s https://example.webflow.io/licenses | grep -ioE '<meta[^>]*robots[^>]*>'
# Count actual h1 tags (not WebFetch's interpretation)
curl -s https://example.webflow.io/ | grep -ioE '<h1[^>]*>' | wc -l
```

WebFetch is fine for design judgment and content extraction. For binary requirements, trust raw HTML.

### Phase 2 — Hard requirements

Read `criteria/checklist.md` and `criteria/new-requirements.md`. Walk every requirement against the crawled data. For each, record `PASS`, `FAIL`, or `UNVERIFIABLE` (with reason — e.g. "PageSpeed score requires manual check at pagespeed.web.dev").

Hard requirements are binary. A template with custom code in site settings (other than the three allowed exceptions), or no `/licenses` page, fails regardless of design quality.

### Phase 3 — Rubric assessment

Read `criteria/rubric.md`. For each of the 10 rubric dimensions, judge the tier (Satisfactory / Good / Exceptional) and cite specific evidence — a page URL, a section, a class name, a specific behavior. Do not assess from a screenshot you can't see; assess from HTML structure, copy, and what WebFetch returns.

When you can't make a judgment from HTML alone (e.g. interaction quality without running JS), mark `UNVERIFIABLE — needs visual review` and explain what a human reviewer should look at.

### Phase 4 — Report

Use `output/review-template.md` as the report shape. Lead with the verdict (Pass / Revise / Reject), then hard-requirement failures, then rubric tier scores, then a punch list ordered by severity.

If a `version_id` was provided and `template_review_save_draft_feedback` is available, offer to save the report as a draft (don't auto-save — the reviewer should read first).

## How to phrase feedback

The designer reads this. Be specific, not preachy.

| Don't write | Write |
|-------------|-------|
| "Improve your typography" | "H1 on /about is 14px on mobile (line 217). All headings need responsive sizing — see submission guidelines on responsive typography." |
| "Layout has issues" | "Hero section on /services uses height: 100vh instead of min-height; content gets clipped when copy is longer. Switch to min-height." |
| "Add more content" | "Collection 'Projects' has 2 items. Required minimum is 3 (max 7) with dummy content matching the template category." |

Cite the page and the rule. The rubric and checklist are the authority — quote them when relevant.

## Files in this skill

- `criteria/rubric.md` — The 3-tier quality rubric (UX, design, typography, interaction, layout, responsive, conversion, PageSpeed, accessibility)
- `criteria/checklist.md` — Hard requirements from the submission guidelines (required pages, naming, custom code, ecommerce, etc.)
- `criteria/new-requirements.md` — Newer requirements from the live submission-guidelines page (GSAP, image sizes, thumbnails, OG metadata)
- `checks/automated.md` — What you can verify from HTML / HTTP
- `checks/manual.md` — What needs human eyes and how to flag it
- `output/review-template.md` — Report template

## MCP integration (optional)

If `wf-template-review-micah-bridge` is connected, these tools are useful:

| Tool | When to use |
|------|-------------|
| `template_review_my_queue` | Find templates assigned to me |
| `template_review_get_review_context(version_id)` | Pull reviewer context (template name, claimed tags, designer) |
| `template_review_search_versions` | Look up a version by URL or name |
| `template_review_save_draft_feedback(version_id, review_feedback, improvement_areas)` | Save report as draft after reviewer reads |

Never call `template_review_set_review_status` or `template_review_request_changes` from the skill — those are decision actions and stay with the human reviewer.

## Limits

- PageSpeed Insights scores can't be fetched from inside the skill. Output the URL to check (`https://pagespeed.web.dev/?url=<template-url>`) and mark the rubric line `UNVERIFIABLE — run pagespeed manually`.
- Visual / interaction quality without rendered JS is partial. Always note which judgments are HTML-only.
- Webflow Designer-only checks (component structure, class re-use, unused styles) can't be verified from the published site. Flag these as "requires Designer access."
