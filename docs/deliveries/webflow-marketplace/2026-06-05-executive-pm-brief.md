# Webflow Marketplace Executive PM Brief

**Prepared:** 2026-06-05
**Linear:** CRE-545
**Primary business question:** Are the Marketplace UI, validation, and agent-process changes improving submission quality and buyer conversion enough to reverse the Templates decline?

## Executive Summary

The work is directionally correct and has likely stabilized the marketplace after a sharp multi-month decline, but it has not yet proven a top-of-funnel recovery.

The strongest live read is that the decline is not caused by checkout or detail-page conversion. The leak is upstream: fewer visitors are selecting templates from browse/search results. The redesign, richer search, card signals, and detail conversion tracking all target that exact step. Early June results show orders and downstream conversion stabilizing, but `Selected/View` remains around 5 percent, roughly half the winter level.

The quality loop has improved materially. The submission form now requires the Webflow Way Validator app by default before a template can enter review, and it sends creators to the Asset Dashboard for review status, validation, and marketplace insights. The review MCP and agent guidance were tightened so automated findings support human review rather than becoming ungrounded approval/rejection decisions.

## PM Bottom Line

| Area | Current read | Confidence |
| --- | --- | --- |
| Submission quality | Positive. Validator preflight and Asset Dashboard routing create a cleaner creator path before review. | High from repo evidence. |
| Search and marketplace experience | Positive implementation progress. Code Components and `webflow-template-search` now support richer discovery than native Webflow lists. | High from repo evidence. |
| Business impact | Stabilizing, not recovered. Orders are no longer in free-fall, but browse-to-select has not moved. | Medium from live analytics notes; refresh needed. |
| Measurement | Better than before due to detail-tracker events, but incomplete. Signal/attribution props are still not queryable in Amplitude. | Medium-high from repeated live checks. |
| Risk | Desktop Safari/WebKit script errors remain unresolved and confound the experiment. | High from live RUM/Clarity notes. |
| Next growth bet | Agent-native template discovery with Webflow MCP is a coherent experiment because human browse-to-select is stuck. | Medium; needs scoped experiment. |

## What Changed

1. **Marketplace page components**
   - `packages/webflow-components` now includes Marketplace landing, search, result, detail, signal, and conversion-tracking components.
   - Existing Webflow-native grid/filter behavior can be replaced incrementally instead of rebuilding every page natively in Designer.

2. **Search and category infrastructure**
   - `packages/webflow-template-search` provides a D1-backed search worker with scopes, filters, facets, pills, pagination, stable image sync, and webhooks.
   - `apps/webflow-marketplace-category-cloud` provides a Webflow Cloud SSR path for category pages.

3. **Submission quality gate**
   - `apps/marketplace-template-submission-cloud` enforces a Validator app preflight by default.
   - The published URL route requires normal site validation plus a Validator bridge and latest persisted 100 percent pass result.

4. **Creator workspace**
   - The post-submission success path directs creators to the Asset Dashboard.
   - Dashboard routes cover assets, marketplace insights, uploads, profile/API keys, and submission status.

5. **Agent review process**
   - Review MCP guidance explicitly separates supplemental evidence from final human review.
   - Placeholder/lorem findings, utility-page examples, alt-text findings, and asset-size limits now have more precise interpretation.

## Early Impact Read

Live measurement notes show:

- January to May orders declined from 11,089 to 6,516, while traffic stayed healthy.
- `Order/View` fell from 0.51 percent in January to 0.25 percent in May.
- `Selected/View`, the browse-to-template-select step, fell from about 10.3 percent in January to about 5.2 percent in May.
- Early June is roughly flat-to-slightly-up versus May on orders and `Order/View`, but `Selected/View` remains around 4.9 to 5.0 percent.
- Downstream conversion has improved: purchase CTA per detail view and CTA-to-order are healthy enough to offset some top-of-funnel softness.

Interpretation: the redesign appears to have helped stabilize conversion efficiency, but it has not yet reopened discovery.

## Open Blockers

1. **Desktop Safari/WebKit errors**
   - Live reviews repeatedly showed Safari/WebKit error rates remaining high after publish attempts.
   - Chrome improved at points, but desktop Safari did not, suggesting the WebKit-specific bug is either not fixed or not live.

2. **Analytics prop pipeline**
   - Detail tracker scopes are live and high-volume.
   - Top-level `signal_window`, `signal_density`, `attribution_present`, and `attribution_match` were still not queryable in Amplitude after multiple checks.
   - The likely causes are an analytics sanitizer allowlist or production not serving the normalized build.

3. **No proof yet of top-of-funnel lift**
   - Post-deploy week average `Selected/View` was essentially identical to the pre-deploy week in the supplied analysis.

## Recommended PM Decisions

1. Treat the release as **quality and stabilization progress**, not a claimed growth win yet.
2. Prioritize fixing measurement blockers before declaring signal-badge or attribution impact.
3. Ask engineering for a Safari/WebKit RUM error-stack repro, not another aggregate dashboard review.
4. Continue weekly tracking of `Selected/View` or `template_card_clicked / results_rendered` as the north-star metric.
5. Scope the Webflow MCP agentic discovery experiment as a new channel/cohort, not merely another UI iteration.

## Repo Evidence

- [Webflow Components README](../../../packages/webflow-components/README.md)
- [Marketplace landing Code Components baseline](../../../specs/webflow-marketplace/marketplace-landing-page-code-components-baseline-2026-05-24.md)
- [Template search worker README](../../../packages/webflow-template-search/README.md)
- [Category Cloud app README](../../../apps/webflow-marketplace-category-cloud/README.md)
- [Template submission Cloud README](../../../apps/marketplace-template-submission-cloud/README.md)
- [Validator app preflight](../../../apps/marketplace-template-submission-cloud/lib/intake/validator-app.ts)
- [Webflow Way Validator README](../../../packages/webflow-template-validation/README.md)
- [Template Review MCP README](../../../packages/webflow-template-review-mcp/README.md)
