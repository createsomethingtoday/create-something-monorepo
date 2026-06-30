# Policy OS Product Definition

> Canonicalized: March 13, 2026
> Scope: CREATE SOMETHING paid governed package definition

## Definition

**Policy OS** is the canonical paid CREATE SOMETHING package for governed AI execution.

It combines:

- custom MCP connectivity
- agent and workflow behavior contracts
- policy artifacts and approval boundaries
- managed execution-surface selection and graduation criteria
- operator runbooks and golden-task regressions
- recurring review, tuning, and escalation operations

`MCP-only` remains the free or constrained discovery wedge. It is not the default paid package.

Policy OS should be explained with the same simple operating loop used across
CREATE SOMETHING:

```text
Signal → Decision → Proof
```

- **Signals** are the workflow events Policy OS watches: Slack updates, API
  changes, schema diffs, PRs, tool calls, customer requests, exceptions,
  incidents, and policy gaps.
- **Decisions** are the routed actions Policy OS asks a human, agent, or policy
  runtime to make: approve, deny, update docs, request changes, assign, escalate,
  block, or run.
- **Proof** is the durable record Policy OS leaves behind: source evidence,
  policy applied, owner, decision, downstream action, receipt, and recovery path.

This is the communication layer. The implementation still uses MCP connectivity,
contracts, approval modes, policy artifacts, traces, and runbooks.

## Product shape

Policy OS is delivered as one package with three delivery layers:

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

## Execution surfaces and graduation

Policy OS may run through more than one agent surface. Surface choice is part of
the governed package, not an implementation afterthought.

Default surface roles:

- **Dify** remains the preferred client and operator surface when the workflow
  needs visual editing, app publishing, Service API access, MCP server cards,
  non-engineer inspection, or client-facing chat/workflow UX.
- **Cloudflare and repo-owned services** remain the preferred runtime surface
  when the workflow needs auth, queues, D1 state, tenant boundaries, custom
  endpoints, durable recovery paths, or package-local validation.
- **OpenAI Agents SDK** is a Policy OS graduation lane for workflows that now
  need code-owned orchestration, explicit tool routing, approval pauses,
  durable state, traces, evals, and CI-backed golden tasks.

Do not treat Agents SDK adoption as a blanket replacement for Dify. A workflow
graduates from Dify-first delivery into an SDK-backed runtime only when the
added control is worth the platform burden CREATE SOMETHING must now own:
versioning, preview, rollback, team review, operator handoff, observability,
and governance compatibility.

Graduation requires:

- a frozen Policy OS contract bundle for the workflow
- a documented `runtime_surface` decision in the agent contract
- golden-task parity between the Dify path and the SDK-backed path, when Dify
  already owns the live surface
- explicit approval and rollback behavior for side-effecting tools
- trace or eval evidence showing the SDK path improves governance, cost,
  latency, reliability, or operator visibility

## Naming rules

- Use `Policy OS` as the canonical paid package name.
- Keep `MCP-only` as the discovery/compliance wedge.
- Use `Signal → Decision → Proof` as the simplest explanation of how Policy OS
  operates.
- Use `Inbox`, `Map`, and `Proof` for human-facing operator surfaces.
- Use `Proof Graph` for the connected evidence/provenance layer when the
  append-only ledger alone is too narrow.
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
- `runtime_surface`
- `graduation_status`

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
- weekly review of workflows eligible for runtime graduation or rollback
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
- SDK-backed graduation paths preserve Dify/operator usability or document why
  that surface is no longer required
- exemplar bundles and validation evidence prove repeatable package shape without overstating multi-client live deployment

## Historical note

Older March 2026 memos may still reference `Agent Outcome Stack` or `Reliability and Control Layer`.
Those references remain historically accurate for the date of authorship but are superseded by this definition for current packaging and product language.
