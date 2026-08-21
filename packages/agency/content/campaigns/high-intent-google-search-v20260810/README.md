# High-intent Google Search planning artifact

**Campaign ID:** `agency-high-intent-search-v20260810`

**Source issue:** `CRE-1674`
**State:** planning; activation and spend are not authorized

This folder is the repo-owned plan for a bounded Google Search experiment. It
turns the approved Exa handoff into inspectable destinations, keywords, ads,
budgets, negative terms, measurement rules, and pre-spend gates. It is not an
Ads account export and must not be treated as evidence that a campaign is live.

## Launch order

| Priority | Cluster | Daily planning envelope | Destination |
| --- | --- | ---: | --- |
| 1 | Marketplace Workflow Review | USD 22 | `/marketplace-review-automation` |
| 2 | AI Workflow Recovery | USD 15 | `/ai-workflow-recovery` |
| 3 | Human Approval and Control | USD 10 | `/ai-workflow-control` |
| 4 | Brand | USD 3 | `/` |

Generic AI governance, RevOps, and customer-service demand stays paused even if
a research tool reports volume. Those clusters need route-specific public proof
before they can enter the plan.

## Evidence boundary

- Exa is comparative evidence about crowded and less-crowded language. It is
  not live Google auction evidence.
- Keyword Planner is the required pre-spend source for US volume, changes,
  competition, bid ranges, forecast, and geography.
- The campaign is Search-only, presence-only, exact/phrase-only, with Search
  Partners, Display expansion, Performance Max, Dynamic Search Ads, and
  automatic URL expansion disabled.
- Account mutation, campaign activation, and spend require separate operator
  approval after the Keyword Planner gate.

## Measurement boundary

The website keeps its existing privacy promise: first-party analytics only, no
ad pixels, no Google tag, no enhanced conversions, and no click identifiers.
After a visitor explicitly permits analytics, an allowlisted source, campaign,
intent, and landing path may persist in first-party session storage for 30
minutes. The site does not retain `gclid`, `wbraid`, `gbraid`, or `utm_term`.

Website signals:

1. `workflow_draft_started` — secondary intent signal.
2. `booking_form_started` and `booking_initiated` — handoff progress.
3. `booking_completed` — primary website signal.
4. Accepted opportunity — manual, offline operator judgment; not imported to
   Google in this plan.

Run the deterministic checks with:

```bash
pnpm --filter @create-something/agency search:campaign:check
```

Print a read-only D1 query with:

```bash
pnpm --filter @create-something/agency analytics:high-intent-search -- --days 90
```
