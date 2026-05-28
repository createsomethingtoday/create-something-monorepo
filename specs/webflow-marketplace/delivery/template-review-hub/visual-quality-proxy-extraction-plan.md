# Visual Quality Proxy Extraction Plan

**Status:** Draft
**Date:** 2026-05-26
**Related artifacts:** `visual-quality-signal-standardization.md`, `visual-quality-calibration-audit-2026-05-26.md`, `visual-quality-proxy-extraction-audit-2026-05-26.md`, `visual-quality-proxy-canary-audit-2026-05-26.md`, `review-ledger.phase1.sql`

## Purpose

This plan defines which parts of visual quality can be supported by repeatable HTML, CSS, JS, Designer metadata, and validator evidence.

The goal is not to replace human judgment on taste. The goal is to turn subjective visual review into a stable evidence packet:

- what the agent measured
- which visual-quality buckets the evidence may support
- how strong the proxy evidence is
- what still needs human judgment

Screenshots should be captured as evidence and as an input to measurements. They should not become the source of truth for quality rating by themselves.

## Existing Sources

| Source | Existing surface | Useful repeatable evidence |
| --- | --- | --- |
| Published HTML/CSS fetch | `packages/webflow-template-validation/src/lib/analyzers.ts` | class naming, combo class count, placeholder text, line-height units, body font, base tags, hover/focus states, CSS variable usage, heading/alt checks |
| Published validation worker | `packages/webflow-template-validation/worker/src/validators/*` | content, assets, accessibility, interactions, performance, Designer-data checks |
| Template review MCP | `packages/webflow-template-review-mcp/src/validation.ts` | normalized published-site validator summaries for review evidence |
| Site analyzer Designer checklist | `packages/webflow-site-analyzer-mcp/src/checklist/designer-checklist.ts` | components, variables, style guide, base tag styles, breakpoints, naming consistency, pages, assets |

## Current Extractor

The first extractor is implemented as:

```bash
pnpm --filter @create-something/webflow-template-review-mcp visual-quality:extract-proxies -- \
  --url https://example.webflow.io/ \
  --out /tmp/webflow-template-review-visual-proxies
```

It emits `visual-proxy-features.json` with:

- published HTML/CSS features
- section fingerprints
- proxy signals
- visual-quality findings marked `manual`

It does not write to Airtable, D1, or `review_recommendations`.

## Current Canary

`packages/webflow-template-review-mcp/scripts/run-visual-quality-proxy-canary.ts` runs the extractor against a small balanced sample from a visual-quality calibration output.

The 2026-05-26 canary completed 30/30 URLs. It found proxy signals on all rejected visual-quality cases, but also medium proxy load on 26.7% of approved controls. This blocks reviewer-facing quality-band automation and confirms the lane should stay evidence-only for now.

## Proxy Matrix

| Visual sub-bucket | Stronger deterministic proxies | Weaker/manual proxies | Automation posture |
| --- | --- | --- | --- |
| `outdated_visual_style` | no design-system variables, no responsive modes, missing base tag styles, absent hover/focus states, old interaction evidence, weak image-format usage | whether the visual direction feels current | Manual; use proxies only to route review. |
| `basic_or_default_layout` | repeated section DOM fingerprints, low section-type variety, low component variety, repeated CTA/header/card structures | whether the composition feels default or buyer-ready | Partial; needs category context. |
| `weak_visual_hierarchy` | heading hierarchy issues, multiple H1s, skipped headings, tiny font sizes, inconsistent heading/body scales, weak CTA hierarchy, spacing variable gaps | whether hierarchy feels polished and intentional | Partial; reviewer confirms severity. |
| `poor_typography_quality` | missing body font, inconsistent line-height units, text too small, poor type variable coverage, all-caps long text flags | font pairing taste, brand fit | Partial; measurable typography issues can support review notes. |
| `poor_color_palette_or_contrast` | contrast failures, insufficient color variables, no color ramp, repeated low-contrast pairs | palette taste, freshness, category fit | Partial; contrast is objective, palette taste is manual. |
| `incohesive_assets` | oversized assets, missing dimensions, mixed formats, missing alt text, premium/trademark flags, image-format spread | image art direction, illustration/photo cohesion | Partial; screenshot/human review needed. |
| `low_layout_variety` | high similarity across section fingerprints, repeated class stacks, repeated page structures | whether repetition is purposeful | Partial; compare within template and against category. |
| `saturated_category_no_differentiation` | category, similarity candidates, repeated content/layout fingerprints against existing assets | whether value proposition is distinct enough for marketplace | Manual with similarity and category evidence. |
| `poor_interaction_polish` | no hover/focus states, legacy IX2 evidence, excessive or missing animations, missing instructions page when interactions exist | whether motion feels distracting or polished | Partial; final interaction quality is manual. |

## MVP Scope

Start with a small proxy set that is already supported by existing code:

1. **Design-system maturity**
   - CSS variables present
   - Designer variables and modes present when Designer metadata is available
   - base tag styles detected
   - class naming consistency
2. **Typography and hierarchy**
   - body font defined
   - line-height unit spread
   - heading hierarchy
   - multiple H1 or skipped heading flags
3. **Color and accessibility**
   - contrast failures
   - color variable/ramp presence
4. **Interaction polish**
   - hover/focus/active states present
   - legacy IX2 evidence
   - instructions page when advanced interactions exist
5. **Layout repetition**
   - repeated section DOM fingerprints across the sampled pages
   - repeated class-stack fingerprints across sections

Do not include saturated-category differentiation in the first proxy extractor. It depends on cross-template similarity and category inventory, which should be a separate lane.

## Evidence Shape

```json
{
  "rule_id": "wf.template.visual.proxy.design_system_maturity",
  "finding_bucket": "visual_quality",
  "sub_buckets": ["weak_visual_hierarchy", "poor_typography_quality"],
  "status": "manual",
  "severity": "minor",
  "coverage": "partial",
  "confidence": 0.62,
  "proxy_signals": [
    {
      "id": "css.variables_absent",
      "value": true,
      "source": "published_css",
      "supports": ["outdated_visual_style", "poor_typography_quality"]
    },
    {
      "id": "headings.skipped_levels",
      "value": 3,
      "source": "published_html",
      "supports": ["weak_visual_hierarchy"]
    }
  ],
  "manual_prompt": "Compare this template against approved Good and Exceptional examples for current visual quality, hierarchy, and polish."
}
```

## Determinism Boundary

Use deterministic extraction for:

- HTML structure
- CSS declarations
- class and component naming
- variable presence
- heading order
- contrast and accessibility issues
- asset metadata
- interaction inventory
- layout fingerprints

Use screenshots for:

- preserving review-time evidence
- confirming rendered state
- measuring visual positions, colors, spacing, and cropping
- reviewer comparison against golden cases

Do not use screenshots alone for:

- final "outdated" decisions
- Good vs Exceptional
- category differentiation
- rejection language

## Layout Fingerprint Sketch

For each sampled page:

1. Extract top-level sections from `<main>`, `section`, landmark roles, and high-level Webflow section classes.
2. For each section, compute a normalized fingerprint:
   - tag sequence depth 2-3
   - heading levels present
   - CTA/link count
   - image/video count
   - form/list/card-like child count
   - normalized class-token families
3. Compare fingerprints within the same template:
   - repeated section ratio
   - repeated content-section ratio
   - unique section count
   - repeated page-structure ratio
4. Ignore low-content spacer/divider sections for layout-repetition risk.
5. Store only hashes and human-readable evidence summaries in D1.

This supports `basic_or_default_layout` and `low_layout_variety`, but it does not decide whether repetition is appropriate.

## Next Implementation Slice

Next, wire proxy extraction into calibration rather than rating:

- store `visual-proxy-features.json` as a `visual_quality_proxy_snapshots` artifact
- compare proxy findings against approved golden cases once approved cases exist in D1
- add rendered screenshot artifact capture for the same URL and timestamp
- keep output evidence-only until a golden-set canary proves stable behavior
