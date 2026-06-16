# Visual Quality Calibration Audit

**Status:** Draft
**Date:** 2026-05-26
**Sample directory:** `/tmp/webflow-template-review-visual-quality-calibration-2026-05-26-v3`
**Calibration script:** `packages/webflow-template-review-mcp/scripts/calibrate-visual-quality.ts`
**Ledger import-prep script:** `packages/webflow-template-review-mcp/scripts/prepare-visual-quality-ledger-import.ts`

## Summary

The visual-quality calibration path is now executable as a read-only Airtable sampling script. It produces normalized feedback rows, proposed golden cases, proposed aliases, and a summary file without writing to Airtable.

The important result is not that the agent can now reject for "outdated visual style." It cannot. The important result is that reviewer feedback can be normalized into stable visual-quality buckets and used to propose calibration updates behind a human approval gate.

## Command

The successful run used Infisical-backed `AIRTABLE_API_KEY`:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp calibration:visual-quality -- \
  --rejected-limit 200 \
  --approved-good-limit 25 \
  --approved-exceptional-limit 10 \
  --out /tmp/webflow-template-review-visual-quality-calibration-2026-05-26-v3
```

## Output Files

| File | Purpose |
| --- | --- |
| `visual-quality-feedback.normalized.jsonl` | One normalized row per sampled Asset Version. |
| `visual-quality-alias-proposals.jsonl` | Proposed reviewer-language aliases for canonical buckets. |
| `visual-quality-golden-cases.proposed.jsonl` | Proposed Good, Exceptional, visual-rejection, and control cases. |
| `visual-quality-summary.json` | Run metrics and artifact paths. |

## Ledger Import Guard

The calibration output can be converted into D1-ready SQL with:

```bash
pnpm --filter @create-something/webflow-template-review-mcp calibration:visual-quality:prepare-ledger -- \
  --input /tmp/webflow-template-review-visual-quality-calibration-2026-05-26-v3 \
  --out /tmp/webflow-template-review-visual-quality-calibration-2026-05-26-v3/ledger-import
```

This emits:

| File | Purpose |
| --- | --- |
| `visual-quality-policy-proposals.sql` | Inserts proposal rows into `visual_quality_policy_proposals`. These do not activate policy. |
| `visual-quality-approved-import.sql` | Inserts active aliases/golden cases only when an approval manifest names approved IDs. Empty by default. |
| `visual-quality-approval-manifest.template.json` | Reviewer/lead approval template listing candidate IDs. |
| `visual-quality-ledger-import-summary.json` | Counts and output paths. |

Verification against the D1 schema loaded 283 policy proposals and 0 active aliases/golden cases. That is the intended default: every candidate remains proposed until explicitly approved.

## Metrics

| Metric | Count | Rate |
| --- | ---: | ---: |
| Rejected rows sampled | 200 | 100% |
| Approved Good controls | 25 | n/a |
| Approved Exceptional controls | 10 | n/a |
| Rejected visual-signal rows | 108 | 54.0% |
| Rejected exact outdated-style rows | 13 | 6.5% |
| Rejected app/guideline controls with visual signals | 10 | 10.1% |
| Approved controls with visual feedback signals | 18 | 51.4% |
| Alias source rows | 98 | n/a |
| Alias proposals | 48 | n/a |

The high approved-control visual-feedback rate is expected and useful: approved Good and Exceptional reviews often still include visual, contrast, typography, spacing, or polish notes. That means visual findings are not rejection findings by default.

## Bucket Counts

| Bucket | Pre-tightening count | Tightened count |
| --- | ---: | ---: |
| `outdated_visual_style` | 53 | 26 |
| `poor_typography_quality` | 59 | 60 |
| `poor_color_palette_or_contrast` | 65 | 66 |
| `basic_or_default_layout` | 40 | 40 |
| `weak_visual_hierarchy` | 65 | 59 |
| `poor_interaction_polish` | 55 | 9 |
| `incohesive_assets` | 39 | 13 |
| `saturated_category_no_differentiation` | 82 | 13 |
| `low_layout_variety` | 23 | 23 |

## Noise Found

The first executable pass was intentionally broad and exposed several noisy aliases:

- `marketplace` and `category` matched app/guideline boilerplate instead of design differentiation.
- `interaction` and `interactions` matched app API language instead of interaction polish.
- `cohesive` matched positive or neutral feedback instead of incohesive asset direction.
- `outdated` matched phrases such as outdated Webflow APIs instead of outdated visual style.
- Approved controls frequently included visual improvement notes, proving visual wording alone is not a rejection label.

## Fixes Applied

1. Narrowed phrase matching for saturated category, interaction polish, incohesive assets, palette, hierarchy, and outdated style.
2. Classified app issue, guideline infringement, invalid submission, duplicate submission, and access/paywall rejections as controls before visual-quality labels.
3. Restricted alias proposals to rows labeled `rejected_visual_quality`.
4. Added control-rate metrics for app/guideline rows and approved Good/Exceptional rows.
5. Kept all outputs as proposals. No aliases, golden cases, or thresholds become active without reviewer or lead approval.

## Interpretation

The "outdated visual style" signal is real, but exact phrasing is only a small subset of visual-quality review. The broader reliable target is a canonical `visual_quality` lane with sub-buckets such as outdated style, basic/default layout, weak hierarchy, typography quality, color/contrast, asset cohesion, layout variety, saturated category differentiation, and interaction polish.

This lane should produce:

- normalized buckets
- evidence sufficiency
- reviewer-language alias proposals
- golden-case proposals
- drift warnings
- `manual_quality_review_required`

It should not produce:

- automatic visual-style rejection
- silent policy updates
- final Good/Exceptional rating changes
- reviewer-specific taste overfitting

## Next Gate

Before exposing this in reviewer-facing rating language:

1. Promote only approved aliases and golden cases into the D1 review ledger.
2. Add a small manually confirmed golden set for each visual sub-bucket.
3. Compare HTML/CSS/JS/design-system proxies against the visual buckets.
4. Use screenshots as evidence snapshots and layout/color/typography extraction inputs, not as standalone deterministic truth.
5. Add category-aware controls so saturated-category feedback is not applied equally to every template category.
6. Keep "outdated style" as a manual-quality lane until the golden-set canary shows stable behavior across reviewers.
