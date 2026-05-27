# Visual Quality Signal Standardization

**Status:** Draft
**Date:** 2026-05-26
**Related artifacts:** `ai-native-review-phase-1-subset.md`, `rubric-codification-map.md`, `phase1-expanded-calibration-audit-2026-05-26.md`, `visual-quality-calibration-audit-2026-05-26.md`, `visual-quality-proxy-extraction-plan.md`, `visual-quality-self-healing-loop.md`

## Purpose

Visual quality is one of the hardest template-review signals to codify because reviewers often describe the same underlying issue with different language. The goal is not to make an agent the final judge of taste. The goal is to standardize the vocabulary, evidence, and escalation path for low-quality visual patterns so reviewers and agents align on what a quality template means.

## Airtable Observation

A read-only sample of 200 recent rejected Asset Versions on 2026-05-26 showed:

| Signal | Count | Rate |
| --- | ---: | ---: |
| Rejected records sampled | 200 | 100% |
| Visual-style language detected | 85 | 42.5% |
| Exact outdated-style phrasing detected | 12 | 6.0% |
| Rejected Low quality records | 105 | 52.5% |

Top rejection reasons in the same sample:

| Rejection reason | Count |
| --- | ---: |
| UI/UX Concerns | 63 |
| App issue | 46 |
| Other | 37 |
| Guideline Infringement | 34 |
| Invalid Submission | 12 |
| Duplicate submission | 5 |
| Access/Credentials/Paywall | 3 |

Reviewer distribution:

| Reviewer | Rejected rows | Visual-style signals | Exact outdated phrasing | Note |
| --- | ---: | ---: | ---: | --- |
| Mariana Segura | 102 | 65 | 0 | Usually uses broader UI/UX language such as default/common patterns, poor typography, weak hierarchy, poor asset cohesion, basic/flat layouts. |
| Natalia Ledford | 18 | 17 | 12 | Frequently uses the exact "outdated visual style" phrasing, usually under `Other`. |
| Pablo Miranda | 44 | 0 | 0 | Mostly app issue and guideline lanes in this sample. |
| Shea Sisco | 35 | 2 | 0 | Mostly guideline, invalid submission, app, and access lanes in this sample. |
| Vicki Chen | 1 | 1 | 0 | Too small to infer a tendency. |

Interpretation: the signal is real and frequent, but the exact phrase is reviewer-dependent. Codify the underlying quality dimensions, not the wording.

## Executable Calibration

The first executable calibration hook is `packages/webflow-template-review-mcp/scripts/calibrate-visual-quality.ts`.

It reads Airtable only, normalizes reviewer feedback into the sub-buckets below, and emits proposal artifacts under `/tmp`. Alias proposals are sourced only from rejected visual-quality cases; approved Good/Exceptional rows and app/guideline rows are controls for drift and noise detection.

Current run notes are captured in `visual-quality-calibration-audit-2026-05-26.md`.

## Canonical Bucket

Use this canonical finding bucket:

```json
{
  "finding_bucket": "visual_quality",
  "canonical_signal": "outdated_or_low_differentiation_visual_style",
  "coverage": "manual_with_proxy_evidence",
  "final_decision_owner": "human_reviewer"
}
```

## Sub-Buckets

Normalize feedback into these sub-buckets:

| Sub-bucket | Meaning | Automation posture |
| --- | --- | --- |
| `outdated_visual_style` | The design feels dated relative to current marketplace expectations. | Manual, supported by benchmark comparison and style signals. |
| `basic_or_default_layout` | Layouts feel too close to default/common template sections or lack meaningful composition. | Partial via section/layout fingerprints. |
| `weak_visual_hierarchy` | Content priority, spacing, scale, or emphasis does not guide the user clearly. | Partial via heading/CTA/spacing proxies, final judgment manual. |
| `poor_typography_quality` | Font choices, type scale, readability, or typographic hierarchy feel below current quality bar. | Partial via CSS/type-scale/line-height checks. |
| `poor_color_palette_or_contrast` | Palette feels dated, inconsistent, or inaccessible. | Partial via contrast and palette extraction; taste remains manual. |
| `incohesive_assets` | Imagery, icons, illustrations, or cutouts do not share a cohesive direction. | Partial via asset metadata and screenshot review; licensing/manual context needed. |
| `low_layout_variety` | Pages or sections repeat the same structure without enough purposeful variation. | Partial via layout fingerprints. |
| `saturated_category_no_differentiation` | The template enters a crowded category without distinct quality, use-case, or buyer value. | Manual with similarity/category context. |
| `poor_interaction_polish` | Interactions feel distracting, absent, old, or inconsistent with expected behavior. | Partial via interaction inventory and hover/focus coverage. |

## Why This Should Not Be A Single Auto-Reject Rule

Do not create a deterministic rule named "outdated visual style = reject." That would encode reviewer phrasing rather than quality. It would also overfit to one reviewer’s wording and under-detect other reviewers’ broader UI/UX feedback.

Instead:

- agents should identify visual-quality risk buckets
- agents should attach measurable proxies and screenshots
- agents should compare against approved Good/Exceptional references
- reviewers should confirm whether the visual risk is rejectable, changes-request material, or acceptable for the category

## Appeal And Consistency Boundary

Creator appeals may compare a rejected visual-quality case against an approved template with objective issues. The balanced 50-case multimodal calibration captured this exact pattern:

- `Automatia` was rejected Low quality for a subjective visual-quality concern, but the published-site sandbox found usable evidence with no objective findings.
- `Introx` was approved Good, but the sandbox found horizontal overflow on desktop and mobile plus missing-alt evidence.

This comparison is legitimate for an appeal/equity review, but it is not a direct contradiction by itself. Objective implementation issues and subjective visual-quality bands are different decision surfaces.

Standard handling:

- use objective validators to verify cited technical issues in comparison templates
- use visual-quality buckets and approved/rejected precedents to evaluate the rejected template
- ask whether similar objective issues were waived, resolved, or considered non-blocking in approved examples
- do not use an approved template's objective issue as proof that a rejected template should be approved
- do not use a rejected template's clean objective run as proof that its visual-quality rejection was wrong

The appeal/equity lane should output evidence-only consistency questions for human review.

Current artifact proof:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:compare -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --target Automatia \
  --cited Introx \
  --out /tmp/webflow-template-review-appeal-equity-automatia-vs-introx-2026-05-27
```

Output:

- `appeal-equity-comparison.json`
- `appeal-equity-comparison.md`
- 3 evidence findings
- 5 human consistency questions

This is the correct shape for the "outdated style" problem: the system can standardize what evidence must be compared, while keeping the subjective quality judgment and creator-facing response with a human reviewer.

Batch proof:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:batch -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --out /tmp/webflow-template-review-appeal-equity-batch-low-quality-vs-approved-issues-2026-05-27 \
  --limit 8
```

The batch produced 8 comparison packets from 9 eligible rejected-low-quality targets. Four comparisons were same-reviewer comparisons. The narrowness matters: a 50-case slice had only one approved template with substantive objective findings, so real creator-cited comparison examples should be collected rather than inferred from calibration data alone.

Creator-cited intake now handles that collection step:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:intake -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --appeals packages/webflow-template-review-mcp/fixtures/appeal-equity-intake.sample.jsonl \
  --out /tmp/webflow-template-review-appeal-equity-intake-automatia-introx-2026-05-27 \
  --run-comparisons
```

This resolved the creator-cited marketplace URL for `Introx` to the captured calibration case and generated the same comparison packet automatically. For future "outdated style" appeals, collect the exact cited URLs or template names first, then let intake decide whether the evidence is ready or needs capture.

An unresolved intake smoke now writes `appeal-equity-evidence-capture-queue.jsonl` when a cited comparison is not already mapped to captured evidence. That queue should drive follow-up mapping or sandbox capture before a reviewer compares subjective visual-quality rejection against a cited approved example.

The capture queue now has a bounded runner. Without mappings it produces `needs_marketplace_mapping`; with a reviewed mapping it prepares a local published-site sandbox bundle and emits the E2B command for later execution. This keeps "outdated style" appeals evidence-first without letting the agent browse or compare arbitrary cited templates without a captured artifact.

Captured cited evidence can re-enter comparison through external comparison mode. This is important for "outdated style" claims because many creator-cited examples will not be in the current calibration manifest. The external mode compares a resolved rejected target against a normalized cited evidence directory, while explicitly marking the cited template's approved/published status as unverified until a status verification artifact confirms it.

Status verification is a separate step:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:verify-status -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --lookup https://webflow.com/templates/html/introx-website-template \
  --out /tmp/webflow-template-review-appeal-equity-status-introx-2026-05-27
```

For the Automatia/Introx appeal proof, this verified `Introx` as `trusted_or_historical_review` by matching the cited marketplace URL to `e2b_calibration_case_006`, the private approved outcome, and the status-alignment row. The follow-up external comparison then changed from "status claim unverified" to `external_cited_status_verified`, but it still left the subjective Automatia visual-quality decision with human precedent review.

The widening path is casebook mode:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:casebook -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --appeals packages/webflow-template-review-mcp/fixtures/appeal-equity-intake.sample.jsonl \
  --out /tmp/webflow-template-review-appeal-equity-casebook-automatia-introx-2026-05-27 \
  --run-external-comparisons
```

This produced one ready-for-human-review appeal packet for Automatia/Introx with one verified cited status and one external comparison. Future visual-quality appeals should enter the same casebook path so the system scales by adding evidence rows, not by improvising new subjective judgments.

Casebook scoring is the final pre-review gate for this lane. It blocks rows with unresolved evidence, unverified cited status, missing external comparisons, or missing reviewer-boundary questions. This is important for "outdated style" cases because the scorer prevents a clean objective run or a creator-cited approved example from being treated as a decision by itself.

For operators or Dify, use the wrapper command:

```bash
pnpm --filter @create-something/webflow-template-review-mcp appeal:equity:eval -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --appeals packages/webflow-template-review-mcp/fixtures/appeal-equity-intake.sample.jsonl \
  --out /tmp/webflow-template-review-appeal-equity-shadow-eval-automatia-introx-2026-05-27
```

That gives the visual-quality appeal lane a single stable gate: ready for human review or blocked on evidence. It still does not decide whether the visual-quality rejection should stand.

## Existing Validator Context

Existing validator iterations already provide useful proxy evidence:

| Package / surface | Useful signals | Limitation for visual style |
| --- | --- | --- |
| `packages/webflow-template-review-mcp/src/validation.ts` | Aggregates published-site Webflow Way and GSAP/custom-code validation into review evidence; clearly marks it as partial published-site evidence. | Does not score design quality or final review bands. |
| `packages/webflow-template-validation/worker/src/validators/content-validator.ts` | Placeholder/default text, headings, SEO metadata, links, short content, content-quality score. | Catches unfinished content, not whether a visual composition feels current. |
| `packages/webflow-template-validation/worker/src/validators/accessibility-validator.ts` | Contrast, alt text, heading structure, form labels, focus management. | Accessibility failures can contribute to quality risk, but passing accessibility is not the same as good design. |
| `packages/webflow-template-validation/worker/src/validators/asset-validator.ts` | Oversized assets, optimization, formats, usage patterns, premium/trademark risk hooks. | Asset size/format is a proxy; image subject, art direction, and cohesion need screenshot or human review. |
| `packages/webflow-template-validation/worker/src/validators/performance-validator.ts` | Page weight, render blocking resources, Core Web Vitals estimates, image/script counts. | Performance can support site optimization quality, not visual modernity. |
| `packages/webflow-template-validation/worker/src/validators/interactions-validator.ts` | Legacy IX2 detection with Lottie handling, interaction policy evidence. | Interaction policy is not the same as interaction polish or delight. |
| `packages/webflow-template-validation/worker/src/validators/designer-validator.ts` | Variables, components, styles, pages, assets from Designer data when available. | Strong future source for design-system maturity, but current output still needs mapping into quality buckets. |
| `packages/webflow-site-analyzer-mcp/src/checklist/designer-checklist.ts` | Variables, base tag styles, class naming consistency, required pages, responsive breakpoints, asset formats, CMS structure. | Good structural proxies, but several key quality checks remain manual because Designer metadata is incomplete. |

## Proposed Evidence Shape

Every visual-quality finding should separate measured proxies from judgment:

```json
{
  "rule_id": "wf.template.visual.outdated_or_low_differentiation_style",
  "status": "needs_human_review",
  "finding_bucket": "visual_quality",
  "sub_buckets": ["basic_or_default_layout", "poor_typography_quality"],
  "proxy_signals": [
    "layout_fingerprint_similarity:high",
    "type_scale_consistency:weak",
    "asset_cohesion:manual_required"
  ],
  "manual_prompt": "Does this template feel current, differentiated, and strong enough for its category compared with approved Good and Exceptional examples?",
  "final_decision_owner": "human_reviewer"
}
```

## Calibration Plan

1. Build a visual-quality golden set:
   - 25 approved Good
   - 10 approved Exceptional
   - 25 rejected visual/UI/UX/outdated/basic examples
   - 10 rejected technical/app/guideline examples as negative controls
2. Normalize reviewer feedback into sub-buckets.
3. Attach evidence:
   - agent-controlled published-site validator output
   - Designer checklist output where access is guaranteed or already available
   - supplemental Validator app output only when already available and marked non-gating
   - screenshots at desktop/tablet/mobile
   - CSS/type/spacing/layout fingerprints
   - category and similarity context
4. Have the agent predict only:
   - quality-risk buckets
   - confidence
   - evidence sufficiency
   - whether a human should consider rejection, changes requested, Good, or Exceptional
5. Compare the prediction to human outcomes and reviewer notes.

## Reviewer-Facing Language

Use standardized feedback templates after a reviewer confirms the finding:

| Confirmed sub-bucket | Feedback direction |
| --- | --- |
| `outdated_visual_style` | Refresh the visual direction to better align with current marketplace expectations, including typography, color, spacing, and UI patterns. |
| `basic_or_default_layout` | Add more intentional section composition and layout variety so the template feels purpose-built rather than default or generic. |
| `weak_visual_hierarchy` | Strengthen the hierarchy with clearer scale, spacing, grouping, and emphasis so users can understand each page quickly. |
| `poor_typography_quality` | Improve font pairing, type scale, line height, and heading/body hierarchy for a more polished reading experience. |
| `incohesive_assets` | Use a more cohesive image/icon/illustration direction so visual assets feel part of one system. |
| `saturated_category_no_differentiation` | Add stronger category-specific differentiation, buyer value, or use-case depth for this crowded template category. |

## Decision Rule

Visual-quality risk can support a rejection or low-quality rating only when at least one of these is true:

- a reviewer confirms the visual-quality bucket
- the case matches a calibrated rejected visual-quality golden-set pattern
- multiple partial signals converge and the agent marks the decision as `manual_quality_review_required`

It should not be used as an automatic hard blocker in Phase 1.

## Self-Healing Boundary

Use `visual-quality-self-healing-loop.md` for calibration behavior. The system may update wording aliases, proxy weights, confidence thresholds, drift warnings, and golden-set proposals from confirmed outcomes. It must not silently change the quality standard or create final rejection rules without reviewer or lead approval.
