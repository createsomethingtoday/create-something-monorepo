# Visual Quality Proxy Canary Audit

**Status:** Draft
**Date:** 2026-05-26
**Canary script:** `packages/webflow-template-review-mcp/scripts/run-visual-quality-proxy-canary.ts`
**Input calibration directory:** `/tmp/webflow-template-review-visual-quality-calibration-2026-05-26-v3`
**Final output directory:** `/tmp/webflow-template-review-visual-proxy-canary-2026-05-26-v2`

## Summary

The first visual-proxy golden-set canary completed successfully across 30 public URLs with no fetch failures. The proxy extractor found evidence on all rejected visual-quality cases, but also found medium proxy load on 4 approved controls.

This is a useful stability result: visual proxies are valuable for reviewer focus and manual quality review, but they are not stable enough for automated quality-band classification.

## Command

```bash
pnpm --filter @create-something/webflow-template-review-mcp visual-quality:proxy-canary -- \
  --input /tmp/webflow-template-review-visual-quality-calibration-2026-05-26-v3 \
  --out /tmp/webflow-template-review-visual-proxy-canary-2026-05-26-v2 \
  --approved-good-limit 10 \
  --approved-exceptional-limit 5 \
  --rejected-visual-limit 10 \
  --app-guideline-control-limit 5 \
  --timeout-ms 45000
```

## Sample

| Label | Count |
| --- | ---: |
| Approved Good | 10 |
| Approved Exceptional | 5 |
| Rejected visual-quality | 10 |
| Rejected app/guideline control | 5 |
| Total | 30 |

All 30 URLs completed.

## Result

| Metric | Value |
| --- | ---: |
| Approved controls with medium/high proxy load | 4 / 15 |
| Approved controls with medium/high proxy rate | 26.7% |
| Rejected visual-quality cases with any proxy signal | 10 / 10 |
| Rejected visual-quality any-signal rate | 100% |
| Failed URL extractions | 0 |

Risk-band distribution:

| Label | Low | Medium | High |
| --- | ---: | ---: | ---: |
| Approved Good | 8 | 2 | 0 |
| Approved Exceptional | 3 | 2 | 0 |
| Rejected visual-quality | 3 | 7 | 0 |
| Rejected app/guideline control | 4 | 1 | 0 |

## Extractor Adjustment

The first canary run produced one high-proxy approved Good case, `Nagano`, due partly to repeated decorative spacer/divider sections. The extractor was adjusted to compute layout repetition on content-bearing sections only.

After adjustment:

| Nagano metric | Before | After |
| --- | ---: | ---: |
| All-section repeated ratio | 0.5 | 0.5 |
| Content-section repeated ratio | n/a | 0.0 |
| Signal count | 4 | 3 |
| Risk band | high | medium |

This confirms the canary loop is useful: it found a noisy proxy and produced a broadly valid tightening rule.

## Approved Controls Still Trigger Visual Proxies

Approved controls with medium proxy load:

| Label | Template | Buckets |
| --- | --- | --- |
| Approved Good | Glymora | `incohesive_assets`, `poor_typography_quality`, `weak_visual_hierarchy` |
| Approved Good | Nagano | `basic_or_default_layout`, `poor_typography_quality`, `weak_visual_hierarchy` |
| Approved Exceptional | REELUP Archived 20260522 | `incohesive_assets`, `poor_typography_quality`, `weak_visual_hierarchy` |
| Approved Exceptional | Frentavo | `basic_or_default_layout`, `poor_typography_quality`, `weak_visual_hierarchy` |

Interpretation: these proxies overlap with normal reviewer feedback on approved templates. They should be treated as review-focus signals, not quality-band labels.

## Stop Condition

Do not expose visual-proxy findings as reviewer-facing `average`, `good`, `likely rejected`, or `exceptional` classification.

Current approved-control medium/high proxy rate is too high. The lane can safely emit:

- proxy evidence
- manual quality review required
- visual-quality sub-buckets
- screenshot/artifact capture requests

It should not emit:

- automatic visual rejection
- Good vs Average distinction
- Exceptional recommendation
- creator-facing visual feedback without human confirmation

## Next Gate

Before reviewer-facing use:

1. Expand the canary to 100 cases with balanced reviewer and category coverage.
2. Separate accessibility/content hygiene proxies from visual-taste proxies.
3. Add screenshot capture for the same run ID so reviewers can inspect rendered evidence.
4. Add category-aware thresholds; landing pages, ecommerce, SaaS, portfolio, and app templates should not share one visual-proxy threshold.
5. Require approved-control medium/high proxy rate to fall below the agreed threshold before any visual-proxy language affects recommendation labels.
