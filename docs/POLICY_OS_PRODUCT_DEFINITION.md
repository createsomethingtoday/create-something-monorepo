# Policy OS Product Definition

> Canonicalized: March 13, 2026
> Scope: CREATE SOMETHING paid governed package definition

## Definition

**Policy OS** is the canonical paid CREATE SOMETHING package for governed AI execution.

It combines:

- custom MCP connectivity
- agent and workflow behavior contracts
- policy artifacts and approval boundaries
- operator runbooks and golden-task regressions
- recurring review, tuning, and escalation operations

`MCP-only` remains the free or constrained discovery wedge. It is not the default paid package.

## Product shape

Policy OS is delivered as one package with two primary delivery layers:

1. **Workflow Infrastructure**
   - trusted MCP connectivity
   - deterministic workflow execution paths
   - implementation and integration contracts
2. **Policy OS**
   - approval, block, and escalation logic
   - policy artifacts, blocked-state UX, and release evidence
   - recurring review, tuning, and incident cadence
3. **Enterprise Extension**
   - higher-stakes governance boundaries
   - cross-system orchestration
   - compliance-heavy or multi-team operating constraints

`Workflow Infrastructure` and `Enterprise Extension` describe delivery layers. `Policy OS` is the public governed package name.

## Naming rules

- Use `Policy OS` as the canonical paid package name.
- Keep `MCP-only` as the discovery/compliance wedge.
- Keep delivery-vector language unchanged:
  - canonical phrase: `Skills on MCP`
  - client-facing label: `Skills + MCP`
  - technical label: `MCP + Skills`
- Treat `Reliability and Control Layer` as deprecated packaging language. It may appear only as a short-lived compatibility alias where manifests or historical artifacts still reference it.

## Canonical contract bundle

Every Policy OS engagement ships the same artifact family:

- `mcp_contract.yaml`
- `agent_contract.yaml`
- `outcome_contract.md`
- `golden_tasks.yaml`
- `runbook.md`

The bundle must define:

- `package_name`
- `approved_workflows`
- `approval_mode`
- `escalation_policy`
- `review_cadence`
- `billing_and_entitlement_assumptions`

## Runtime and entitlement model

Policy OS runtime enforcement preserves the canonical entitlement enum:

- `mcp_only`
- `policy_os_trial`
- `policy_os_core`

Paid-scope decisions must continue to evaluate the normalized entitlement snapshot, including:

- `service_entitled`
- `policy_accepted`
- `contract_active`
- `billing_active`
- `approved_exception`

## Operator cadence

Minimum standing cadence for Policy OS:

- weekly review of incidents, blocked actions, and golden-task drift
- monthly tuning of policy, prompts, and workflow controls
- change review whenever tool scope, approval mode, or commercial state changes
- rollback-ready runbook for auth, entitlement, and policy failures

## Proof standard

The repo can claim Policy OS productization when all of the following are true:

- naming is canonical across strategy and public surfaces
- contract templates and mirrored delivery templates match the same schema
- runtime-backed authz manifests are active and compiled
- publish flow promotes all active manifests rather than a single symbolic policy id
- blocked-state UX and access decisions reflect real commercial and policy checks
- exemplar bundles and validation evidence prove repeatable package shape without overstating multi-client live deployment

## Historical note

Older March 2026 memos may still reference `Agent Outcome Stack` or `Reliability and Control Layer`.
Those references remain historically accurate for the date of authorship but are superseded by this definition for current packaging and product language.
