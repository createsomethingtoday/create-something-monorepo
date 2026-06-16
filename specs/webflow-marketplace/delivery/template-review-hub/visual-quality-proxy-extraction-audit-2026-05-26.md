# Visual Quality Proxy Extraction Audit

**Status:** Draft
**Date:** 2026-05-26
**Script:** `packages/webflow-template-review-mcp/scripts/extract-visual-quality-proxies.ts`
**Sample output:** `/tmp/webflow-template-review-visual-proxies-luxorily/visual-proxy-features.json`

## Summary

The first published-site visual proxy extractor is implemented. It accepts one public `https` URL and emits an evidence-only JSON artifact. It does not write to Airtable, D1, or review recommendations.

The extractor intentionally starts with structural proxies:

- CSS variable presence
- base tag coverage
- body font declaration
- small font sizes
- line-height unit pattern
- H1 count and skipped headings
- missing image alt rate
- hover/focus/active state presence
- class naming consistency
- combo class depth
- repeated section fingerprints

## Command

```bash
pnpm --filter @create-something/webflow-template-review-mcp visual-quality:extract-proxies -- \
  --url https://luxorily.webflow.io/ \
  --out /tmp/webflow-template-review-visual-proxies-luxorily
```

## Sample Result

The sample generated:

| Metric | Value |
| --- | ---: |
| Proxy signals | 2 |
| Visual proxy findings | 3 |
| CSS variables | 550 |
| Base tag coverage | 1.0 |
| H1 count | 1 |
| Skipped headings | 0 |
| Images | 53 |
| Missing alt count | 27 |
| Section count | 12 |
| Repeated section ratio | 0.083 |

Signals:

| Signal | Value | Supported buckets |
| --- | ---: | --- |
| `typography.small_font_sizes_detected` | 3 | `poor_typography_quality`, `weak_visual_hierarchy` |
| `images.missing_alt_rate_high` | 0.509 | `incohesive_assets` |

Findings:

| Finding | Severity | Confidence |
| --- | --- | ---: |
| `wf.template.visual.proxy.incohesive_assets` | minor | 0.47 |
| `wf.template.visual.proxy.poor_typography_quality` | minor | 0.47 |
| `wf.template.visual.proxy.weak_visual_hierarchy` | minor | 0.47 |

## Interpretation

This is the right shape for Phase 1. The extractor finds concrete published-site evidence that can support visual-quality review, but it does not claim the template is outdated, rejected, Good, or Exceptional.

The sample also shows why this should not be reviewer-facing rating language yet: many structural issues can be present on templates that may still be approved after revision or reviewer override.

## Storage Decision

`review-ledger.phase1.sql` now includes `visual_quality_proxy_snapshots` for future storage of feature artifacts:

- `source_url`
- `extraction_version`
- `features_json`
- optional review run link
- optional artifact URL

The extractor still only writes local JSON. D1 persistence should be added only when the review-run pipeline exists.

## Next Gate

Before using proxy findings for classification:

1. Run proxy extraction against a small approved/rejected golden-set sample.
2. Confirm proxy false-positive rates on approved Good and Exceptional rows.
3. Capture screenshots at the same timestamp as proxy extraction.
4. Store proxy artifacts and screenshots under the same run ID.
5. Keep the final recommendation unchanged until golden-set canary metrics are stable.
