# Workflow Artifact Templates

These templates are the default delivery artifacts produced after a Workflow Mapping Session.

Use them together:

1. `mcp_contract.yaml`
Defines the systems, resources, tools, auth scopes, and failure model.

2. `agent_contract.yaml`
Defines allowed actions, approval boundaries, escalation triggers, and runtime guardrails.

3. `outcome_contract.md`
Defines pilot scope, success criteria, ownership boundaries, fallback path, and rollout expectations.

Recommended sequence:

1. Complete `discovery-note-template.md`
2. Complete `policy-os-proposal-input-template.md`
3. Draft these three artifacts from the approved workflow map
4. Add golden-task checks and runbook after artifact review

Important:

- `mcp_contract.yaml` is for connectivity and tool surface
- `agent_contract.yaml` is for behavior and control policy
- `outcome_contract.md` is for business scope and accountability
- Braintrust may be referenced in these artifacts only as observability/eval infrastructure, not as the policy control plane
