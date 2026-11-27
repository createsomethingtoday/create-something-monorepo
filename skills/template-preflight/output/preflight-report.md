# Template Preflight Report — {Template Name}

**Site**: {published URL or "unpublished — Designer checks only"}
**Date**: {date}
**Scope**: {Build-time (Webflow MCP) / Published-site / Both} · Rubric self-assessment {included/pending} · Listing readiness {included/pending}

## Verdict

**{READY TO SUBMIT / FIX BLOCKERS FIRST / SUBSTANTIAL WORK NEEDED}**

{2-3 sentences: overall state, the single most important thing to fix, and what's already strong.}

> Reminder: a clean preflight is necessary, not sufficient. Run the **Template Validator app** (required) and expect human rubric judgment on design quality.

## 1. Blockers — will cause rejection

{Hard-requirement failures. One per line: requirement — page/element — exact fix. Empty section = "None found."}

- [ ] {e.g. `/licenses` — content exists at `/license` (singular). Rename the page slug to exactly `licenses`.}
- [ ] {e.g. Custom code — analytics snippet in site settings head. Only GSAP (documented), font smoothing, noindex, and documented SVG are allowed. Remove it.}

## 2. Required fixes — will draw review feedback

{Guideline violations that aren't instant rejections but must be fixed before/with submission.}

- [ ] {e.g. The About page meta description describes the Pricing page.}
- [ ] {e.g. Collection "Projects" has 2 items; requirement is 3-7 with realistic dummy content.}

## 3. Rubric risks — dimensions below "Good"

| Dimension | Current tier | Evidence | What moves it to Good |
|-----------|-------------|----------|----------------------|
| {Overall UX} | {Satisfactory} | {specific page/section} | {specific change} |

{Only list at-risk dimensions. Dimensions confidently at Good+ can be summarized in one line.}

## 4. Manual checks before submitting

- [ ] PageSpeed Insights on all main pages ({link}) — need SEO 70-90, Accessibility 70-90 minimum
- [ ] Breakpoint sweep: desktop / tablet / mobile landscape / mobile portrait on every page (max 2 responsive bugs for "Good")
- [ ] Webflow Audit Panel: heading order + alt text
- [ ] Template Validator app run — clean
- [ ] Thumbnails: main (simple homepage view) + hover (different section, consistent style); no badges/logos/text/CTAs
- [ ] Name check: 1-2 words, unique in marketplace, no keyword stuffing
- [ ] {Ecommerce only} Setup Guide steps all unchecked; NO business address

## 5. Verified passing

{Compact list of what's confirmed good — gives the creator confidence about what NOT to touch.}
