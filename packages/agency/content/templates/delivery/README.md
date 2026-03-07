# Workflow Artifact Templates

These templates are the default delivery artifacts produced after a Workflow Mapping Session.

Use them together:

1. `mcp_contract.yaml`
Defines the systems, resources, tools, auth scopes, and failure model.

2. `agent_contract.yaml`
Defines allowed actions, approval boundaries, escalation triggers, and runtime guardrails.

3. `outcome_contract.md`
Defines pilot scope, success criteria, ownership boundaries, fallback path, and rollout expectations.

4. `golden-task-checks.md`
Defines the must-pass scenarios that prove the workflow behaves correctly before release.

5. `runbook.md`
Defines operator procedures for approvals, exceptions, fallback, containment, and recovery.

6. `halfdozen-mcp-onboarding-pack.md`
Internal onboarding template for the Half Dozen team using governed MCPs.

7. `halfdozen-mcp-onboarding-checklist.md`
Operator checklist for running a Half Dozen MCP onboarding session.

Recommended sequence:

1. Complete `discovery-note-template.md`
2. Complete `policy-os-proposal-input-template.md`
3. Draft these three artifacts from the approved workflow map
4. Draft golden-task checks and runbook from the same workflow map
5. Review the full artifact set before implementation
6. Use the Half Dozen onboarding pack when the audience is the internal Half Dozen team

Reference example:

- `examples/exampleco-mcp_contract.yaml`
- `examples/exampleco-agent_contract.yaml`
- `examples/exampleco-outcome_contract.md`
- `examples/exampleco-golden-task-checks.md`
- `examples/exampleco-runbook.md`
- `examples/halfdozen-mcp-onboarding-example.md`

Important:

- `mcp_contract.yaml` is for connectivity and tool surface
- `agent_contract.yaml` is for behavior and control policy
- `outcome_contract.md` is for business scope and accountability
- Braintrust may be referenced in these artifacts only as observability/eval infrastructure, not as the policy control plane
