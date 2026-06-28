# Agency Workflow-Intent Article Engine

> Owner: CREATE SOMETHING
> Status: ready for execution
> Tracker: CRE-444
> Public surface: `createsomething.agency`
> Analytics hook: `packages/agency/src/lib/analytics/content-assets.ts`
> Tracker template: `docs/examples/agency-workflow-intent-article-tracker.template.csv`
> Article brief template: `packages/agency/content/templates/marketing/workflow-intent-article-brief.md`
> Image workflow: `docs/guides/AGENCY_ARTICLE_IMAGE_WORKFLOW.md`

## Decision

Build a repeatable workflow-intent article engine for CREATE SOMETHING instead of
publishing one-off thought leadership.

The content lane should convert readers who are already comparing tools,
workflow patterns, implementation partners, and governance approaches. The
durable point of view is:

> Most AI automation fails because it lacks operating rules: approvals, blocked
> actions, audit trails, owner responsibilities, and recovery paths.

The article system should shift teams from "which tool should we choose?" to "what
governed workflow system should we operate?"

## Positioning Spine

Do not differentiate on features that platforms will absorb:

- token tracking
- basic observability
- simple connectors
- simple agents
- generic automation setup

Differentiate on operating design:

- cross-platform governance
- workflow liability mapping
- agent operating manuals
- vendor-neutral architecture
- implementation judgment
- repeatable vertical workflow templates

The core offer language:

> CREATE SOMETHING builds AI operating systems for businesses: workflows,
> policies, approvals, and recovery across the tools they already use.

## Workflow-Intent Formats

Use these formats before general essays:

| Format                                           | Search Intent | Default CTA                    |
| ------------------------------------------------ | ------------- | ------------------------------ |
| `Best [Category] for [Team / Use Case] in 2026` | compare       | Request workflow teardown      |
| `[Tool] vs [Tool] vs [Tool]`                     | versus        | Request workflow teardown      |
| `How to build [governed workflow]`               | how-to        | Request workflow teardown      |
| `[Risk / governance] checklist`                  | checklist     | Get governance checklist       |
| `What is [category] for [team]?`                | definition    | Open implementation path       |

## Core Article Template

Every flagship article should include:

1. Quick answer or shortlist.
2. Who this guide is for.
3. Evaluation criteria.
4. Comparison table or decision table.
5. Individual tool, service, or workflow breakdowns.
6. Best fit by use case.
7. Common mistakes.
8. Recommended implementation path.
9. CTA ladder: checklist for cold readers, teardown for warm readers, mapping
   session for high-intent teams.
10. Source notes and last-updated date.

The internal point of view must be visible by the first third of the article.
Avoid neutral comparison sludge.

## Image System

Use `docs/guides/AGENCY_ARTICLE_IMAGE_WORKFLOW.md` for the full operating
workflow.

The short rule:

- Create original strategic visuals for the CREATE SOMETHING point of view.
- Collect screenshots only when they provide product evidence.
- Avoid generic stock AI imagery.

For flagship comparison articles, plan:

- one original hero graphic
- one comparison matrix
- two to four relevant tool screenshots
- one CREATE SOMETHING framework diagram
- one CTA or checklist graphic when useful

Screenshots should prove the team actually reviewed the tool: workflow builder
UI, approval settings, audit logs, observability surfaces, integration setup, or
human-in-the-loop controls. Do not use vendor homepage screenshots as filler.

Every screenshot needs a capture date, rights note, refresh due date, alt text,
and a source or review workspace note. Stale screenshots reduce trust, so tool
comparison screenshots should be refreshed every 60 days or replaced with an
original diagram.

## Funnel Ladder

Do not make "book a session" the only conversion path for cold article traffic.

Use three CTAs:

| Stage | Reader State | CTA | Destination |
| ----- | ------------ | --- | ----------- |
| Cold | Learning language for risk, approvals, and governance | `Get Governance Checklist` | `/contact?intent=governance-checklist` |
| Warm | Can name a workflow, stack, and bottleneck | `Request Workflow Teardown` | `/contact?intent=workflow-teardown` |
| Hot | Has owner, timeline, approval authority, and decision pressure | `Book Mapping Session` | `/book?intent=workflow-mapping` |

Whitepapers should be short operating artifacts, not generic PDFs. Prefer
checklists, teardown templates, approval-path worksheets, and field guides that
make the team's workflow easier to describe.

## First 90-Day Content Sprint

Cadence:

- 1 flagship article per week.
- 2 supporting posts per week.
- 5 LinkedIn posts from each flagship.
- 1 short demo or walkthrough per flagship.

Expected 90-day output:

- 12 flagship SEO assets.
- 24 supporting posts.
- 60 LinkedIn posts.
- 12 short demos or walkthroughs.

### Flagship Queue

| Week | Content Asset ID                                                    | Working Title                                                        | Intent     | Audience              | Funnel Stage  | Primary CTA                         |
| ---: | ------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------- | ---------------------- | ------------- | ----------------------------------- |
|    1 | `article.best-ai-workflow-automation-platforms-agencies.v20260601`  | Best AI Workflow Automation Platforms for Agencies in 2026           | compare    | agency owner           | consideration | Request Workflow Teardown           |
|    2 | `article.dify-vs-langflow-vs-flowise-vs-vellum.v20260608`           | Dify vs Langflow vs Flowise vs Vellum: Which Should You Use?         | versus     | technical operator     | decision      | Request Workflow Teardown           |
|    3 | `article.human-approval-ai-workflow.v20260615`                      | How to Build an AI Workflow With Human Approval Steps                | how-to     | ops lead               | decision      | Request Workflow Teardown           |
|    4 | `article.ai-automation-agency-vs-workflow-consultant.v20260622`     | AI Automation Agency vs AI Workflow Consultant                       | compare    | founder                | consideration | Request Workflow Teardown           |
|    5 | `article.governed-ai-workflows-notion-slack-hubspot.v20260629`      | How to Build Governed AI Workflows Across Notion, Slack, and HubSpot | how-to     | RevOps lead            | decision      | Request Workflow Teardown           |
|    6 | `article.best-mcp-tools-business-workflow-automation.v20260706`     | Best MCP Tools for Business Workflow Automation                      | compare    | builder                | consideration | Request Workflow Teardown           |
|    7 | `article.approvals-audit-trails-ai-agents.v20260713`                | How to Add Approvals and Audit Trails to AI Agents                   | how-to     | operator               | decision      | Request Workflow Teardown           |
|    8 | `article.ai-workflow-governance-checklist-small-business.v20260720` | AI Workflow Governance Checklist for Small Businesses                | checklist  | founder                | awareness     | Get Governance Checklist            |
|    9 | `article.no-code-ai-automation-tools-client-onboarding.v20260727`   | Best No-Code AI Automation Tools for Client Onboarding               | compare    | agency owner           | consideration | Request Workflow Teardown           |
|   10 | `article.ai-operating-system-service-business.v20260803`            | What Is an AI Operating System for a Service Business?               | definition | service business owner | awareness     | Open Implementation Path            |
|   11 | `article.sales-follow-up-ai-agent-governance.v20260810`             | How to Govern AI Sales Follow-Up Across Gmail, CRM, and Slack        | how-to     | sales lead             | decision      | Request Workflow Teardown           |
|   12 | `article.support-escalation-ai-agent-operating-manual.v20260817`    | AI Support Escalation Agent Operating Manual                         | checklist  | support lead           | decision      | Request Workflow Teardown           |

## Operating Workflow

Use the guide at `docs/guides/AGENCY_WORKFLOW_INTENT_ARTICLE_WORKFLOW.md`.

The short version:

1. Pick one flagship row from the tracker.
2. Create a Linear issue or attach the work to the active article issue.
3. Fill the article brief template.
4. Create the visual plan: original diagrams, screenshot targets, and rights
   status.
5. Research with primary sources and current product docs.
6. Write the comparison or workflow draft.
7. Add the CREATE SOMETHING operating-design point of view.
8. Capture, redact, annotate, and document screenshots when needed.
9. Publish on the custom domain first.
10. Add content asset metadata to analytics when the route is live.
11. Distribute through LinkedIn, newsletter, and demos with UTM fields.
12. Review analytics, screenshots, and article freshness every 60-90 days.

## Analytics Connection

Article tracking must connect to the existing agency analytics pipeline instead
of a standalone spreadsheet.

Current implementation:

- `packages/agency/src/routes/+layout.svelte` passes route-level metadata into
  the shared `Analytics` component.
- `packages/agency/src/lib/analytics/content-assets.ts` maps known article,
  guide, partner, service, and conversion paths to `contentAssetId`, audience,
  intent, funnel stage, CTA, and primary keyword.
- The shared analytics client merges that metadata into every emitted event on
  the page.
- Authenticated users are tied through `userId`.
- Anonymous readers are tied through `sessionId` until a form, login, booking,
  or lead record identifies them.

Do not store raw PII in analytics event metadata. Put PII in the lead, booking,
or account record and connect it through `userId`, `sessionId`, `campaign`, and
source details.

### Required Metadata

Every live article route should have:

| Field                   | Purpose                                                                       |
| ----------------------- | ----------------------------------------------------------------------------- |
| `contentAssetId`        | Stable join key across analytics, tracker, Linear, and content docs.          |
| `contentCluster`        | Groups related articles, for example `ai-workflow-platform-comparisons`.      |
| `contentIntent`         | `compare`, `versus`, `how-to`, `checklist`, `definition`, or `partner-proof`. |
| `contentAudience`          | The reader or team segment the article is written for.                                |
| `contentFunnelStage`    | Awareness, consideration, or decision.                                        |
| `contentPrimaryKeyword` | Main search target.                                                           |
| `contentPrimaryCta`     | Main conversion action.                                                       |
| `contentLinearIssue`    | Optional Linear issue for traceability.                                       |
| `visualPlanStatus`      | Planned, captured, annotated, published, or refresh-needed.                   |
| `imageRightsStatus`     | Pending, cleared, original-owned, or replace-before-publish.                  |

### UTM Convention

Use one campaign string per flagship article:

```text
utm_source=linkedin|newsletter|youtube|direct
utm_medium=social|email|video|partner
utm_campaign=<contentAssetId without dots if the channel rejects dots>
utm_content=<post-or-demo-id>
```

Example:

```text
utm_campaign=article-best-ai-workflow-automation-platforms-agencies-v20260601
```

### Lead Connection

When a reader becomes a lead:

- `Lead.source = website`
- `Lead.source_detail = <canonical path or contentAssetId>`
- `Lead.campaign = <utm_campaign or contentAssetId>`
- `Lead.service_interest = governed workflow system, Dify lane, Notion lane, etc.`
- `Lead.estimated_value` and `Lead.actual_value` carry revenue influence.

This lets content performance be reviewed by:

- sessions and page views from `unified_events`
- identified users from `unified_events.user_id`
- CTA clicks and form events from `unified_events`
- lead records from the funnel model
- revenue influence from `Lead.estimated_value` and `Lead.actual_value`

## Weekly Review

Every Friday, update the tracker row with:

- Google Search Console clicks and average position.
- Analytics sessions and identified users.
- CTA clicks, form starts, bookings, and leads.
- Revenue influenced.
- What changed in ranking, conversion, or workflow signal.
- Whether the article needs an update.
- Canvas plan status, graph source, and renderer for workflow, governance, and
  agent-behavior visuals.
- Screenshot refresh status and image rights status.

## Rules

- Publish canonical content on the custom domain first.
- Use primary vendor docs for product claims.
- Do not claim official partner status before approval.
- Do not use affiliate links without disclosure.
- Keep comparison pieces fair but opinionated.
- Update product comparison articles when vendor features change.
- Refresh or replace screenshots when the tool UI changes.
- Use an Atlas-style canvas before one-off graphics when the article explains
  workflow behavior, governance, case studies, offers, tool comparisons, or
  agent behavior.
- Use screenshots as evidence, not decoration.
- Redact secrets, client data, private prompts, and account identifiers.
- Do not publish article routes without analytics metadata and a tracker row.
