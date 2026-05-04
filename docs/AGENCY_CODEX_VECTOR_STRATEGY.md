# Agency Codex Vector Strategy

> Date: February 16, 2026
> Scope: CREATE SOMETHING `.agency` packaging and delivery model
> Priority: Max differentiation

## Summary

The commercial default is now **Policy OS** (**Skills + MCP**), with **MCP-only** as a narrow entry wedge.

- MCP remains the chassis: trust boundaries, connectivity, policy artifacts.
- Outcomes are the product: execution quality, escalation policy, and continuous tuning.
- Codex is the primary setup and demo vector, while MCP contracts stay portable.
- Canonical phrasing for delivery vector is now **Skills on MCP**.
- Owner compensation requires fewer high-margin retainers, not many underpriced support lanes.

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

- Hard-to-copy elements lead all positioning: custom MCP creation, auth/security boundary design, policy artifacts, approval/escalation runbooks, and monthly tuning.

## Strategic decision

1. `MCP-only` is sold only for discovery/compliance use cases.
2. `Policy OS` is the default paid package:
   - Custom MCP server(s) for client systems.
   - Codex-ready agent setup and prompt/policy artifacts.
   - Managed judgment loop (approvals, escalation, monthly tuning).
   - `Workflow Infrastructure` is the implementation layer inside the package.
   - `Enterprise Extension` is the high-stakes expansion layer inside the package.
   - Owner-compensation-safe Core pricing should default to `$18k-$30k/month`, with `$22k/month` as the planning default for recurring governance ownership.
3. Supplier wrap pattern remains unchanged:
   - Commodity connectivity via `@create-something/composio-bridge`.
   - Deep-domain logic and intelligence layer are always custom.

## Offer architecture

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
- Client asks for measurable time savings or autonomous follow-through.
- Workflow needs escalation policy, approval gates, or quality controls.
- Client expects ongoing optimization.

Deliverables:
- Custom MCP endpoint(s)
- Client-facing vector: `Skills + MCP`
- Technical vector: `MCP + Skills`
- **Codex setup + policy + runbook included**
- Agent behavior contracts (allowed tools, guardrails, approvals)
- Golden task suite + regression checks
- Monthly tuning cadence
- Operator-load budget and expansion triggers

Pricing guardrails:

- Trial: `$12.5k-$15k/month`, `3-month minimum`
- Core: `$18k-$30k/month`, `6-month minimum` preferred
- Enterprise Extension: `$30k+/month`
- `$9.5k/month` is a strategic proof exception, not the default path to owner compensation

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
- `operator_load_budget`
- `gross_margin_floor`
- `owner_compensation_fit`

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
