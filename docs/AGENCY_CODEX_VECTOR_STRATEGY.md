# Agency Codex Vector Strategy

> Date: February 16, 2026
> Scope: CREATE SOMETHING `.agency` packaging and delivery model
> Priority: Max differentiation

## Summary

The commercial default is now **Agent Outcome Stack** (agents + MCPs), with **MCP-only** as a narrow entry wedge.

- MCP remains the chassis: trust boundaries, connectivity, policy artifacts.
- Outcomes are the product: execution quality, escalation policy, and continuous tuning.
- Codex is the primary setup and demo vector, while MCP contracts stay portable.

## Strategic decision

1. `MCP-only` is sold only for discovery/compliance use cases.
2. `Agent Outcome Stack` is the default paid package:
   - Custom MCP server(s) for client systems.
   - Codex-ready agent setup and prompt/policy artifacts.
   - Managed judgment loop (approvals, escalation, monthly tuning).
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

### Agent Outcome Stack (default)

Use when:
- Client asks for measurable time savings or autonomous follow-through.
- Workflow needs escalation policy, approval gates, or quality controls.
- Client expects ongoing optimization.

Deliverables:
- Custom MCP endpoint(s)
- **Codex setup + policy + runbook included**
- Agent behavior contracts (allowed tools, guardrails, approvals)
- Golden task suite + regression checks
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

3. `outcome_contract.md`
- Target workflows
- Success metrics
- Fallback/manual path
- Ownership boundaries
- Review cadence

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

### Weeks 4-8

- Standardize delivery playbook around the 3-contract system.
- Apply templates on all new engagements.

### Weeks 8-12

- Run 2-3 engagements with Agent Outcome Stack default.
- Measure attach/conversion/time-to-outcome.
- Publish one case study comparing MCP-only vs bundled outcomes.

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

## Defaults and assumptions

- Differentiation is prioritized over lowest delivery risk.
- Codex is the primary GTM vector.
- Architecture remains MCP-first and portable to avoid vendor lock-in.
