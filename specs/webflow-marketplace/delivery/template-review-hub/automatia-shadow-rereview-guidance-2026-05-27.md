# Automatia Shadow Re-Review Guidance

**Date:** 2026-05-27
**Template:** Automatia
**Published URL:** `https://automatia-template.webflow.io/`
**Posture:** draft guidance for human review, not an official appeal decision

## Purpose

Re-review the current published Automatia preview and produce concrete, creator-safe improvement guidance without turning the system into an autonomous rejection/rating tool.

This run also tests the appeal-support workflow: collect sandbox evidence, collect visual-quality proxies, generate a bounded guidance packet, and keep the final creator message draft behind reviewer approval.

## Commands Run

Prepare and run the published-site sandbox with enough network budget for five pages:

```bash
pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:prepare -- \
  --url https://automatia-template.webflow.io \
  --out /tmp/webflow-template-review-automatia-current-sandbox-bundle-1000req-2026-05-27 \
  --max-pages 5 \
  --max-network-requests 1000 \
  --viewports desktop:1365x900,tablet:768x1024,mobile:390x844 \
  --policy-snapshot-id template-review-policy.draft.automatia-guidance-2026-05-27

infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:e2b-run -- \
  --bundle-dir /tmp/webflow-template-review-automatia-current-sandbox-bundle-1000req-2026-05-27 \
  --out /tmp/webflow-template-review-automatia-current-e2b-1000req-2026-05-27 \
  --normalize \
  --bootstrap-browser \
  --timeout-ms 300000 \
  --request-timeout-ms 300000 \
  --sandbox-timeout-ms 900000 \
  --bootstrap-timeout-ms 600000
```

Extract visual-quality proxies:

```bash
pnpm --filter @create-something/webflow-template-review-mcp visual-quality:extract-proxies -- \
  --url https://automatia-template.webflow.io \
  --out /tmp/webflow-template-review-automatia-current-visual-proxies-2026-05-27 \
  --max-stylesheets 8 \
  --max-sections 60
```

Generate reviewer-safe creator guidance:

```bash
pnpm --filter @create-something/webflow-template-review-mcp guidance:draft -- \
  --title Automatia \
  --url https://automatia-template.webflow.io/ \
  --sandbox-normalized /tmp/webflow-template-review-automatia-current-e2b-1000req-2026-05-27/normalized \
  --html /tmp/webflow-template-review-automatia-current-e2b-1000req-2026-05-27/html-snapshot.html \
  --visual-proxies /tmp/webflow-template-review-automatia-current-visual-proxies-2026-05-27/visual-proxy-features.json \
  --network-log /tmp/webflow-template-review-automatia-current-e2b-1000req-2026-05-27/network-log.json \
  --guidance-rule-catalog specs/webflow-marketplace/delivery/template-review-hub/guidance-rule-catalog.phase1.json \
  --fetch-asset-sizes \
  --max-asset-sizes 40 \
  --out /tmp/webflow-template-review-automatia-current-guidance-2026-05-27
```

## Artifacts

| Artifact | Path |
|---|---|
| E2B sandbox output | `/tmp/webflow-template-review-automatia-current-e2b-1000req-2026-05-27/published-site-sandbox-output.json` |
| Normalized evidence | `/tmp/webflow-template-review-automatia-current-e2b-1000req-2026-05-27/normalized/published-site-sandbox-normalized.json` |
| Screenshots | `/tmp/webflow-template-review-automatia-current-e2b-1000req-2026-05-27/screenshots/` |
| Visual proxies | `/tmp/webflow-template-review-automatia-current-visual-proxies-2026-05-27/visual-proxy-features.json` |
| Guidance rule catalog | `specs/webflow-marketplace/delivery/template-review-hub/guidance-rule-catalog.phase1.json` |
| Creator guidance draft | `/tmp/webflow-template-review-automatia-current-guidance-2026-05-27/creator-guidance-draft.md` |
| Creator guidance JSON | `/tmp/webflow-template-review-automatia-current-guidance-2026-05-27/creator-guidance-draft.json` |

## Programmatic Signal Boundary

The guidance packet is now generated from structured signals rather than a hand-written Automatia checklist:

- Sandbox-normalized findings provide page URLs for missing H1s, overflow candidates, clipped-text candidates, image counts, and sampled viewport counts.
- The HTML snapshot provides text chunks, duplicate-copy groups, anchor labels/hrefs, and animation hook counts.
- The network log plus HEAD requests provide oversized image candidates.
- The visual-proxy artifact provides visual-risk rule IDs and proxy signals.
- `guidance-rule-catalog.phase1.json` provides editable thresholds, copy watchlist patterns, and link-label expectation rules.
- The generated packet now emits a `signal_sources` block so downstream agents can distinguish programmatic detectors, catalog-configured detectors, artifact-backed inputs, and signals that still require human review.

This still is not a final autonomous decision. The programmatic layer produces evidence-backed pointers and reviewer-safe guidance, while visual-quality judgment and creator-facing final language remain human-approved.

## Concrete Creator Pointers

These are the concrete places the creator can be pointed to from the current generated packet:

- Copy polish: search the site for `hel,ping`, `dthe`, `consultores`, `We partner with ambitious to turn ideas...`, and `Conversation rate`.
- Repeated content: review testimonials, process steps, FAQs, metrics, and case-study descriptions for reused placeholder copy.
- Repeated testimonial copy: `"The team is efficient and reliable. They delivered everything they promised..."`
- Repeated process copy: `"We dive deep into your business, audience and goals to uncover the right opportunities."`
- Repeated case-study copy: `"Intelligent AI agents that handle customer inquiries efficiently..."`
- Repeated FAQ copy: `"What industries do you work with?"`
- Visual system: review the home page and main AI/SaaS sections for typography hierarchy, spacing rhythm, section composition, and the red/black AI motif.
- Section variety: make hero, feature, process, testimonial, pricing, and case-study areas feel intentionally distinct.
- Scroll interactions: inspect sections using opacity/scroll animation classes, line animation classes, `ScrollTrigger`, `SplitText`, or Lenis.
- Responsive text containers: inspect desktop, tablet, and mobile states for nav labels, buttons, cards, headings, and metric labels.
- Heading structure: add one clear visible and semantic H1 on `/solutions`, `/contact`, `/works/ai-customer-support-system`, and `/works/aurea`.
- Large assets: compress or resize sampled images above 1 MB, including `ASSASAAS.png`, `ChatGPT Image 13 may 2026`, `ChatGPT Image 27 abr 2026`, and `worksimg.png`.
- Footer/navigation: confirm whether the footer `Process` link should route somewhere other than `/contact`.

## Evidence Summary

- Evidence status: usable.
- Pages sampled: 5.
- Rendered viewports sampled: 15.
- Total images in static sample: 57.
- Missing alt count: 0.
- Horizontal overflow candidates: 0.
- Clipped-text candidates: 107, treated as manual review candidates.
- Pages missing H1: `/solutions`, `/contact`, `/works/ai-customer-support-system`, `/works/aurea`.
- Visual proxy findings: weak visual hierarchy, basic/default layout, poor typography quality.
- Copy issues detected: 5.
- Duplicate text groups detected: 7.
- Large image requests above 1 MB in the sampled network log: 6.

## Draft Guidance Themes

1. **Content and copy polish**

   Replace placeholder and repeated copy with buyer-ready copy. Evidence includes visible typos (`hel,ping`, `dthe`, `consultores`), missing-word grammar (`We partner with ambitious...`), likely metric wording (`Conversation rate`), repeated testimonial content, repeated process-step descriptions, repeated case-study descriptions, and duplicated FAQ text.

2. **Visual-system refresh**

   Strengthen the visual system so the template feels less like a generic dark AI landing page. The current stable phrasing should be improvement-oriented: refresh typography scale, spacing rhythm, section composition, and the red/black AI motif with more distinctive art direction. Do not send a deterministic "outdated style" verdict without human comparison against current approved Good and Exceptional examples.

3. **Animation fallback and scroll validation**

   The page uses many scroll/line animation hooks: 26 opacity/scroll classes, 19 line-animation classes, plus `ScrollTrigger`, `SplitText`, and `lenis`. Sandbox full-page screenshots can show large blank regions until scroll activation is simulated. A reviewer should confirm the live scrolling experience and reduced-motion fallback before treating this as a defect.

4. **Semantic heading structure**

   Add one clear H1 to each major page. The home page has an H1, but sampled secondary pages do not.

5. **Responsive text check**

   Recheck text containers across desktop, tablet, and mobile. The clipped-text count is a heuristic and can include false positives, but it is useful as a manual checklist.

6. **Asset optimization**

   Compress large image assets and resize large PNGs to rendered dimensions. Sampled image requests above 1 MB included assets around 2.36 MB, 2.21 MB, 1.66 MB, 1.59 MB, 1.53 MB, and 1.28 MB.

7. **Template polish**

   Audit navigation and footer links. The footer label `Process` links to `/contact`; labels should match their destinations.

## Creator Message Draft

> Thanks for asking us to take another look at Automatia. Based on the current published preview, the strongest improvements would be:
>
> - Replace placeholder and repeated copy with polished, buyer-ready copy. Each testimonial, case study, process step, FAQ, and metric should be distinct, grammatically correct, and aligned to the AI/SaaS use case.
> - Strengthen the visual system so the template feels less like a generic dark AI landing page. Refresh the typography scale, spacing rhythm, section composition, and red/black AI motif with more distinctive art direction and more varied content sections.
> - Review the scroll-triggered animation setup and make sure important sections are visible with a safe fallback. Core content should not depend on animation timing to appear complete in automated, slow, or reduced-motion contexts.
> - Add one clear H1 to each major page and use lower heading levels for section structure. The visible page title should also be represented semantically.
> - Recheck text containers across desktop, tablet, and mobile. Any label, nav item, button, or card text should fit naturally without clipping or relying on overflow-hidden.
>
> The sampled validation also showed some solid foundations: no missing image alt text was found in the sampled static pages, and no horizontal overflow candidates were found in the sampled rendered viewports.
>
> This is guidance for revision, not a final marketplace decision. A reviewer should confirm the live scrolling experience and compare the visual direction against current approved templates before sending final feedback.

## Reviewer Boundary

- Do not send this as official feedback without reviewer approval.
- Do not frame the visual feedback as an autonomous outdated-style rejection.
- Do not use the current published preview as proof of the exact state reviewed previously.
- Treat clipped text and scroll-animation blank-region evidence as manual review prompts, not deterministic failures.
- Positive evidence matters: sampled alt text and horizontal overflow signals were clean.

## System Note

This run reinforces the specialized-lane approach:

- sandbox lane: page/runtime evidence
- visual-proxy lane: quality-risk proxies only
- guidance lane: creator-safe draft synthesis
- human reviewer: final appeal response, visual-quality judgment, and policy language
