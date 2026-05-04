# Workflow Artifact Templates

These files mirror the canonical contract bundle in `/templates`.

Use the root `/templates` directory as the source of truth. This folder exists so `.agency` operators can draft the same bundle without maintaining a second schema.

## Canonical bundle

1. `mcp_contract.yaml`
2. `agent_contract.yaml`
3. `outcome_contract.md`
4. `golden_tasks.yaml`
5. `runbook.md`

Each artifact must carry the Policy OS metadata required by the canonical bundle:

- `package_name`
- `approved_workflows`
- `approval_mode`
- `escalation_policy`
- `review_cadence`
- `billing_and_entitlement_assumptions`
- `operator_load_budget`
- `gross_margin_floor`
- `owner_compensation_fit`

Commercial metadata must be present before implementation starts:

- monthly recurring revenue
- gross margin floor percent
- owner-compensation fit (`fits|watch|does_not_fit`)
- covered workflow and downstream-system counts
- live-review cadence and async-review cadence
- expansion triggers for new workflows, extra systems, custom UI, or higher meeting cadence

## Recommended sequence

1. Complete `discovery-note-template.md`
2. Complete `policy-os-proposal-input-template.md`
3. Draft the full bundle from the approved workflow map
4. Review the bundle together before implementation
5. Keep root `/templates` and this mirrored bundle aligned

## Usage notes

- `mcp_contract.yaml` defines systems, tools, resources, scopes, and failure model.
- `agent_contract.yaml` defines behavior, approval boundaries, escalation logic, and runtime guardrails.
- `outcome_contract.md` defines workflow scope, success criteria, fallback path, and accountability.
- `golden_tasks.yaml` defines must-pass scenarios that prove the workflow behaves correctly before release.
- `runbook.md` defines operating cadence, approvals, exceptions, containment, rollback, and recovery.

Braintrust may be referenced only as observability and eval infrastructure, not as the policy control plane.
