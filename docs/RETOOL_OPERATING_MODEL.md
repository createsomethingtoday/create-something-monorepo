# Retool Operating Model

> Status: canonical operating model for CREATE SOMETHING operations.
> Date: 2026-05-08

Retool is the operating surface for CREATE SOMETHING. It is not the durable
source of truth.

The durable source of truth remains the monorepo: code, contracts, manifests,
MCP servers, agent definitions, schemas, prompts, policy artifacts, deployment
scripts, runbooks, and delivery evidence.

## Operating Thesis

CREATE SOMETHING builds governed workflow consoles.

The work is not "AI consulting", "Retool development", "MCP development", or
"chatbot building". Those are ingredients.

The productized service is:

> Turn messy operational workflows into governed systems people can operate
> without watching every step by hand.

Retool is the console layer that makes that promise visible and usable.

## Tool Roles

| Layer | Tool | Role |
| --- | --- | --- |
| Source of truth | Monorepo | Contracts, code, manifests, policies, MCPs, agents, runbooks |
| Execution ledger | Linear | Build work, bugs, implementation tasks, agent-ready queues |
| Review gate | GitHub | PR review, CI, release history, deploy evidence |
| Build lane | Codex / Emdash | Agentic implementation, code review, PR preparation |
| Control plane | Retool | Operator cockpit, approvals, dashboards, client workflow consoles |
| Tool/data interface | MCP servers | Governed access to repo, apps, APIs, databases, and workflows |
| AI skill server | Dify | Bounded AI workflows, RAG, structured drafting, MCP-packaged skills |
| Operator companion | Moltworker / RELAY | Preferred internal chief-of-staff assistant runtime on Cloudflare; TrustClaw is parked as a Vercel exception path |
| Calm decision surface | Core Ink | Untethered e-ink brief, offline Decision Garden, and compact operator signals |
| Runtime workers | Workers, cron jobs, custom services | Durable automation and action execution |

## Database / Automation / Judgment Mapping

| Tier | CREATE SOMETHING implementation |
| --- | --- |
| Database | Monorepo manifests, external databases, MCP registries, Retool-visible state, delivery artifacts |
| Automation | MCP servers, workers, cron jobs, Codex/Emdash tasks, Dify skills, Moltworker/RELAY actions |
| Judgment | Retool approvals, policy artifacts, decision states, human review, blocked-action rules |

Debug in this order:

1. Database: is the data, manifest, contract, or artifact correct?
2. Automation: did the MCP, worker, agent, cron, or sync path execute?
3. Judgment: was the right approval, policy, or blocked state applied?

## Retool Responsibilities

Retool should answer one question:

> What deserves Micah's attention now?

Retool owns operational visibility and control:

- Operator Today dashboard
- cross-workstream status
- decision queues
- approval queues
- client-visible update queues
- workflow health
- MCP registry surfaces
- agent registry surfaces
- incident and risk views
- client workflow consoles
- handoff views
- pause, retry, route, approve, reject, and escalate actions

Retool should not own:

- source code
- policy rules
- production business data as the only copy
- secrets
- client delivery artifacts as the only copy
- durable workflow contracts
- final implementation logic

If a feature cannot be rebuilt from repo contracts, MCP servers, external data,
and runbooks without manually reading Retool state, it is too locked in.

## Core Ink Responsibilities

Core Ink is the calm, untethered decision surface for CREATE SOMETHING.

It should answer a smaller question than Retool:

> What is worth carrying away from the computer?

Core Ink owns:

- current operator brief
- MCP/agent health review request
- daily rhythm and clock
- local quiet settings
- offline Decision Garden state
- compact check-ins from away from the laptop
- low-risk attention signals that can be imported later

Core Ink should not own:

- source of truth
- full project management
- long-form writing
- raw client data
- raw secrets
- production mutations
- final approvals
- client-facing publication

Core Ink is reliable when it behaves like a physical briefing and decision
marker. It is unreliable when treated like a tiny dashboard, phone, laptop, or
general-purpose planner.

The preferred untethered loop is:

```text
Retool / bridge prepares a compact brief
  -> Core Ink syncs when Wi-Fi is available
  -> operator steps away from the computer
  -> Decision Garden captures slow signals offline
  -> Check In posts compact operator state
  -> Retool turns it into a review packet
  -> ChatGPT Apps or agents expand it only after approval
  -> monorepo/config changes land through normal review
```

Use Core Ink for:

- decision incubation over days or months
- Database / Automation / Judgment sorting
- marking `now`, `next`, `later`, `blocked`, or `needs desktop review`
- acknowledging that the business has a signal without forcing immediate action

Do not use Core Ink for:

- detailed editing
- dense lists
- rapid updates
- final deploy decisions
- permission changes
- employment, staffing, legal, or financial decisions

## First Retool App

Build the first app as `Operator Today`.

Pages:

- Today
- Workstreams
- Agent Queue
- MCP Registry
- Workflow Console Template

Core sections:

- Needs Micah
- Ready for Agent
- Waiting for Review
- Blocked
- Client Update Due
- Workflow Health
- Capture

Allowed mobile actions:

- approve direction
- reject direction
- defer
- mark needs desktop review
- send to Codex
- create Linear issue
- mark client-visible
- pause workflow
- retry safe job
- capture note

Avoid making mobile the place for final merges, permission changes, sensitive
data inspection, production data edits, or serious deployment decisions.

## First Retool Workflows

Create these before adding client portals:

1. Linear Sync
   - Pull Linear issues into an operator-facing table.
   - Normalize status, labels, project, owner, due date, and source URL.
   - Surface only operational meaning by default, not every raw issue.

2. GitHub Review Queue
   - Pull PRs, checks, linked issues, and review status.
   - Classify as needs review, tests failing, needs desktop review, or safe
     low-risk action.

3. Client Update Draft Queue
   - Gather client-visible issues, artifacts, decisions, blockers, and risks.
   - Call a Dify skill or custom worker to draft the update.
   - Hold the update in Retool for human approval before sending or publishing.

## Linear Labels For Retool

Use labels to decide what Retool surfaces:

- `retool-sync`
- `decision-needed`
- `client-visible`
- `blocked`
- `blocked-by-client`
- `blocked-by-micah`
- `codex-ready`
- `agent-ready`
- `needs-review`
- `risk`
- `scope-change`
- `artifact-ready`
- `handoff`
- `do-not-agent`
- `security-sensitive`
- `client-data-sensitive`

Clients should not see raw Linear by default. Retool translates internal build
state into client-safe delivery state.

## Dify's Role

Dify is not the CREATE SOMETHING operating center.

Dify is a specialist AI skill server for bounded tasks:

- client update drafting
- workflow map extraction
- decision-state classification
- Create Something knowledge/RAG answering
- staffing match explanation drafting
- artifact draft generation

Preferred pattern:

```text
Retool button or workflow
  -> Dify API or Dify MCP tool
  -> structured AI output
  -> Retool approval screen
  -> Linear/GitHub/client portal update only after approval
```

Use Dify when the job is:

> Given this context, produce structured AI output.

Use Retool when the job is:

> Show this to a human, route a decision, control the workflow, log the action,
> or expose it to a client.

## Operator Companion Runtime

The operator companion is the internal chief-of-staff assistant, not the CEO and
not the client workflow console.

Preferred runtime: **Moltworker / RELAY**.

Upstream: [cloudflare/moltworker](https://github.com/cloudflare/moltworker).

Runbook: `docs/guides/MOLTWORKER_OPERATOR_COMPANION.md`.

Repo package: `packages/relay`.

Preflight: `pnpm moltworker:preflight`.

Moltworker runs OpenClaw on Cloudflare Workers with an entrypoint Worker,
Sandbox SDK / Containers, R2 persistence, Cloudflare Access, AI Gateway, and
optional Browser Rendering and chat channels. It is a better fit than the
Vercel-first TrustClaw path for CREATE SOMETHING infrastructure because it keeps
the operator companion on the same Cloudflare platform used for Workers, MCPs,
cron, durable workflows, Access policies, and observability.

Use Moltworker / RELAY as a chief-of-staff assistant for:

- daily operator briefs
- cross-app summaries
- Linear issue creation
- GitHub and PR summaries
- client update drafts
- calendar/context prep
- admin follow-up
- Retool record updates
- low-risk scheduled checks

Moltworker can act across tools the operator already has access to, but Retool
governs what becomes visible, approved, or client-facing.

Moltworker-specific posture:

- deploy in a CREATE SOMETHING-controlled Cloudflare account
- protect admin and operator surfaces with Cloudflare Access
- require gateway token and device-pairing style controls where available
- persist agent state through R2, not local-only container files
- route model calls through AI Gateway when possible for cost and request
  visibility
- keep durable prompts, policies, runbooks, skills, and workflow boundaries in
  the monorepo
- keep Retool as the approval, pause, retry, revocation, and client-visibility
  surface
- treat Moltworker as a proof-of-concept candidate until security, cost, cold
  start, persistence, Composio tool calls, and chat-channel smoke tests pass

### Composio With Moltworker

Yes: Composio can still be used with Moltworker.

Use Composio as hidden integration plumbing for commodity OAuth and SaaS tools,
not as the client-facing product surface. The preferred patterns are:

1. **CREATE SOMETHING MCP wrapper**
   - Worker or MCP server calls `@create-something/composio-bridge`.
   - Retool shows allowed tools, approvals, connected-account status, and
     revocation paths.
   - Moltworker invokes the CREATE SOMETHING tool, not raw Composio branding.

2. **OpenClaw skill wrapper inside the sandbox**
   - A RELAY skill calls a narrow CREATE SOMETHING endpoint that executes a
     Composio-backed action.
   - The skill receives only the action-specific input and output it needs.
   - Risky actions return an approval packet to Retool instead of executing.

3. **Direct Composio execution for internal-only low-risk work**
   - Acceptable for private operator tasks such as summaries, draft task
     creation, and scheduled checks.
   - Not acceptable as the default client delivery surface.

Composio-specific rules:

- secrets stay in Wrangler/Cloudflare secrets, Infisical, or the relevant
  server-side runtime; never in repo files
- no raw client app keys are handed to the agent
- connected accounts must be revocable and visible in Retool
- external messages, production mutations, permission changes, deployments, and
  client-facing publications require Retool approval
- direct Composio-hosted MCP URLs are exception paths, not the default product
  surface

### TrustClaw Parked Path

Upstream: [ComposioHQ/trustclaw](https://github.com/ComposioHQ/trustclaw).

TrustClaw remains useful as a reference for Composio-backed personal-agent
patterns, but it is parked as a Vercel exception path because its upstream
deployment is Vercel-first and adds a separate billing/runtime surface.

Do not deploy TrustClaw unless:

- Moltworker / RELAY fails evaluation
- a Vercel-specific capability is required
- a client explicitly needs TrustClaw upstream behavior
- the Cloudflare-native path is blocked

If TrustClaw is revisited, use
`docs/guides/TRUSTCLAW_VERCEL_DEPLOYMENT.md` before creating Vercel or
Marketplace resources.

Authority levels:

| Level | Authority | Examples |
| --- | --- | --- |
| 1 | Read and summarize | briefs, status summaries, link lookup |
| 2 | Create drafts and tasks | Linear issues, email drafts, Retool draft records |
| 3 | Low-risk internal actions | status updates, internal notes, safe checks |
| 4 | Approval required | client messages, workflow retries, deployments, permission changes |
| 5 | Blocked | delete records, change secrets, make hiring decisions, publish proof |

Client-facing operator-companion access should be an optional add-on, not a
default giveaway. Package it only after the internal Moltworker / RELAY path is
validated and only when the workflow needs broad cross-app assistance with
Retool approvals, audit, pause, and revocation paths.

## Client Delivery Model

Default offer ladder:

1. Workflow Readiness Map
   - current workflow
   - data and system boundary
   - decision states
   - risks
   - safe first wedge
   - build/no-build recommendation

2. Governed Workflow Console
   - Retool app/workflow console
   - MCP/tool layer
   - worker or automation path
   - approval queue
   - runbook and handoff artifacts

3. Agent Operator Layer
   - Dify skills, Moltworker / RELAY, custom workers, or LangGraph-like runtimes where
     useful
   - routed through Retool approval and audit surfaces

4. Monthly Governance Review
   - health review
   - risk review
   - audit review
   - approval-rule tuning
   - small scoped improvements

Retool should be the client-visible portal for governed workflow-console work.
Moltworker / RELAY may act underneath after validation. Dify may draft
underneath. MCPs and workers execute underneath. The client sees the approved
operating surface.

## Staffing / Matching Wedge

The first repeatable vertical pattern is governed matching infrastructure.

For nurse staffing and similar businesses:

```text
Demand data
  -> jobs, shifts, role requirements, source, urgency

Supply data
  -> nurses/candidates, credentials, availability, preferences, geography

MCP/tool layer
  -> controlled access to demand, supply, rules, and workflow actions

Agent/skill layer
  -> match explanations, missing-info flags, outreach drafts

Retool workflow console
  -> recruiter review, approvals, audit, status, handoff
```

Position as decision support:

- recommend matches
- explain fit
- flag missing information
- route recruiter review

Do not position as autonomous hiring, placement, rejection, or employment
decision-making.

## Daily Operator Loop

1. Open Retool.
   - Check Needs Micah, Ready for Agent, Waiting for Review, Blocked, Client
     Update Due, Workflow Health.

2. Dispatch work.
   - Send scoped tasks to Codex/Emdash.
   - Create or update Linear issues.

3. Build in coding environments.
   - MCPs, workers, cron jobs, agents, Retool specs, and tests live in the
     monorepo.

4. Review in GitHub.
   - Diffs, CI, review comments, merge decisions, release notes.

5. Operate in Retool.
   - Approve, reject, pause, retry, escalate, publish client-safe updates.

6. Let Moltworker / RELAY prepare, not decide.
   - RELAY briefs, drafts, routes, and creates low-risk records.
   - Human approval remains the trust boundary.

## Implementation Rule

If it is durable logic, put it in the monorepo.

If it is operational control, put it in Retool.

If it is structured AI output, package it through Dify or a custom worker.

If it is cross-app internal assistance, let Moltworker / RELAY prepare it.

If it is client judgment, route it through Retool approval.

If it is engineering work, track it in Linear and review it in GitHub.
