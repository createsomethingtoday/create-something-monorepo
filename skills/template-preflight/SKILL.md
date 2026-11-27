---
name: template-preflight
description: Preflight a Webflow Marketplace template against the official submission guidelines and grading rubric while it is being built. Use during agentic template development (with the Webflow MCP connected) or before submission (with a published *.webflow.io URL). Complements — does not replace — the required Template Validator app and the submission form's own validation. Produces a punch list split into Blockers, Required Fixes, Rubric Risks, and Manual Checks.
---

# Webflow Template Preflight

You are helping a template creator ship a Webflow Marketplace template that passes review on the **first** submission. The bar: meet **every** submission requirement AND score at least **"Good"** on every grading-rubric dimension. Templates that land in "Satisfactory" get feedback and up to 2 revision rounds; failing to reach "Good" after that is a rejection.

Sources of truth (re-check them when in doubt — they change):

- Submission guidelines: https://webflow.com/templates/submission-guidelines
- Grading rubric: https://webflow.com/templates/grading-rubric

## Where this skill fits

This skill is one layer in a validation stack. Be explicit with the creator about what each layer covers:

| Layer | When | What it catches |
|-------|------|-----------------|
| **This skill** | Continuously during the build, and as a final sweep | Guideline violations while they're cheap to fix; rubric risks; structure/naming/CMS issues via the Webflow MCP |
| **Template Validator app** (or the Template CLI, `wf-template-validate`, which runs the same checks from a terminal) | Required before submission | Webflow's own automated checks. The submission form accepts a template only after a complete run with a 100% pass; this skill does not exempt you |
| **Submission form validation** | At submission | Listing metadata (name, categories, thumbnails) |
| **Human review** | After submission | Rubric quality judgment, visual polish, everything automated checks miss |

A clean preflight is necessary, not sufficient. Design quality is judged by humans against the rubric — this skill can flag risks but cannot certify "Good."

## Inputs

Accept either or both:

1. **A Webflow site being built** — the Webflow MCP is connected and can read the site's pages, styles, variables, components, CMS, and forms. Use build-time checks (Phase 1).
2. **A published staging URL** — e.g. `https://mytemplate.webflow.io`. Use published-site checks (Phase 2).

If both are available, run both: the MCP sees Designer-level structure the published HTML can't show (class naming, variables, unused styles, form notification settings), and the published site shows what the reviewer will actually fetch.

## Workflow

### Phase 0 — Load the criteria

Read `criteria/hard-requirements.md` and `criteria/rubric.md` from this skill. Every check below traces to one of those two documents. When a check fails, cite the specific requirement in your feedback so the creator can verify it against the official pages.

### Phase 1 — Build-time checks (Webflow MCP)

Run whenever the creator asks for a check mid-build, after any significant milestone (new page, new collection, new interaction), and always before publish.

Follow `checks/designer-mcp-checks.md`. If the Webflow MCP exposes a guide/discovery tool (e.g. `webflow_guide_tool`), call it once at session start to learn the available tool surface — tool names vary by MCP version, so match by capability, not by exact name.

The build-time pass covers, in priority order:

1. **Required pages exist at exact slugs** — `/style-guide`, `/licenses` (plural!), `/changelog`, `/instructions` (required if the template uses advanced/hidden components, SVG embeds, or GSAP custom code). Page names in Title Case, slugs matching names.
2. **Custom code audit** — enumerate site-level, page-level, and embed custom code. Allowed exceptions are GSAP custom code (with Instructions documentation), Lenis smooth scrolling (including initialization), font smoothing CSS, the `noindex` meta on the Licenses and Changelog pages, and documented inline SVG. Everything else is a rejection.
3. **Class and style discipline** — one consistent naming convention (or a declared framework like Client-First, Mast, Knockout), descriptive names, no auto-generated `Div Block 45` names, combo classes ≤ 3–4 levels, unused styles cleaned up.
4. **Tag-level base styles** — H1–H6, paragraphs, both list types, blockquotes, figures, figure captions, and links styled at the tag selector level (verifiable on the Style Guide page).
5. **Variables** — colors, typography, spacing (and brand specifics like radius/shadows) defined as Variables; Title Case names; organized groups; ordered ramps; Variable Modes for responsive values.
6. **Components** — Navbar, Footer, and CTAs built as reusable Components with Title Case names; props/slots over duplicated structures; no nested slider-in-slider patterns.
7. **CMS structure** — Title Case collection names with correct singular/plural, singular slugs (`/article/...` not `/articles/...`), 3–7 items per collection with realistic dummy content matching the category, field help text, conditional visibility for optional fields, dynamic SEO metadata on collection pages.
8. **Forms** — every field labeled, correct field types (email fields are `email`), descriptive form/field names, customized success messages, **Form Notifications settings empty**.
9. **Interactions** — GSAP-powered Webflow Interactions (the Marketplace default since May 1, 2026; avoid legacy interactions), sentence-case descriptive names ("Slide nav down on scroll"), GPU-friendly properties only (transform/opacity), durations 150–800ms, unused interactions deleted.
10. **Site settings** — custom favicon + webclip, Google/OFL fonts only, responsive images enabled, no API tokens or integrations, no Maps API key, CSS minified, total weight < 10MB, **localization not enabled**.
11. **Ecommerce (if applicable)** — Setup Guide steps all unchecked, and **never add a business address** (it cannot be removed; templates with one are rejected outright).
12. **Copy and content proofread** — read the visible text of every page and CMS item: spelling, sentences that stop mid-way, identical excerpts/labels/stats across sibling cards, copy from another vertical, stray content-model labels ("Description:"), internal version tags ("Home V1.1"), real product names inside mockups. Reviewers write more feedback about copy than about any single technical rule, and AI-built templates fail here first (repetition is the default failure mode of generated copy).
13. **Images** — explicit width/height (or aspect-ratio) on every image, lazy-load below the fold, ≤ 150KB where possible.

Report failures immediately with the exact element/page/class so the creator's agent can fix them in the same session.

### Phase 2 — Published-site checks (staging URL)

Once the template is published to `*.webflow.io`, run the script:

```bash
checks/published-site-checks.sh https://mytemplate.webflow.io
```

The shell entrypoint uses Python 3.10+ (standard library only) to parse HTML, crawl same-origin links recursively, and read sitemaps. It seeds utility pages, accepts extra paths, deduplicates canonical redirects, and prints the checked `PAGE` inventory. The default limit is 200 URLs; reaching it or failing to fetch a discovered page produces a `FAIL`, never a silent skip. Reconcile that inventory with Designer static pages and CMS items because unlinked, unsitemapped pages remain undiscoverable. Use `--max-pages 500` for larger sites, `--template-name "Exact Listing Name"` to compare against the listing, and `--json receipt.json` for evidence.

Automated checks cover exact-case homepage title, inner-page name/separator consistency, duplicate metadata, noindex on Licenses and Changelog versus content noindex, structural footer links, license boilerplate wording/count/opening position, form label associations/defaults, image dimensions, OG URL format, headings, copy heuristics, and script signals. Normal `Name`/`name` fields are valid. Footer detection supports `<footer>`, `role="contentinfo"`, and conventional footer class/id tokens; ambiguous custom structures require Designer confirmation. Width and height must both be positive, or a ratio box must be verified. Inline declarations and matching stylesheet ratio candidates are reported for manual rendered verification; stylesheet imports and complex selectors may still require a documented Designer exception.

A `MANUAL` item is unresolved, not a pass: per-asset license completeness needs the Designer/CMS inventory; loading behavior needs breakpoint/fold inspection; forms need authorized runtime feedback tests; logo/listing identity needs visible comparison. CSS-hidden text, computed styles, image pixels, and legal rights cannot be established from parsed HTML. Image weight checks remain an explicitly labeled sample of up to 12 URLs. Unknown OG formats and actual dimensions need verification. Localization markers trigger manual settings review rather than proving multiple locales are enabled.

**Then read every page yourself. Do not skip this when the scanner reports many failures.** The scanner reads structure; it does not understand the copy or the code. For each page in the `PAGE` inventory, read the visible text, the link labels and every inline `<script>`, and report:

1. Copy that belongs to another category (a "dental clinic" sentence in an architecture template), sentences that stop mid-way, and text repeated across sibling cards.
2. Self-promotion: "Buy" or "Get template" buttons, "More templates" links, links to your other templates or paid services. One "Designed by" credit in the footer is allowed.
3. ® or ™ in the copy.
4. Scripts that are not GSAP or Lenis. A hand-written counter, slider, menu or share script is custom code outside the allowed list, even when it is small. So is a third-party library.

**Do not trust summarizing fetch tools for binary requirements.** If you check anything by hand, use raw HTML with structural parsing (or inspect the Designer DOM). Summarizers have been observed to miscount H1s, miss noindex tags, and report `href="#"` as a real link.

Anything the script flags as `FAIL` is a likely rejection reason. Fix and re-run until clean.

### Phase 3 — Rubric self-assessment

Read `criteria/rubric.md`. For each dimension, honestly assess which tier the template currently sits in, citing specific pages/sections as evidence. The target is **Good or better on every dimension** — "Satisfactory" anywhere is a revision cycle waiting to happen.

Two dimensions need external tools — give the creator the exact steps:

- **Site optimization + Accessibility**: run https://pagespeed.web.dev/ against the main pages. Good requires SEO 70–90 and Accessibility 70–90; Performance and Best Practices 51–70 minimum. Also run Webflow's Audit Panel for skipped headings and missing alt text.
- **Responsive design**: spot-check every breakpoint (desktop, tablet, mobile landscape, mobile portrait) — no text overflow, no horizontal scroll, layouts adapt. "Good" tolerates at most 2 responsive bugs.

- **Layout design quality**: compare inner pages against the homepage. Reviewers hold templates at Satisfactory when inner pages reuse the homepage section stack with only copy changed, or when the design reads as generic within its category. Say so explicitly if you see it.
- **Accessibility (contrast)**: reviewers cite one failing text/background pairing and note it is used sitewide. Check muted labels, placeholders, text over imagery, and hover/focus states, not just body text.

For purely visual judgments (graphic design quality, interaction feel, "on-trend"-ness) mark them `MANUAL — human eyes required` rather than guessing from HTML. Two more items only eyes can catch and reviewers flag often: real product names inside mockup/screenshot artwork, and a favicon that disappears against light browser chrome.

### Phase 4 — Listing readiness

Before the creator fills in the submission form, check against the "Template listing information" section of `criteria/hard-requirements.md`:

- **Name**: 1–2 words (preferably 1), unique in the marketplace (search it), reflects the theme, no keyword stuffing, no slang/special characters/odd capitalization, no brand or author names, not a category name.
- **Description**: mentions only pages that actually exist at the stated slugs; contains no copy left over from another template (a "dental clinics" line in a storage template was flagged); spells the template name exactly as the name field, logo, and SEO titles do.
- **Categories**: up to 2, accurately representing the template.
- **Page count class**: one page / multi page / multi layout (multi layout = ≥3 layout variations across 3 static pages).
- **Thumbnails**: main = homepage or key page, simple and clear, no angled/tiled mockups; hover = a different section/page in a consistent style. Neither may contain badges, external logos/tool icons, template/category names, CTAs, or sales text.

### Phase 5 — Report

Use `output/preflight-report.md` as the shape. Lead with an overall readiness verdict (**Ready to submit** / **Fix blockers first** / **Substantial work needed**), then:

1. **Blockers** — hard-requirement failures that cause rejection (wrong slug, disallowed custom code, business address set, localization enabled, missing required page…)
2. **Required fixes** — guideline violations that will draw feedback
3. **Rubric risks** — dimensions at or below Satisfactory, with what would move them to Good
4. **Manual checks** — PageSpeed runs, breakpoint sweeps, thumbnail review, visual quality

Every item names the page, element, class, or setting and quotes the governing requirement. Phrase feedback the way a helpful reviewer would:

| Don't write | Write |
|-------------|-------|
| "Fix your license page" | "The license content lives at `/license` (singular). The required slug is exactly `/licenses` — rename the page slug." |
| "Improve headings" | "`/about` has 3 `<h1>` tags outside `<section>`/`<article>`. Keep one H1 per page; demote the others to H2." |
| "CMS needs work" | "Collection 'Projects' has 2 items; the requirement is 3–7 with realistic dummy content matching your category." |

## The most common reasons templates fail review

Lead preflight with these recurring patterns from the supplied reviewer-feedback sample. The 498 numbered items were bucketed with overlapping regex categories: use this order as a qualitative priority guide, not measured frequencies or rejection rates. The underlying dataset has not been independently recounted here.

1. **Copy defects** — typos and misspellings (including in the listing), sentences cut off mid-way, identical excerpts/labels/stats across sibling cards, copy pasted from another vertical, stray "Description:" labels, internal version tags in the nav ("Home V1.1"). A leading pattern in the supplied feedback.
2. **Color contrast** — one failing text/background pairing, used sitewide. Review muted labels and text over images across the site.
3. **Missing alt text** — "revisit all pages, persisting issue" is the standard note; run the Audit Panel across every page.
4. **SEO title problems** — wrong casing in the required suffix ("Website Template"), inner pages with mixed separators or a different template name, or every page sharing one title and one meta description.
5. **Variables not set up, or set up without Variable Modes for breakpoints**, and **unused classes/styles left in the project**. Both require Designer verification.
6. **Licenses page defects** — required sentence reworded, truncated, duplicated, or not at the top; no per-font/per-image license links; page not linked from the footer.
7. **Images** — no explicit width/height (layout shift), over 150KB, pixelated at 2x; real brand names inside mockup artwork; real logos instead of fake brands.
8. **Forms** — default field names (`Field 2`), no labels, default success/error text, no submit feedback.
9. **Utility pages at wrong or misspelled slugs** (`/license`, `/instrustion`), noindex missing on Licenses or Changelog or wrongly applied to real pages, custom 404 missing. Do not ask for noindex on the Style Guide or Instructions page; it is not required there.
10. **GSAP custom code** without the "How to Edit GSAP Animations" Instructions section, or mixed with unapproved scripts. (GSAP via native Interactions from `cdn.prod.website-files.com/gsap/...` is not custom code.)
11. **Listing** — description mentions pages that don't exist, contains another template's copy, template name spelled three ways; thumbnails not matching the current thumbnail rules.
12. **Design tier** — "repetitive layouts page to page" and "generic within its category" are the reasons templates are held at Satisfactory on Layout design quality; no scanner catches these.

Also required, regardless of rank: "Powered by Webflow" missing or `href="#"`, OG image missing/WebP/AVIF, wrong H1 count. The scanner checks them anyway; they are cheap.

## Files in this skill

- `criteria/hard-requirements.md` — Creator checklist distilled from the live submission guidelines
- `criteria/rubric.md` — The 3-tier grading rubric with self-assessment guidance
- `checks/designer-mcp-checks.md` — Build-time checks mapped to Webflow MCP capabilities
- `checks/published-site-checks.sh` — Stable CLI entrypoint (Python 3.10+ required).
- `checks/published-site-checks.py` — Structural checks, recursive crawl, and optional JSON receipt.
- `checks/tests/test_published_site.py` — HTTP regression suite; run `python3 -m unittest discover -s checks/tests`.
- `checks/README.md` — Usage, coverage, evidence limits, and verification commands.
- `output/preflight-report.md` — Report template

## Limits

- This skill cannot run PageSpeed Insights or render breakpoints — those stay manual, and the report must say so.
- Designer-only facts (class naming, unused styles, form notification settings, ecommerce setup state, site weight) are only checkable when the Webflow MCP is connected; from a published URL alone, flag them as unverified.
- Guidelines evolve. This skill was last compared with the guidelines dated November 9, 2026. When a check contradicts the live submission-guidelines page, the live page wins — update this skill's criteria files.
- Passing preflight + the Template Validator does not guarantee approval; rubric quality is a human judgment.

Image-dimension failures are aggregated once per affected page, with counts and up to three examples. JSON findings retain every affected image under `items` and the total under `affected_count`. Failure totals count findings, not individual images.
