# Agency Ops PM and Agent Notion Review

> Status: implementation planning guide for CREATE SOMETHING Agency Ops.
> Reviewed: May 13, 2026.
> Linear: CRE-309.

## Purpose

CREATE SOMETHING is onboarding a PM to manage client timelines and workflows. This guide defines the target Notion operating model for PM + agent work, using the current Notion Workers, Syncs, Agent Tools, and CLI context.

The posture is conservative:

- Substrate remains the canonical Agency Ops state.
- Notion is the PM and operator-facing view layer.
- Linear remains the source of truth for tracked engineering work.
- Notion Worker Agent Tools should start as narrow read-only helpers, then add approved write actions.
- Notion Worker Syncs are useful for greenfield managed views, not for mutating existing client-owned schemas.

## Current Grounding

The repo already treats Notion as an Agency Ops view:

- `packages/halfdozen-notion-mcp/README.md` names Agency Ops as "Substrate Canonical, Notion View".
- `packages/halfdozen-notion-mcp/sync-agency-ops-to-substrate.mjs` imports current Notion Agency Ops records into Substrate.
- `packages/halfdozen-notion-mcp/sync-substrate-agency-ops-to-notion.mjs` mirrors Substrate state back into Notion and can ensure an `Agents` database.
- `docs/guides/NOTION_WORKERS_AND_CLI_2026.md` captures when to use CREATE SOMETHING MCPs, Notion Workers Agent Tools, Notion Workers Syncs, the hosted Notion MCP, and the `ntn` CLI.

Current synced Agency Ops objects include:

| Object              | Current role                                                   |
| ------------------- | -------------------------------------------------------------- |
| Clients             | Client account record and top-level operating container        |
| Engagements         | Client work packages, delivery phases, scope, and dependencies |
| MCP Services        | Service inventory tied to clients, repos, owners, and status   |
| Delivery Milestones | Due-date and deliverable tracking for engagements              |
| Agents              | Agent inventory, interfaces, routes, schedules, and services   |

The missing PM layer is not a replacement for those objects. It is a relationship and workflow layer that makes timelines, ownership, risks, evidence, and client updates explicit.

## Target System

### Database Layer

Use this relationship graph as the target Agency Ops model:

```text
Client
  -> Engagement
      -> Workstream
          -> Milestone
              -> Deliverable
                  -> Task / Action

Engagement
  -> Risks / Blockers
  -> Decisions
  -> Evidence / Artifacts
  -> Agents
  -> MCP Services
  -> Policies / Judgment Packs
```

Keep the existing canonical objects and add the PM-specific layer where it is missing:

| Database             | Purpose                                                                                 | Source of truth                                   |
| -------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Clients              | Account, operating status, priority, primary channel                                    | Substrate canonical                               |
| Engagements          | Contracted scope, phase, criticality, review cadence, dependency map                    | Substrate canonical with PM annotations           |
| Workstreams          | PM-friendly lanes inside an engagement, such as discovery, build, launch, or operations | Notion PM layer, optionally promoted to Substrate |
| Delivery Milestones  | Timeline checkpoints and promised outcomes                                              | Substrate canonical with PM annotations           |
| Deliverables         | Client-visible artifacts, deployments, docs, audits, or handoffs                        | Notion PM layer, optionally promoted to Substrate |
| Tasks / Actions      | PM and agent action queue, including non-engineering follow-ups                         | Notion PM layer, Linear for engineering work      |
| Risks / Blockers     | Open risks, client blockers, dependency issues, stale approvals                         | Notion PM layer, escalated items mirrored         |
| Decisions            | Client and internal decisions with rationale and status                                 | Notion PM layer, policy-impacting decisions saved |
| Evidence / Artifacts | Links to Linear, GitHub, deploys, docs, screenshots, logs, reports, and client updates  | Notion view, external systems canonical           |
| Agents               | Agent purpose, interface, trigger types, route, service links, and status               | Substrate canonical                               |
| MCP Services         | Service inventory and connectivity status                                               | Substrate canonical                               |
| Policies             | Approval rules, package entitlements, write boundaries, and escalation behavior         | Policy artifacts canonical                        |

### Automation Layer

Use automation to reduce PM coordination load, not to hide accountability.

| Automation                        | Recommended use                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| Existing Notion MCP syncs         | Keep Substrate and Notion Agency Ops views aligned.                                         |
| Notion Worker Agent Tools         | Give Notion Custom Agents narrow PM actions inside Notion.                                  |
| Notion Worker Syncs               | Create managed read-model databases for greenfield views, such as "Agency Ops Health".      |
| `ntn` CLI                         | Audit data-source IDs, Worker execution, API-version behavior, and one-off operator probes. |
| Linear wrappers                   | Create, claim, and close engineering work with evidence.                                    |
| GitHub/deploy/evidence collectors | Link execution evidence to deliverables and milestones.                                     |

### Judgment Layer

Treat agent behavior as policy, not as prompt prose hidden inside a tool.

| Judgment artifact     | Required role in Agency Ops                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| Approval matrix       | Defines which write actions an agent can draft, suggest, or execute.                           |
| Escalation policy     | Defines when a PM or principal must review risks, missed milestones, or client-facing updates. |
| Client package policy | Maps service tier entitlements to allowed agents, syncs, and support cadence.                  |
| Evidence policy       | Defines what proof is required before a milestone or deliverable can move to complete.         |
| Tool descriptions     | Encode operational boundaries for Notion Custom Agent tools.                                   |
| Tool hints            | Mark read-only tools with `readOnlyHint` and treat write tools as human-confirmed by default.  |

## Ownership Rules

Do not let every field become editable everywhere. Use explicit ownership:

| Field class        | Owner                         | Examples                                                                                      |
| ------------------ | ----------------------------- | --------------------------------------------------------------------------------------------- |
| Canonical fields   | Substrate sync                | `Substrate ID`, client relations, engagement relations, service IDs, agent IDs, source system |
| PM fields          | PM in Notion                  | owner, due date, phase, health, priority, next review, client summary, meeting notes          |
| Agent fields       | Agent tools with review       | suggested next action, stale flag, health summary, evidence gaps, last scan, draft update     |
| Engineering fields | Linear, GitHub, deploy system | issue ID, branch, PR, check result, deploy URL, rollback note                                 |
| Policy fields      | Policy artifacts              | approval mode, write boundary, escalation path, package entitlement, evidence requirement     |

Rules:

- Do not manually edit synced canonical fields in Notion.
- PM-owned fields may be edited directly in Notion.
- Agent-owned fields should be easy to inspect and overwrite by the PM.
- Engineering work must be created and closed in Linear, with evidence linked back into Notion.
- Client-facing summaries must remain drafts until reviewed by the PM or accountable owner.

## Recommended Notion Views

Create these as the PM onboarding cockpit:

| View                    | Database focus                    | Filter/sort intent                                              |
| ----------------------- | --------------------------------- | --------------------------------------------------------------- |
| PM Home                 | Engagements, tasks, risks         | Active clients, this week, blocked items, stale reviews         |
| This Week               | Tasks / Actions                   | due within 7 days, status not done, grouped by client and owner |
| Client Timelines        | Milestones and deliverables       | active engagements, timeline layout, grouped by client          |
| Engagement Health       | Engagements                       | active or paused, sorted by health, criticality, next review    |
| Risks / Blockers        | Risks / Blockers                  | status open, severity high first, grouped by client             |
| Evidence Needed         | Deliverables and milestones       | status review/complete with missing evidence                    |
| Agent Queue             | Agent suggested actions           | unreviewed suggestions, grouped by agent and client             |
| Client Update Drafting  | Engagements, milestones, evidence | active clients with changes since last update                   |
| Source of Truth Hygiene | Synced objects                    | missing `Substrate ID`, missing relations, stale sync timestamp |

## Status Standards

Use small, stable status vocabularies so PM views and agents do not drift.

| Object         | Recommended statuses                                                  |
| -------------- | --------------------------------------------------------------------- |
| Engagement     | lead, proposed, active, paused, wrap-up, complete, archived           |
| Phase          | discovery, design, build, verify, handoff, support                    |
| Health         | green, yellow, red, blocked                                           |
| Workstream     | planned, active, waiting, review, complete, paused                    |
| Milestone      | planned, in progress, at risk, blocked, delivered, accepted, canceled |
| Deliverable    | planned, drafting, building, review, delivered, accepted, archived    |
| Task / Action  | inbox, next, in progress, waiting, review, done, canceled             |
| Risk / Blocker | open, monitoring, escalated, resolved, accepted                       |
| Decision       | proposed, approved, rejected, superseded                              |
| Agent          | draft, active, paused, deprecated                                     |

## Agent Tools To Add First

Start with read-only Notion Worker tools for Custom Agents. This gives the PM useful in-Notion assistance without creating write-risk during onboarding.

| Tool key            | Mode      | Purpose                                                                                 |
| ------------------- | --------- | --------------------------------------------------------------------------------------- |
| `engagementBrief`   | read-only | Summarize one engagement from Substrate, Notion PM fields, current risks, and evidence. |
| `timelineHealth`    | read-only | Report late, stale, blocked, or missing-owner milestones and deliverables.              |
| `evidenceGaps`      | read-only | Find accepted or review-ready work without linked proof.                                |
| `serviceStatus`     | read-only | Summarize MCP services and agents tied to an engagement.                                |
| `policyBoundary`    | read-only | Explain which actions need PM, principal, or client approval.                           |
| `draftClientUpdate` | draft     | Generate a client update draft from milestones, risks, evidence, and decisions.         |
| `appendPMNote`      | write     | Append a reviewed PM note to an engagement or milestone.                                |
| `createActionDraft` | write     | Create a Notion action item that the PM can assign and schedule.                        |
| `createLinearIssue` | write     | Create tracked engineering work only after confirmation and with a source Notion link.  |
| `markReviewed`      | write     | Stamp a PM review timestamp and reviewer on a record.                                   |

Implementation guidance:

- Put read-only tools in `packages/notion-worker-experiments` before promotion.
- Use stable tool keys and structured output schemas.
- Add `readOnlyHint` to read-only tools.
- Make write tools narrowly scoped and reversible where possible.
- Include the source Notion page URL, `Substrate ID`, and Linear issue ID in write results.
- Do not expose broad tools that can update arbitrary database properties.

## PM Operating Workflows

### Daily PM Triage

1. Open PM Home.
2. Review blocked and at-risk engagements first.
3. Review This Week tasks and stale reviews.
4. Ask the Notion Custom Agent for `timelineHealth` on active clients.
5. Turn agent suggestions into PM-owned actions or Linear issues.
6. Add evidence links for completed work.

### Weekly Client Review

1. Open Client Timelines.
2. Review each active engagement by milestone, deliverable, risk, and evidence.
3. Run `engagementBrief` and `evidenceGaps`.
4. Draft the client update with `draftClientUpdate`.
5. PM reviews and edits the update before it is sent.
6. Mark the engagement reviewed and set the next review date.

### New Engagement Kickoff

1. Create or verify the Client and Engagement.
2. Select service tier and approval policy.
3. Create Workstreams and initial Milestones.
4. Attach relevant MCP Services and Agents.
5. Create first Deliverables and PM Tasks.
6. Confirm Linear project/issues only for engineering work.
7. Record the kickoff decision log and evidence expectations.

### Handoff or Closeout

1. Confirm accepted deliverables and linked evidence.
2. Resolve or accept open risks.
3. Archive paused agents or services no longer needed.
4. Record final client-facing summary.
5. Mark engagement complete only after evidence policy passes.

## Syncs and CLI Review Plan

Canonical CREATE SOMETHING Notion PAT location:

| Environment | Infisical path             | Key                               | Purpose                                     |
| ----------- | -------------------------- | --------------------------------- | ------------------------------------------- |
| `prod`      | `/notion/create-something` | `NOTION_CREATE_SOMETHING_API_KEY` | CREATE SOMETHING Notion workspace inventory |

Do not add new automation against the legacy root `createsomething_instance`
key. Keep any legacy aliases only long enough to avoid breaking existing local
or runtime references.

### Live Rollout

On May 13, 2026, CRE-311 created the first live CREATE SOMETHING PM/agent
Notion layer in the CREATE SOMETHING workspace:

- Added data sources: `Agents`, `Workstreams`, `Deliverables`,
  `Tasks / Actions`, `Risks / Blockers`, `Decisions`, and
  `Evidence / Artifacts`.
- Patched existing data sources with PM relations and review fields:
  `Clients`, `Engagements`, `MCP Services`, `Delivery Milestones`,
  `Meetings MCP Transcripts`, and `Operator Events`.
- Added operating views including `This Week`, `Agent Queue`, `Open Risks`,
  `Evidence Needed`, `Client Timelines`, `Engagement Health`,
  `Client Update Drafting`, `Source of Truth Hygiene`, `Service Reviews`,
  `Active Workstreams`, `Evidence Index`, `Draft Agents`, and `Decision Log`.
- Seeded one PM onboarding workstream, one decision, one evidence record,
  four risks, eight PM action items, and five draft agent inventory rows.

CRE-312 then backfilled the PM layer from existing Notion data:

- Created PM workstreams for the six active engagements with existing
  engagement/client relations.
- Linked all existing Delivery Milestones to inferred Clients, Engagements,
  Workstreams, and Deliverables.
- Created Deliverables from the seven existing Delivery Milestones plus three
  scope-derived active engagement deliverables for active engagements that did
  not yet have milestone rows.
- Populated reverse relationship fields on Clients, Engagements, Workstreams,
  MCP Services, Agents, Tasks / Actions, Risks / Blockers, and Evidence.
- Updated Grant Foust from Active to Prospect using the available iMessage
  context, and retained a low-severity PM follow-up action plus monitoring risk
  instead of creating an unconfirmed Engagement.

Use the `ntn` CLI for the PM system audit:

```bash
ntn login
ntn doctor
ntn api v1/search filter:='{"property":"object","value":"data_source"}' page_size:=25
ntn datasources resolve <database-or-url>
ntn datasources query <data-source-id> --limit 10 --notion-version 2026-03-11
```

Audit checklist:

- Inventory current Agency Ops databases and data-source IDs.
- Verify every synced database has `Substrate ID`.
- Verify relationships among Clients, Engagements, MCP Services, Delivery Milestones, and Agents.
- Identify whether Workstreams, Deliverables, Tasks, Risks, Decisions, and Evidence exist already or need to be added.
- Document which fields are Substrate-owned, PM-owned, agent-owned, engineering-owned, or policy-owned.
- Normalize status names before adding agents that depend on statuses.
- Add views before adding write tools.
- Run read-only tools for one week before enabling write tools.

Use Notion Worker Syncs only for managed read models at first:

- "Agency Ops Health" from Substrate plus Notion PM annotations.
- "Agent Activity" from agent logs, routes, and review timestamps.
- "Evidence Index" from Linear, GitHub, deploy logs, and docs.

Do not use Worker Syncs to replace the current Substrate-to-Notion sync path until the managed-database behavior fits the target schema.

## Five-Day PM Onboarding Prep

| Day | Outcome                                                                 |
| --- | ----------------------------------------------------------------------- |
| 1   | Inventory current Notion Agency Ops databases, views, fields, and IDs.  |
| 2   | Add missing PM layer databases or properties in a staging workspace.    |
| 3   | Create PM Home, This Week, Client Timelines, Risks, and Evidence views. |
| 4   | Wire read-only agent tools for engagement briefs and timeline health.   |
| 5   | Run a tabletop review on two active clients and document adjustments.   |

## Linear Evidence Template

Use this shape when closing PM/agent Notion work:

```text
Scope: <Notion system, client, or Agency Ops surface>
Issue: CRE-<id>
Databases/views touched: <list>
Agent tools touched: <list or none>
Validation: <commands, read-only CLI probes, screenshots, tabletop results>
Evidence: <Notion pages, Linear issues, GitHub PRs, deploy URLs, screenshots>
Rollback: <how to disable views/tools/syncs or restore previous state>
```

## Immediate Recommendations

1. Keep Substrate canonical and make the PM layer explicit in Notion.
2. Add Workstreams, Deliverables, Tasks, Risks, Decisions, and Evidence if they are missing from the current Agency Ops workspace.
3. Use Notion views as the PM onboarding surface before adding agent writes.
4. Promote `engagementBrief`, `timelineHealth`, and `evidenceGaps` as the first Custom Agent tools.
5. Treat `draftClientUpdate` as draft-only until approval behavior is encoded as a policy artifact.
6. Use `ntn` for audits and Worker tests, not as runtime infrastructure.

## Source Docs

- Notion platform overview: https://developers.notion.com/guides/get-started/overview
- Notion Workers overview: https://developers.notion.com/workers/get-started/overview
- Notion Worker Syncs: https://developers.notion.com/workers/guides/syncs
- Notion Worker Agent Tools: https://developers.notion.com/workers/guides/tools
- Notion CLI overview: https://developers.notion.com/cli/get-started/overview
- CREATE SOMETHING Notion Workers guide: ./NOTION_WORKERS_AND_CLI_2026.md
- CREATE SOMETHING Notion API audit guide: ./NOTION_API_COMPATIBILITY_AUDIT_2026.md
