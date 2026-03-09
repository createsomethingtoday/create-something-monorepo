# Policy OS Graduation Checklist

> Prepared: March 9, 2026
> Scope: canonical checklist for graduating `Policy OS` from internal inference to a named CREATE SOMETHING product

## Purpose

This document defines what must become true before CREATE SOMETHING can treat **Policy OS** as a canonical product rather than shorthand for the repo's existing policy, judgment, runbook, and governance layer.

## Graduation Standard

`Policy OS` graduates when all of the following are true:

1. It is named explicitly in canonical strategy and product surfaces.
2. It has a standard contract bundle and handoff shape.
3. Its policy lifecycle is active, promotable, and auditable.
4. Its runtime enforcement is proven in deployed execution paths.
5. Its commercial and entitlement model is represented in `.agency`.
6. Its operating cadence and runbooks are standardized.
7. It has been delivered repeatedly enough to count as a product rather than a single-client framing.

## Current Status

As of March 9, 2026:

- `Policy OS` is a strong **business inference**
- `Agent Outcome Stack` remains the canonical paid package name
- the repo already contains most of the substrate needed for Policy OS
- the missing work is consolidation, proof, and commercialization

## Graduation Gates

| Gate | What must be true | Evidence required | Current status |
|------|-------------------|-------------------|----------------|
| **1. Naming** | `Policy OS` appears as a canonical product name in strategy, `.agency`, and packaging surfaces | strategy doc updates, `.agency` copy, package matrix | `open` |
| **2. Contract bundle** | `Policy OS` ships with standard versioned contract templates | real `mcp_contract.yaml`, `agent_contract.yaml`, `outcome_contract.md` templates | `partial` |
| **3. Policy lifecycle** | policy promotion and rollback work as an operating system, not just as docs | active version records, hashes, promotion path, rollback evidence | `partial` |
| **4. Runtime enforcement** | policy gates real hub and product execution in deployed flows | authz traces, deny/allow evidence, quota/rate-limit proof, tenant exposure proof | `partial` |
| **5. Commercial control plane** | `.agency` can sell, entitle, gate, and disclose Policy OS state | contract state, billing state, entitlement UI, allow/deny UX | `partial` |
| **6. Runbooks and cadence** | the operating loop is standardized | review cadence, tuning cadence, rollback runbook, escalation runbook | `partial` |
| **7. Repeatable delivery** | the same package has been delivered more than once under the same shape | 2-3 live engagements, consistent artifacts, measurable outcomes | `open` |

## Detailed Checklist

### Gate 1. Canonical Naming

`Policy OS` is not graduated until it is named in the same class as `Agent Outcome Stack`.

Required:

- update [docs/MCP_FIRST_THESIS.md](./MCP_FIRST_THESIS.md) to define how `Policy OS` relates to `Agent Outcome Stack`
- update [docs/AGENCY_CODEX_VECTOR_STRATEGY.md](./AGENCY_CODEX_VECTOR_STRATEGY.md) with approved packaging language
- add `.agency` operator-facing and sales-facing copy that describes:
  - what Policy OS is
  - who it is for
  - how it differs from `MCP-only`
  - how it differs from raw assistant seats
- define whether:
  - `Policy OS` replaces `Agent Outcome Stack`
  - `Policy OS` is the operating layer inside `Agent Outcome Stack`
  - `Policy OS` is the recurring subscription after an `Agent Outcome Stack` pilot

Graduation test:

- a new teammate can read canonical docs and explain Policy OS without needing the March 9 memo

### Gate 2. Standard Contract Bundle

The repo already says every engagement should ship three contracts. Policy OS graduates when those become a formal product bundle.

Required:

- publish canonical templates for:
  - `mcp_contract.yaml`
  - `agent_contract.yaml`
  - `outcome_contract.md`
- add a Policy OS-specific metadata section to the bundle:
  - package name
  - approved workflows
  - approval mode
  - escalation policy
  - review cadence
  - billing and entitlement assumptions
- define minimum required fields and validation rules

Source anchors:

- [docs/AGENCY_CODEX_VECTOR_STRATEGY.md](./AGENCY_CODEX_VECTOR_STRATEGY.md)
- [docs/MIXED_STACK_CLIENT_MCP_OFFER_ASSESSMENT_2026-03-09.md](./MIXED_STACK_CLIENT_MCP_OFFER_ASSESSMENT_2026-03-09.md)

Graduation test:

- a client handoff can be generated from templates with no undocumented behavior

### Gate 3. Policy Lifecycle Is Operational

Policy OS cannot stay a metaphor. It needs real policy versioning and promotion behavior.

Required:

- move policy promotion beyond `draft`-only artifacts
- implement or verify:
  - activation workflow
  - change rationale capture
  - compiled artifact integrity fields
  - rollback to previous active policy
- show a real path from authored policy to enforced policy

Source anchor:

- [docs/policies/v1/policy.policy-lifecycle-governance.v1.md](./policies/v1/policy.policy-lifecycle-governance.v1.md)

Graduation test:

- a policy owner can promote, audit, and roll back a policy without relying on undocumented manual steps

### Gate 4. Runtime Enforcement Proof

Policy OS is not real if policy only exists in docs.

Required:

- prove that policy gates:
  - hub route authorization
  - tenant tool exposure
  - bearer and session access
  - hosted product UX blocked states
  - approval and escalation behavior
- run and preserve evidence for:
  - allow path
  - deny path
  - reconnect/auth-required path
  - tenant isolation path
  - destructive route path
- tie policy decisions to telemetry or traces

Source anchors:

- [docs/HUB_EXECUTION_GOVERNANCE_PLAN.md](./HUB_EXECUTION_GOVERNANCE_PLAN.md)
- [docs/policies/v1/policy.hub-route-authorization.v1.md](./policies/v1/policy.hub-route-authorization.v1.md)
- [docs/policies/v1/policy.tenant-tool-exposure.v1.md](./policies/v1/policy.tenant-tool-exposure.v1.md)
- [docs/policies/v1/policy.user-bearer-token-governance.v1.md](./policies/v1/policy.user-bearer-token-governance.v1.md)
- [docs/policies/v1/policy.client-hub-user-experience.v1.md](./policies/v1/policy.client-hub-user-experience.v1.md)

Graduation test:

- the team can show traceable proof that policy changed runtime behavior in a live or staging flow

### Gate 5. Commercial Control Plane

If Policy OS is a product, `.agency` has to represent it as contract state, entitlement state, and blocked-state UX.

Required:

- define Policy OS-specific contract and billing states
- wire `.agency` entitlement logic to those states
- show user-facing blocked states for:
  - no entitlement
  - expired contract
  - billing problem
  - policy acceptance required
  - workflow suspended by governance
- define admin controls for:
  - grant
  - revoke
  - suspend
  - resume

Source anchors:

- [docs/policies/v1/policy.mcp-credential-delivery.v1.md](./policies/v1/policy.mcp-credential-delivery.v1.md)
- [docs/policies/v1/policy.user-bearer-token-governance.v1.md](./policies/v1/policy.user-bearer-token-governance.v1.md)
- [docs/policies/v1/policy.client-hub-user-experience.v1.md](./policies/v1/policy.client-hub-user-experience.v1.md)

Graduation test:

- `.agency` can answer "Is this account entitled to Policy OS right now?" and the answer changes behavior everywhere it should

### Gate 6. Standardized Operating Loop

Policy OS implies ongoing operation, not static deployment.

Required:

- standardize a recurring operating cadence for:
  - weekly review
  - monthly tuning
  - escalation review
  - incident review
  - policy change review
- publish operator runbooks for:
  - approval escalation
  - rollback
  - auth recovery
  - tenant isolation issue
  - entitlement or billing suspension

Source anchors:

- [docs/AGENCY_CODEX_VECTOR_STRATEGY.md](./AGENCY_CODEX_VECTOR_STRATEGY.md)
- [docs/AUTH0_SUBJECT_REBIND_RUNBOOK.md](./AUTH0_SUBJECT_REBIND_RUNBOOK.md)
- [docs/MCP_HUB_REMOTE_DEPLOY.md](./MCP_HUB_REMOTE_DEPLOY.md)

Graduation test:

- an operator can run the service using canonical runbooks rather than founder memory

### Gate 7. Repeatable Delivery

Policy OS becomes product truth only after repeatable delivery.

Required:

- deliver 2-3 engagements under a consistent package shape
- use the same contract bundle family
- use the same review cadence
- preserve comparable outcome metrics
- document at least one case where policy changed execution or escalation materially

Source anchors:

- [docs/AGENCY_CODEX_VECTOR_STRATEGY.md](./AGENCY_CODEX_VECTOR_STRATEGY.md)
- [docs/POLICY_OS_TRIAL_PACKAGING_MEMO_2026-03-09.md](./POLICY_OS_TRIAL_PACKAGING_MEMO_2026-03-09.md)

Graduation test:

- the team can sell Policy OS from a repeatable package, not from custom explanation every time

## What Does Not Count As Graduation

These are useful, but not sufficient:

- having many policy markdown files
- using `Policy OS` in one memo or sales conversation
- shipping one successful concierge pilot
- having a hub with policy aspirations but no traceable enforcement proof
- founder-led operations with unwritten escalation behavior

## Minimum Artifact Set For Graduation

Before Policy OS is canonical, these should exist:

1. one canonical Policy OS definition doc
2. one packaging doc describing relation to `Agent Outcome Stack`
3. contract templates for `mcp_contract.yaml`, `agent_contract.yaml`, `outcome_contract.md`
4. one entitlement and billing model in `.agency`
5. one operator playbook for the monthly operating loop
6. one evidence pack showing real policy enforcement in execution traces

## Suggested Sequence

Do this in order:

1. decide the naming relationship between `Policy OS` and `Agent Outcome Stack`
2. publish the contract templates
3. wire policy lifecycle and promotion evidence
4. prove runtime enforcement in one governed workflow
5. wire `.agency` entitlement and blocked-state UX
6. standardize operator runbooks and monthly review
7. repeat across 2-3 client deliveries

## Recommended Next Docs Or Deliverables

If the team wants to keep moving immediately, the next concrete deliverables should be:

1. `docs/POLICY_OS_PRODUCT_DEFINITION.md`
2. `templates/mcp_contract.yaml`
3. `templates/agent_contract.yaml`
4. `templates/outcome_contract.md`
5. `.agency` entitlement model update for Policy OS state
6. one validation memo proving runtime enforcement for a real workflow

## Final Rule

`Policy OS` graduates when the repo can answer all three questions with links and evidence:

1. What is it?
2. How is it enforced?
3. How is it sold and operated?

If any one of those still requires oral explanation instead of canonical artifacts, Policy OS remains an inference.

## Source Anchors

- [docs/MCP_FIRST_THESIS.md](./MCP_FIRST_THESIS.md)
- [docs/AGENCY_CODEX_VECTOR_STRATEGY.md](./AGENCY_CODEX_VECTOR_STRATEGY.md)
- [docs/POLICY_OS_TRIAL_PACKAGING_MEMO_2026-03-09.md](./POLICY_OS_TRIAL_PACKAGING_MEMO_2026-03-09.md)
- [docs/MIXED_STACK_CLIENT_MCP_OFFER_ASSESSMENT_2026-03-09.md](./MIXED_STACK_CLIENT_MCP_OFFER_ASSESSMENT_2026-03-09.md)
- [docs/policies/v1/policy.policy-lifecycle-governance.v1.md](./policies/v1/policy.policy-lifecycle-governance.v1.md)
