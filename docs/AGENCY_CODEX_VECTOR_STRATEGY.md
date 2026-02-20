# Agency Codex Vector Strategy

> Date: February 20, 2026
> Scope: CREATE SOMETHING `.agency` packaging and delivery model
> Priority: Max differentiation

## Summary

The commercial default is now **Agent Outcome Stack** (agents + MCPs), with **MCP-only** as a narrow entry wedge.

- MCP remains the chassis: trust boundaries, connectivity, policy artifacts.
- Outcomes are the product: execution quality, escalation policy, and continuous tuning.
- Codex is the primary setup and demo vector, while MCP contracts stay portable.
- Brokered gateway discovery (`search -> describe -> invoke`) is the default operating pattern for multi-integration deliveries.

## Strategic decision

1. `MCP-only` is sold only for discovery/compliance use cases.
   - Delivered as constrained brokered connectivity (read-first, policy-guarded), not broad direct tool exposure.
2. `Agent Outcome Stack` is the default paid package:
   - Custom MCP server(s) for client systems.
   - Brokered gateway interface + tenant policy/quota controls by default for multi-integration clients.
   - Codex-ready agent setup and prompt/policy artifacts.
   - Managed judgment loop (approvals, escalation, monthly tuning).
3. Supplier wrap pattern remains unchanged:
   - Commodity connectivity via `@create-something/composio-bridge`.
   - Deep-domain logic and intelligence layer are always custom.
4. Discovery mode defaults:
   - `HUB_DISCOVERY_MODE=broker` for all new deployments.
   - `compat` only for migration windows and legacy clients.

## Offer architecture

### MCP-only (entry wedge)

Use when:
- Client wants internal team to operate agents.
- Compliance allows only read or constrained actions.
- Scope is connectivity validation.

Deliverables:
- MCP endpoint(s) with brokered discovery tools
- Auth setup
- Tool/resource/prompt inventory (scoped to approved tool refs and connector boundaries)
- Tenant policy and quota defaults
- Basic runbook and ownership handoff

### Agent Outcome Stack (default)

Use when:
- Client asks for measurable time savings or autonomous follow-through.
- Workflow needs escalation policy, approval gates, or quality controls.
- Client expects ongoing optimization.

Deliverables:
- Custom MCP endpoint(s) and/or brokered gateway endpoint
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
- Discovery mode and broker interface requirements
- Connector scope, policy defaults, quota defaults, and trace requirements

2. `agent_contract.yaml`
- Allowed tools and allowed tool refs
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
- Broker scope matrix (allowed tool refs + connector scopes)
- Approval policy and escalation policy
- Tenant quota defaults and exception policy
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
- Position brokered gateway + managed policy as the default integration shape.

### Weeks 4-8

- Standardize delivery playbook around the 3-contract system.
- Apply templates on all new engagements.
- Route high-cardinality Composio catalogs through brokered hub paths; reserve direct registration for narrow catalogs.

### Weeks 8-12

- Run 2-3 engagements with Agent Outcome Stack default.
- Measure attach/conversion/time-to-outcome.
- Publish one case study comparing MCP-only vs bundled outcomes.
- Evaluate conditional Code Execution Mode pilot only for very large catalogs/workflows where broker-only UX is insufficient.

## Test scenarios

1. Commodity integration
- Prompt: "Connect Slack + HubSpot and summarize daily changes."
- Expected package: Composio-wrapped MCP routed through brokered hub + approval policy.

2. Deep workflow
- Prompt: "Detect schedule conflicts and auto-draft escalation."
- Expected package: custom MCP + custom agent policy + monthly tuning.

3. Compliance constrained
- Prompt: "Read-only assistant with all writes requiring approval."
- Expected package: MCP + strict approvals + escalation-only agent behaviors.

4. Portability
- Same workflow runs Codex-first while core MCP/policy artifacts remain portable.

5. Broker flow and controls
- Prompt: "Find and use the correct tool from a large catalog without exposing full inventory."
- Expected behavior: `hub_tools_search -> hub_tools_describe -> hub_tools_invoke`, with policy/quota enforcement and correlation traces.

## Acceptance criteria

- Bundle attach rate is materially above current MCP-only baseline.
- Time to first autonomous business outcome is <= 14 days from kickoff.
- Golden task success rate is >= 90% under defined approval policy.
- Handoff includes all contracts and runbook artifacts with no undocumented behavior.

## Defaults and assumptions

- Differentiation is prioritized over lowest delivery risk.
- Codex is the primary GTM vector.
- Architecture remains MCP-first and portable to avoid vendor lock-in.
