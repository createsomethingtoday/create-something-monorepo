# Marketplace Measurement Trajectory Report

**Prepared:** 2026-06-05
**Measurement sources:** Live review notes from Amplitude, Clarity, and Datadog; repo evidence for instrumentation paths
**Important boundary:** Refresh live metrics before final PM/business decisions. June data in the supplied review is partial.

## Summary

The marketplace has a real conversion decline, and the current UI/UX work appears to have stabilized the floor rather than reversed the decline.

The key pattern is:

```text
View -> Select: down sharply
Select -> CTA: healthy and improving
CTA -> Order: healthy and stable-to-improving
```

This means checkout and detail-page conversion are not the primary issue. The business problem is discovery: fewer users select a template from browse/search results.

## Long-Range Pattern

Supplied monthly analytics notes showed:

| Month | Views | Orders | Order/View | Selected/View |
| --- | ---: | ---: | ---: | ---: |
| Dec 2025 | 2.46M | 9,508 | 0.39% | 7.1% |
| Jan 2026 | 2.19M | 11,089 | 0.51% | 10.3% |
| Feb 2026 | 2.10M | 9,886 | 0.47% | 9.7% |
| Mar 2026 | 2.29M | 8,662 | 0.38% | 6.7% |
| Apr 2026 | 2.58M | 7,817 | 0.30% | 7.7% |
| May 2026 | 2.57M | 6,516 | 0.25% | 5.2% |
| Jun 2026 partial | 0.38M | 978 | 0.26% | 4.9% |

Interpretation:

- Orders dropped about 41 percent from January to May.
- Traffic did not collapse; the marketplace retained a healthy audience.
- `Selected/View` dropped by about half from winter to May.
- June partial data shows stabilization near May levels, not recovery to winter levels.

## Week-Level Decomposition

The supplied 12-week analysis used `Template Selected` as a long-history proxy for reaching detail pages. It found:

- `Selected/View` fell from about 8.9 percent in late March to about 4.5 to 5.3 percent in May.
- `CTA/Selected` stayed healthy around 10 to 12 percent and slightly improved.
- `CTA/Order` stayed stable-to-rising around 36 to 46 percent.

Business implication:

The release is aimed at the right problem because TemplateGrid, richer search, and marketplace signals all target the browse-to-select leak. However, early metrics show the leak has not yet been reopened.

## Recent Daily Read

Supplied early-June notes showed:

| Day | Views | Selected/View | CTA/detail-view | Orders | Order/View |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2026-06-01 | 87,861 | 4.33% | 1.13% | 226 | 0.26% |
| 2026-06-02 | 91,068 | 4.95% | 1.53% | 250 | 0.27% |
| 2026-06-03 | 85,829 | 5.44% | 1.68% | 226 | 0.26% |
| 2026-06-04 partial | 64,808 | 4.93% | 1.53% | 189 | n/a |

Interpretation:

- Orders recovered from the immediate post-deploy dip and are holding around 220 to 250/day.
- CTA per detail view improved.
- The top-of-funnel `Selected/View` metric is still around 5 percent.
- This is stabilization at the bottom, not a confirmed reversal.

## CTA Direction

Supplied daily tracker notes showed purchase CTA per detail view improving:

| Day | Detail views | Purchase CTA | Rate |
| --- | ---: | ---: | ---: |
| 2026-05-31 | 9,590 | 113 | 1.18% |
| 2026-06-01 | 35,923 | 407 | 1.13% |
| 2026-06-02 | 36,405 | 556 | 1.53% |
| 2026-06-03 partial | 15,421 | 274 | 1.78% |

The downstream chain was also healthy:

- Checkout to order was approximately 1:1.
- 2026-06-02 reached a week-high order count in the supplied window.
- CTA growth appears to translate to real purchases, not just extra clicks.

## Tracking Instrumentation

The repo supports the detail funnel through:

- `TemplateDetailConversionTracker`
- grid-to-detail attribution in `sessionStorage`
- event scopes for results, card clicks, detail views, preview CTA clicks, and purchase CTA clicks
- `signal_window`, `signal_density`, `signal_bucket`, and `signal_metric` in code paths

Repo links:

- [TemplateDetailConversionTracker.tsx](../../../packages/webflow-components/src/components/marketplace/TemplateDetailConversionTracker.tsx)
- [templateAttribution.ts](../../../packages/webflow-components/src/components/marketplace/templateAttribution.ts)
- [TemplateGrid.tsx](../../../packages/webflow-components/src/components/grid/TemplateGrid.tsx)

## Measurement Blockers

### 1. Safari/WebKit Errors

Supplied live reviews repeatedly found Safari/WebKit error rates still high after multiple publish attempts:

- desktop Safari stayed around 2.7 to 2.8 errors/view in Datadog RUM-style checks
- Clarity corroborated high Safari and Mobile Safari script-error rates
- Chrome improved at points, but desktop Safari did not

This is a product and measurement blocker because Safari users may have a degraded marketplace experience while the experiment is running.

### 2. Normalized Analytics Props Not Landing

Supplied Amplitude checks showed:

- detail tracker scopes were live and growing
- `results_rendered`, `detail_viewed`, `detail_preview_cta_clicked`, `template_card_clicked`, and `detail_purchase_cta_clicked` were visible
- top-level `signal_window`, `signal_density`, `attribution_present`, and `attribution_match` were not queryable

Likely causes:

- analytics sanitizer or allowlist dropping the fields
- production not serving the normalized component build
- properties emitted under a different event or path than expected

This blocks PM analysis by signal density, signal bucket, and grid-originated attribution.

## Interpretation for PMs

The redesign should be described as:

```text
Stabilization and better instrumentation, with early downstream conversion improvement.
Not yet a proven top-of-funnel recovery.
```

Avoid saying:

```text
The redesign reversed the marketplace decline.
```

Use this instead:

```text
The redesign targets the confirmed browse-to-select leak and appears to have stabilized orders by improving downstream conversion. The north-star browse-to-select metric remains flat near 5 percent, so recovery still depends on improving discovery.
```

## Next Measurement Actions

1. Pull top Safari RUM error messages and stacks for `/templates` and related Code Component routes.
2. Confirm the live Amplitude payload in DevTools or Instrument Explorer for `signal_window`, `signal_density`, and `attribution_present`.
3. Verify which Webflow component library version is actually serving in production.
4. Track weekly `template_card_clicked / results_rendered` and compare to the winter 8 to 10 percent Selected/View benchmark.
5. Keep bots segmented out of human-funnel reporting and create a separate agent/crawler cohort for MCP experiments.
