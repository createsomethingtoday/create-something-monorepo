# Agency Buyer-Intent Article Workflow

> Parent plan: `docs/AGENCY_BUYER_INTENT_ARTICLE_ENGINE.md`
> Tracker template: `docs/examples/agency-buyer-intent-article-tracker.template.csv`
> Brief template: `packages/agency/content/templates/marketing/buyer-intent-article-brief.md`
> Image workflow: `docs/guides/AGENCY_ARTICLE_IMAGE_WORKFLOW.md`
> Analytics source: `packages/agency/src/lib/analytics/content-assets.ts`

## Purpose

Ship CREATE SOMETHING articles as measurable sales assets. Each article should
have a buyer, search intent, point of view, route, analytics metadata, CTA, and
review cadence.

## Tier Served

| Tier       | Role                                                                                    |
| ---------- | --------------------------------------------------------------------------------------- |
| Database   | Tracker rows, analytics events, lead records, source notes, Linear evidence.            |
| Automation | Article publishing, analytics event capture, sitemap, SEO metadata, UTM routing.        |
| Judgment   | Operating-design point of view, comparison criteria, approval boundaries, update calls. |

## Weekly Workflow

1. Select one article from the tracker.
2. Confirm or create a Linear issue.
3. Copy `packages/agency/content/templates/marketing/buyer-intent-article-brief.md`.
4. Fill buyer, keyword, intent, CTA, competitors, and proof requirements.
5. Fill the image plan: original visuals, screenshot targets, and rights
   status.
6. Research from primary sources and current vendor docs.
7. Capture real screenshots only where they support tool claims.
8. Draft the article using the standard structure.
9. Add the CREATE SOMETHING point of view:
   `AI automation needs operating rules before it needs more features.`
10. Redact, annotate, export, and document visual assets.
11. Publish the canonical custom-domain route.
12. Add the route to analytics content metadata.
13. Add SEO metadata and article JSON-LD through the shared SEO component.
14. Add sitemap entry if the route is indexable.
15. Distribute with UTM fields.
16. Update the tracker and Linear evidence.

## Article Production Checklist

- [ ] Tracker row exists.
- [ ] Linear issue exists.
- [ ] Content asset ID is stable.
- [ ] Primary keyword and secondary keywords are named.
- [ ] Buyer and funnel stage are named.
- [ ] Evaluation criteria are explicit.
- [ ] Comparison table or decision table exists.
- [ ] Visual plan names original visuals and screenshot targets.
- [ ] Screenshots are real product evidence, not homepage filler.
- [ ] Screenshots are redacted and annotated.
- [ ] Screenshot metadata includes capture date, checked date, and refresh due.
- [ ] Image rights status is cleared or original-owned.
- [ ] Alt text and captions are written.
- [ ] Recommendation path is opinionated.
- [ ] CTA is one of the approved CTAs.
- [ ] Source notes and last-updated date are present.
- [ ] SEO title, description, canonical URL, and article metadata are present.
- [ ] Analytics metadata exists for the live route.
- [ ] UTM campaign is defined.
- [ ] LinkedIn/supporting posts are queued.
- [ ] Friday review date is set.

## Approved CTAs

- `Map your first governed AI workflow`
- `Book Mapping Session`
- `Workflow Mapping Session`
- `Download checklist`
- `Read implementation path`

## Analytics Instrumentation

For every live route, add an entry to
`packages/agency/src/lib/analytics/content-assets.ts`.

Minimum metadata:

```ts
'/example-route': {
	contentAssetId: 'article.example-route.v20260601',
	contentType: 'article',
	contentCluster: 'ai-workflow-platform-comparisons',
	contentIntent: 'compare',
	contentBuyer: 'agency owner evaluating automation platforms',
	contentFunnelStage: 'consideration',
	contentPrimaryKeyword: 'best AI workflow automation platforms for agencies',
	contentPrimaryCta: 'map-governed-ai-workflow',
	contentLinearIssue: 'CRE-444',
}
```

This metadata is merged into page views, scroll events, content clicks, CTA
clicks, time-on-page events, and conversion events. Authenticated users are tied
by `userId`; anonymous visits are tied by `sessionId`.

## Visual Asset Workflow

Use `docs/guides/AGENCY_ARTICLE_IMAGE_WORKFLOW.md`.

Default mix for flagship articles:

- one original hero visual
- one comparison matrix or decision visual
- two to four tool screenshots when the article evaluates tools
- one CREATE SOMETHING framework diagram
- one CTA or checklist graphic when useful

Use screenshots for evidence: workflow builders, approval settings, audit logs,
observability dashboards, integration setup, and human-in-the-loop controls.
Use original diagrams for the point of view: allowed/ask/blocked policy states,
workflow maps, risk zones, stack maps, recovery paths, and operating manuals.

Do not use generic AI stock imagery. It weakens the brand and does not support
the article's argument.

## Lead Attribution

When a form, booking, or manual lead is created from article traffic, set:

```text
source=website
source_detail=<contentAssetId or canonical path>
campaign=<utm_campaign or contentAssetId>
service_interest=<offer lane>
estimated_value=<pipeline value if known>
```

Revenue influence is not a vanity metric. Only count it when a lead, booking,
proposal, or closed deal can be traced to a content asset through campaign,
source detail, session evidence, or a clear manual note.

## Friday Review

For each live article, update:

- `ranking`
- `clicks_28d`
- `sessions_28d`
- `identified_users_28d`
- `cta_clicks_28d`
- `form_starts_28d`
- `leads`
- `revenue_influenced`
- `visual_plan_status`
- `screenshot_refresh_due`
- `image_rights_status`
- `last_reviewed`
- `next_update_due`

Decision rules:

- If impressions rise but clicks are weak, revise title and meta description.
- If clicks rise but CTA clicks are weak, revise intro, decision table, and CTA
  placement.
- If CTA clicks rise but leads are weak, review booking or form friction.
- If rankings fall after a vendor release, refresh the article and source notes.
- If screenshots are stale, refresh them or replace them with original diagrams.

## Distribution

Each flagship article creates:

- 1 newsletter or short dispatch.
- 5 LinkedIn posts:
  - quick answer
  - comparison table
  - common mistake
  - operating-design POV
  - CTA or checklist
- 1 short demo or walkthrough.

Every distributed link should include UTM fields and point to the canonical
custom-domain page.
