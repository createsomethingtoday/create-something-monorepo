# Buyer-Intent Article Brief

> Content asset ID:
> Linear issue:
> Owner:
> Status: brief | drafting | review | published | updating
> Canonical path:
> Publish target:
> Last updated:

## Search Target

- Primary keyword:
- Secondary keywords:
- Search intent: compare | versus | how-to | checklist | definition
- Buyer:
- Funnel stage: awareness | consideration | decision
- Competitors, tools, or alternatives included:

## Point of View

State the CREATE SOMETHING angle in one paragraph.

Default spine:

> Most AI automation fails because it lacks operating rules: approvals, blocked
> actions, audit trails, owner responsibilities, and recovery paths.

## Quick Answer

Write the answer a buyer should understand in the first 30 seconds.

## Evaluation Criteria

Use criteria that reflect operating design, not only features.

| Criterion      | Why it matters                                                                 | How to evaluate |
| -------------- | ------------------------------------------------------------------------------ | --------------- |
| Governance     | Who can approve, block, reverse, or inspect actions?                           |                 |
| Cross-tool fit | Does the workflow cross Notion, Slack, CRM, email, files, billing, or support? |                 |
| Human approval | Where must the agent ask before acting?                                        |                 |
| Audit trail    | Can the team reconstruct what happened?                                        |                 |
| Recovery       | What happens when the workflow fails or produces a bad recommendation?         |                 |
| Portability    | Can the workflow move if the vendor changes?                                   |                 |

## Recommended Structure

1. Quick answer or shortlist.
2. Who this guide is for.
3. Evaluation criteria.
4. Comparison table or decision table.
5. Individual breakdowns.
6. Best fit by use case.
7. Common mistakes.
8. Recommended implementation path.
9. CTA.
10. Source notes and last-updated date.

## Visual Plan

Default rule: create strategic visuals, collect screenshots for evidence.
For workflow, governance, offer, case-study, tool-comparison, or agent-behavior
visuals, attempt an Atlas-style canvas before creating a one-off graphic.
Use `packages/agency/content/templates/marketing/image-prompt.md` for generated
or designed visuals, and copy
`packages/agency/content/templates/marketing/image-metadata.md` into the article
asset folder before publish.

| Asset              | Create or collect | Canvas-first fit | Purpose                                       | Source / target | Status |
| ------------------ | ----------------- | ---------------- | --------------------------------------------- | --------------- | ------ |
| Hero visual        | create            | yes / no         | Make the article recognizable and ownable     |                 |        |
| Story canvas       | create            | yes              | Map owner, workflow, run/wait/stop, receipt   |                 |        |
| Comparison matrix  | create            | yes / no         | Help buyers scan options                      |                 |        |
| Tool screenshot 1  | collect           | no               | Prove a specific product claim                |                 |        |
| Tool screenshot 2  | collect           | no               | Prove a specific product claim                |                 |        |
| Framework diagram  | create            | yes              | Show the CREATE SOMETHING point of view       |                 |        |
| CTA graphic        | create            | yes / no         | Convert readers without generic marketing art |                 |        |

Screenshot targets should be workflow builders, approval settings, audit logs,
observability dashboards, integration setup, or human-in-the-loop controls. Do
not use vendor homepage screenshots as filler.

### Image Metadata

- Visual source folder:
- Atlas canvas source: existing starter map | new graph artifact | not applicable
- Canvas renderer: static-story | atlas | sigma | cosmograph | not applicable
- Canvas must show: owner | workflow artifact | automation | AI task | human judgment | stop boundary | receipt
- Hero visual:
- Screenshot targets:
- Screenshot capture date:
- Screenshot refresh due:
- Image rights status: pending | cleared | original-owned | replace-before-publish
- In-page visual placement:
- Route guardrail:
- Alt text owner:
- Annotation owner:
- Redaction notes:

## Comparison Table

| Option | Best fit | Strength | Risk | Governance gap | CREATE SOMETHING take |
| ------ | -------- | -------- | ---- | -------------- | --------------------- |
|        |          |          |      |                |                       |

## Common Mistakes

- Mistake 1:
- Mistake 2:
- Mistake 3:

## Recommended Implementation Path

1. Map the workflow and owner.
2. Classify allowed, approval-required, and blocked actions.
3. Pick the tool surface.
4. Add logging, approval, and recovery artifacts.
5. Pilot with one workflow before broad rollout.

## CTA

Primary CTA:
Secondary CTA:
CTA route:

## Analytics and Attribution

- `contentAssetId`:
- `contentCluster`:
- `contentIntent`:
- `contentBuyer`:
- `contentFunnelStage`:
- `contentPrimaryKeyword`:
- `contentPrimaryCta`:
- `utm_campaign`:
- Lead `source_detail`:

Add the live route to `packages/agency/src/lib/analytics/content-assets.ts`.

## Distribution Plan

- Newsletter dispatch:
- LinkedIn post 1:
- LinkedIn post 2:
- LinkedIn post 3:
- LinkedIn post 4:
- LinkedIn post 5:
- Demo or walkthrough:

## Source Notes

Use primary source URLs and current docs. Add checked dates.

- Source 1:
- Source 2:
- Source 3:
