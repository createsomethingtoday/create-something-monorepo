# Rubric Codification Map

**Status:** Draft
**Date:** 2026-05-26
**Canonical source:** `https://webflow.com/templates/grading-rubric`
**Related source:** `Submission Guidelines Updates V2.md`

## Purpose

The grading rubric defines quality bands. The submission guidelines define many operational requirements. The AI-native review system needs both:

- guidelines become deterministic rule checks where possible
- rubric criteria become quality dimensions with auto, partial, and manual evidence
- final approval, rejection, and exceptional/feature decisions remain human-owned

## Core Interpretation

The rubric uses three positive quality bands:

- `Satisfactory`: eligible for feedback and revision, but failure to reach `Good` after two feedback rounds can become rejectable.
- `Good`: better-than-average quality; solid enough for normal approval when concrete issues are resolved.
- `Exceptional`: standout quality; should be flagged for human feature review, never decided automatically.

The review system should separate:

- **decision state:** approve, reject, request changes, in review
- **quality band:** low quality, satisfactory/average, good, exceptional candidate
- **evidence state:** open, resolved, waived, false positive, needs human review

## Rubric Dimensions

| Rubric dimension | Phase 1 coverage | Deterministic evidence | Partial evidence | Manual judgment |
| --- | --- | --- | --- | --- |
| Overall user experience | `manual` | none reliable in Phase 1 | screenshot artifacts, CTA map, navigation depth, confusing overlays | whether UX feels intuitive, dated, delightful, original, or trend-setting |
| Graphic design | `manual` | image load failures, obvious low-res/extreme asset metadata | screenshot artifacts, image-size metadata, visual consistency samples | originality, stunning visuals, cohesive branding, strategic visual placement |
| Typography | `partial` | font sizes, line heights, contrast samples, heading hierarchy | CSS token usage, type scale consistency, screenshot artifacts | quality of hierarchy, readability nuance, premium typography feel |
| Interaction design | `partial` | legacy IX2, script policy, hover/focus rules, disabled/broken controls | interaction density, external library detection, console errors | cadence, personality, cognitive load, expected behavior quality |
| Hierarchy | `partial` | heading order, CTA count and placement, section outline | DOM/section structure, screenshot landmarks | ease of processing, information architecture quality, user empathy |
| Layout design quality | `partial` | horizontal overflow, clipped content, fixed-height density, repeated page structure | section fingerprint variety, spacing token use, screenshot artifacts | visual balance, Gestalt quality, page-to-page variety, crammed/cluttered feel |
| Responsive design | `partial` moving toward `auto` | standard viewport overflow, clipped elements, viewport-specific failures | screenshot diffs, CSS media-query coverage | whether responsive behavior feels intentionally designed |
| Conversion best practices | `partial` | CTA presence, CTA location, form/cart/contact links, repeated action routes | journey map, CTA prominence proxies | persuasion, credibility, objection-handling, user journey quality |
| Site optimization | `auto` if PSI/Lighthouse is wired | PageSpeed/Lighthouse scores, asset sizes, network weight | render-blocking resources, script weight | whether performance tradeoffs are acceptable for the design |
| Accessibility | `partial` moving toward `auto` | PageSpeed accessibility score, labels, alt presence, headings, contrast samples | unique link names, keyboard/focus checks | full accessibility judgment and context-appropriate alt text |

## Banding Rules

### Satisfactory / Average

Use when:

- the template is usable and mostly aligns with guidelines
- objective issues remain
- quality feels acceptable but not clearly differentiated
- unresolved issues are normal request-changes material

Automation should only produce `changes_requested_average` in Phase 1, not a public-facing `satisfactory` score.

### Good

Use when:

- hard blockers are absent
- objective findings are resolved or minor
- responsive/accessibility/optimization evidence is within acceptable bands
- manual reviewer confirms visual quality, hierarchy, and category fit

Automation can produce `clean_good_candidate` only when deterministic checks are clean and no unresolved manual blockers are present.

### Exceptional Candidate

Use when:

- all `Good` conditions are met
- manual reviewer or lead sees standout quality across several rubric dimensions
- similarity/flooding checks do not raise originality concerns
- the recommendation is explicitly labeled as human-review-required

No Phase 1 automated run should output exceptional as a decision. A shadow multimodal reviewer may output `exceptional_human_review_candidate` only as a non-final routing signal for human lead review when screenshot evidence shows multiple specific standout signals, confirmed hard blockers are absent, and unresolved areas are listed as manual checks. This signal remains blocked from Dify-facing or reviewer-facing automation until the calibration gate proves exceptional recall without false approvals.

## Rubric To Finding Buckets

| Rubric language | Finding bucket |
| --- | --- |
| dated, confusing, distracting, cognitive overload | `overall_ux` |
| low-res, branding consistency, visual design principles | `graphic_design` |
| legibility, readability, hierarchy, typography guidelines | `typography` |
| interactions, cadence, expected behavior, cognitive load | `interaction_design` |
| information architecture, visual hierarchy, user goals | `hierarchy` |
| crammed, cluttered, layout variety, Gestalt principles | `layout_design_quality` |
| responsive bugs, visual hierarchy across screens | `responsive_design` |
| CTA, conversion, cart, form fills, user journey | `conversion_best_practices` |
| PageSpeed SEO, performance, best practices | `site_optimization` |
| PageSpeed accessibility, contrast, unique link names, checklist | `accessibility` |

## Visual-Quality Normalization

The Airtable rejection-feedback sample in `visual-quality-signal-standardization.md` shows that reviewers often apply the same underlying quality concern with different wording. Exact "outdated visual style" phrasing is not the policy. The policy-relevant signal is low visual quality relative to current marketplace expectations.

Normalize visual-quality feedback into these sub-buckets before comparing agent output to human outcomes:

- `outdated_visual_style`
- `basic_or_default_layout`
- `weak_visual_hierarchy`
- `poor_typography_quality`
- `poor_color_palette_or_contrast`
- `incohesive_assets`
- `low_layout_variety`
- `saturated_category_no_differentiation`
- `poor_interaction_polish`

These buckets may support rejection, changes requested, or quality-band scoring only after reviewer confirmation or calibrated golden-set matching. Phase 1 should treat them as `manual_quality_gap` or `manual_quality_review_required`, not as deterministic hard blockers.

Calibration updates for these buckets must follow `visual-quality-self-healing-loop.md`: aliases, proxy weights, and thresholds can be proposed from confirmed outcomes, but quality-band definitions and final rejection posture require human approval and a new policy snapshot.

## Phase 1 Additions From Rubric

The official rubric makes these rules high-value Phase 1 candidates:

- PageSpeed/Lighthouse score capture for SEO, performance, best practices, and accessibility.
- CTA and conversion-route extraction.
- viewport bug counter backed by browser measurements and screenshots.
- section/layout fingerprinting to identify repeated or low-variety page structures.
- type-scale and line-height consistency checks.
- hover/focus state coverage checks.
- link-name uniqueness checks.

## Implementation Notes

- Store the fetched rubric page hash in `review_policy_snapshots.source_hash`.
- Version the rule catalog when the rubric page changes.
- Keep reviewer calibration separate from rubric policy.
- Treat reviewer-specific tendencies as queue context, not as a different rule set.
- Avoid using screenshots as direct design scores until a separate calibrated visual eval exists.
