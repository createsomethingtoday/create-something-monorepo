# Agency Codex Vector Strategy

> Date: February 16, 2026
> Updated: June 26, 2026 (Delegated Work Control hierarchy)
> Scope: CREATE SOMETHING `.agency` packaging and delivery model
> Priority: Max differentiation

## Summary

`.agency` sells the current service expression of **Delegated Work Control**:
making one workflow safe to delegate before agents, automations, contractors, or
internal operators touch customer trust, revenue, production, credentials, or
regulated decisions.

CREATE SOMETHING itself is the proof business for this claim: it is operated as
an agent-run-with-receipts company first, then that operating system is installed
for client workflows. See [AGENT_RUN_RECEIPT_CHARTER.md](./AGENT_RUN_RECEIPT_CHARTER.md).

The commercial default remains **Policy OS** (**Skills + MCP**), with
**MCP-only** as a narrow entry wedge.

- Delegated Work Control is the durable category: what can run, what waits, what
  stops, who owns the decision, and what evidence proves the work.
- The CREATE SOMETHING database layer is now the owned operating substrate:
  Cloudflare-native records, Atlas maps, source bindings, workflow actions,
  proof receipts, and API/MCP/agent access.
- Workflow Trust Layer is the current `.agency` service language for one
  workflow at a time.
- MCP remains the chassis: trust boundaries, connectivity, policy artifacts.
- Outcomes are the product: execution quality, escalation policy, and continuous tuning.
- Codex is the primary setup and demo vector, with Pi and Claude Code as co-equal delivery targets.
- MCP contracts and policy artifacts stay portable across all agent harnesses.
- Dify remains the preferred client/operator surface when visual workflow
  editing, app publishing, MCP server cards, or non-engineer inspection matter.
- Notion remains a workspace, review, capture, and distribution surface. It is
  not the canonical operating database once a workflow has been transferred
  into the CREATE SOMETHING database layer and audited as ready.
- OpenAI Agents SDK is a graduation lane for workflows that require code-owned
  orchestration, approval pauses, durable state, traces, evals, and CI-backed
  golden tasks.
- Canonical phrasing for delivery vector is now **Skills on MCP**.

## Delivery Vector Language System

Use context-specific ordering, not a single global phrase:

- `canonical_phrase`: **Skills on MCP**
- `client_facing_label`: **Skills + MCP**
- `technical_label`: **MCP + Skills**

Placement rules:

- Operator-facing headlines, subheads, sales pages, and outbound use `Skills + MCP`.
- Technical proof surfaces (architecture docs, security/compliance notes, and RFP responses) use `MCP + Skills`.
- Commercial packaging names are now canonicalized: `Policy OS` default, `MCP-only` exception.

Technical statement (must appear in technical proof surfaces):

- **MCP is the substrate for auth, trust boundaries, portability, and governance; Skills are the behavior layer.**

Context-bloat objection handling (approved line):

- **We scope tool access by bundle and workflow so only relevant capabilities enter context.**

Competitive moat emphasis:

- Hard-to-copy elements lead all positioning: workflow-boundary mapping, custom
  MCP creation, auth/security boundary design, policy artifacts,
  approval/escalation runbooks, receipt patterns, the custom database layer,
  and monthly tuning.
- The database-layer proof should be experienced, not only claimed: a public
  read-only demo should let a visitor filter safe records, select a row, inspect
  its Atlas binding, see the related action or receipt, and understand what an
  API/MCP/agent can do under policy.

## Delivery Targets

Policy OS ships to all major agent harnesses. Artifacts are portable by design:

| Target | Delivery Format | Distribution |
|--------|----------------|-------------|
| **Codex** | MCP servers + Codex tasks + policy artifacts | Primary demo vector |
| **Pi** | Pi packages (extensions + skills + prompts + themes) | `pi install npm:@create-something/pi-policy-os` |
| **Claude Code** | `.claude/` directory (rules + skills + commands + hooks) | Repository config |
| **Cursor** | MCP servers + `.cursorrules` | Repository config |
| **OpenAI Agents SDK** | SDK workflow service + MCP servers + traces/evals | Graduation lane for governed execution |

### Pi as Delivery Vector

Pi packages (`npm:@create-something/pi-*`) provide the richest extensibility:
- **Extensions**: Custom tools, quality gates, interactive commands, event handlers
- **Skills**: Domain knowledge loaded on demand
- **Prompts**: Workflow templates as slash commands
- **Themes**: Visual identity (Glass Design System)

Public packages serve as discovery wedges:
- `@create-something/pi-three-tier-framework` — Framework as installable agent knowledge
- `@create-something/pi-policy-os` — Governance starter with quality gates

Client-specific packages (`private: true`) deliver domain configuration:
- `@create-something/pi-halfdozen` — Half Dozen fleet knowledge and client management

See `packages/pi-three-tier-framework/`, `packages/pi-policy-os/`, `packages/pi-halfdozen/`.

## Strategic decision

1. `Delegated Work Control` is the long-term category, not a route name or
   entitlement enum.
2. `Workflow Trust Layer` is the current public service language for `.agency`.
3. `MCP-only` is sold only for discovery/compliance use cases.
4. `Policy OS` is the default paid package:
   - Custom MCP server(s) for client systems.
   - Codex-ready agent setup and prompt/policy artifacts.
   - Managed judgment loop (approvals, escalation, monthly tuning).
   - `Workflow Infrastructure` is the implementation layer inside the package.
   - `Enterprise Extension` is the high-stakes expansion layer inside the package.
5. Supplier wrap pattern remains unchanged:
   - Commodity connectivity via `@create-something/composio-bridge`.
   - Deep-domain logic and intelligence layer are always custom.
6. Runtime graduation is explicit:
   - Dify-first delivery remains valid for client-facing agent surfaces.
   - Agents SDK is introduced only when the Policy OS contract needs code-owned
     orchestration, tool routing, approval pauses, state, traces, evals, or
     repeatable cost controls.
   - The migration must not silently drop platform affordances such as visual
     review, publish/update flow, operator handoff, rollback, or team-compatible
     governance.

## Offer architecture

### Workflow Trust Layer (service language)

Use when:
- A buyer can name one workflow that is currently protected by human attention.
- The workflow crosses systems, teams, accounts, or permissions.
- The buyer needs a controlled delegation path before choosing agent tooling.

Deliverables:
- Workflow map
- Object and owner map
- Run/wait/stop action boundary
- Receipt plan
- First safe delegation recommendation

### MCP-only (entry wedge)

Use when:
- Client wants internal team to operate agents.
- Compliance allows only read or constrained actions.
- Scope is connectivity validation.

Deliverables:
- MCP endpoint(s)
- Auth setup
- Tool/resource/prompt inventory
- Basic runbook and ownership handoff

### Policy OS (default)

Use when:
- Client asks for measurable time savings or delegated follow-through.
- Workflow needs escalation policy, approval gates, or quality controls.
- Client expects ongoing optimization.

Deliverables:
- Custom MCP endpoint(s)
- Client-facing vector: `Skills + MCP`
- Technical vector: `MCP + Skills`
- **Codex setup + policy + runbook included**
- Agent behavior contracts (allowed tools, guardrails, approvals)
- Golden task suite + regression checks
- Runtime-surface decision and graduation status
- Monthly tuning cadence

## Standard client contracts

Every engagement ships three artifacts:

1. `mcp_contract.yaml`
- Tool schemas
- Resource URIs
- Prompt IDs
- Auth scopes
- Error model

2. `agent_contract.yaml`
- Allowed tools
- Approval mode
- Escalation triggers
- Budget and latency guardrails
- Model/client portability assumptions
- Runtime surface (`dify`, `cloudflare_service`, `openai_agents_sdk`, or
  equivalent client-specific lane)
- Graduation status (`prototype`, `dify_first`, `sdk_candidate`,
  `sdk_graduated`, `rollback_required`)
- `delivery_vector` metadata (`canonical_phrase`, `client_facing_label`, `technical_label`)

3. `outcome_contract.md`
- Target workflows
- Success metrics
- Fallback/manual path
- Ownership boundaries
- Review cadence
- Messaging orientation (`Skills + MCP` for operator-facing pages, `MCP + Skills` for technical proof)

Policy OS metadata must also include:

- `package_name`
- `approved_workflows`
- `approval_mode`
- `escalation_policy`
- `review_cadence`
- `billing_and_entitlement_assumptions`
- `runtime_surface`
- `graduation_status`

## Per-client handoff bundle

Required in every handoff:

- MCP endpoint(s) and environment bindings
- Auth setup and scope matrix
- Tool list, resource URI list, prompt set
- Approval policy and escalation policy
- Cost and latency guardrails
- Runbook for operations, incidents, and rollback
- Golden task definitions and latest pass/fail report

## 90-day implementation

### Weeks 1-2

- Align messaging and packaging across strategy docs and `.agency` copy.
- Publish this strategy and contract templates in `templates/`.

### Weeks 2-4

- Update `.agency` copy to position "first MCP" as start, not default package.
- Add explicit Codex deliverable language in service/product copy.
- Adopt `Skills + MCP` on operator-facing pages and maintain package naming.

### Weeks 4-8

- Standardize delivery playbook around the 3-contract system.
- Apply templates on all new engagements.

### Weeks 8-12

- Run 2-3 engagements with Policy OS default.
- Measure attach/conversion/time-to-outcome.
- Publish one case study comparing MCP-only vs bundled outcomes.
- Run a 14-day headline A/B test: `Skills + MCP` vs `MCP + Skills`.

## Test scenarios

1. Commodity integration
- Prompt: "Connect Slack + HubSpot and summarize daily changes."
- Expected package: Composio-wrapped MCP + lightweight agent layer + approval policy.

2. Deep workflow
- Prompt: "Detect schedule conflicts and auto-draft escalation."
- Expected package: custom MCP + custom agent policy + monthly tuning.

3. Compliance constrained
- Prompt: "Read-only assistant with all writes requiring approval."
- Expected package: MCP + strict approvals + escalation-only agent behaviors.

4. Portability
- Same workflow runs Codex-first while core MCP/policy artifacts remain portable.

## Acceptance criteria

- Bundle attach rate is materially above current MCP-only baseline.
- Time to first autonomous business outcome is <= 14 days from kickoff.
- Golden task success rate is >= 90% under defined approval policy.
- Handoff includes all contracts and runbook artifacts with no undocumented behavior.
- For operator traffic, `Skills + MCP` improves booked diagnostic calls per unique visitor without reducing technical trust.

## Validation Plan

14-day A/B test on operator-facing traffic:

- Variant A headline: `Skills + MCP`
- Variant B headline: `MCP + Skills`
- Primary KPI: booked diagnostic calls per unique visitor
- Secondary KPI: discovery-call clarity measured by "what is MCP?" interruptions in first 10 minutes
- Technical trust KPI: no decline in security/portability confidence in enterprise conversations
- Win condition: adopt `Skills + MCP` as front-door default if conversion improves and technical trust holds

## Defaults and assumptions

- Differentiation is prioritized over lowest delivery risk.
- Codex is the primary GTM vector.
- Architecture remains MCP-first and portable to avoid vendor lock-in.
