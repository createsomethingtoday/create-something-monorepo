# Policy OS Graduation Checklist

> Prepared: March 9, 2026
> Updated: March 13, 2026
> Scope: release checklist for graduating `Policy OS` into canonical CREATE SOMETHING product language and enforcement

## Purpose

This document records the repo-level graduation work that makes **Policy OS** the canonical paid CREATE SOMETHING package.

## Graduation Standard

Policy OS is treated as graduated in-repo when all of the following are true:

1. It is named explicitly in canonical strategy and product surfaces.
2. It has a standard contract bundle and handoff shape.
3. Its runtime-backed policy lifecycle is active, compilable, and publishable.
4. Its runtime enforcement is proven in tests and live verification paths.
5. Its commercial and entitlement model is represented in `.agency`.
6. Its operating cadence and runbooks are standardized.
7. Its repeatability proof is documented honestly without overstating multi-client live delivery.

## Current Status

As of March 13, 2026:

- `Policy OS` is the canonical paid package name.
- `MCP-only` remains the discovery/compliance wedge.
- `Workflow Infrastructure` and `Enterprise Extension` remain delivery layers inside the Policy OS package family.
- repo-level graduation work is complete; external repeatability claims remain bounded to verifiable evidence.

## Graduation Gates

| Gate | What became true | Evidence | Status |
|------|------------------|----------|--------|
| **1. Naming** | `Policy OS` is canonical across strategy and public surfaces | product definition, strategy doc, `.agency` copy, manifest updates | `landed` |
| **2. Contract bundle** | canonical templates require Policy OS metadata and mirrored delivery templates match | root `templates/`, mirrored `.agency` delivery templates | `landed` |
| **3. Policy lifecycle** | runtime-backed authz manifests are active and compiled artifacts are checked in | `packages/mcp-authz`, `docs/policies/generated/`, publish workflow | `landed` |
| **4. Runtime enforcement** | policy-backed deny/allow paths are tested and live verification hooks remain wired | authz tests, hub tests, live verification memo | `landed` |
| **5. Commercial control plane** | `.agency` discloses Policy OS state, manifest shape, and blocked-state UX | manifest API, public pages, entitlement surfaces | `landed` |
| **6. Runbooks and cadence** | recurring operating loop is standardized in templates and sales/delivery artifacts | runbook template, strategy docs, delivery README | `landed` |
| **7. Repeatable delivery** | standardized exemplar set proves repeatable package shape without claiming unverified field scale | Half Dozen scenario bundles + validation memo | `bounded_and_documented` |

## What changed

### Gate 1. Canonical Naming

- [docs/POLICY_OS_PRODUCT_DEFINITION.md](./POLICY_OS_PRODUCT_DEFINITION.md) defines Policy OS as the canonical paid package.
- [docs/MCP_FIRST_THESIS.md](./MCP_FIRST_THESIS.md) and [docs/AGENCY_CODEX_VECTOR_STRATEGY.md](./AGENCY_CODEX_VECTOR_STRATEGY.md) now use `Policy OS` as the default paid offer.
- `.agency` product, service, security, and manifest surfaces now use `Policy OS` as the governed package name.
- Date-stamped historical memos retain original wording but now carry supersession notes instead of being silently rewritten.

Graduation test:

- a new teammate can read canonical docs and explain Policy OS without any March 9 memo context

### Gate 2. Standard Contract Bundle

- canonical root templates define the contract bundle
- mirrored `.agency` delivery templates explicitly mirror the root bundle
- required Policy OS metadata now includes:
  - `package_name`
  - `approved_workflows`
  - `approval_mode`
  - `escalation_policy`
  - `review_cadence`
  - `billing_and_entitlement_assumptions`

Graduation test:

- a client handoff can be generated from templates with no undocumented behavior

### Gate 3. Policy Lifecycle Is Operational

- runtime-backed authz manifests moved from `draft` to `active`
- compiled artifacts are generated under `docs/policies/generated/`
- publish flow now publishes all active manifests rather than relying on one `OSO_POLICY_ID`

Graduation test:

- a policy owner can compile, publish, and audit active manifests through the documented path

### Gate 4. Runtime Enforcement Proof

- service-tier entitlement policy keeps the canonical runtime enum:
  - `mcp_only`
  - `policy_os_trial`
  - `policy_os_core`
- tests prove deny and allow paths for:
  - Policy OS-only discovery
  - paid governed writes
  - billing, contract, and policy acceptance failures
  - destructive-route human review
- validation memo ties contract bundle, active manifests, local verification, and live verification together

Graduation test:

- the team can show traceable proof that policy changed runtime behavior in test and live verification paths

### Gate 5. Commercial Control Plane

- `.agency` exposes `policy-os` as the canonical paid service in `GET /api/manifest`
- blocked-state UX explicitly covers:
  - no entitlement
  - contract inactive
  - billing issue
  - policy acceptance required
  - governance suspension
- entitlement surfaces continue to expose the normalized snapshot, including `approved_exception`

Graduation test:

- `.agency` can answer "Is this account entitled to Policy OS right now?" and the answer changes behavior where it should

### Gate 6. Standardized Operating Loop

- templates, sales assets, and product docs now standardize review cadence and escalation language
- runbook templates require approval, rollback, and entitlement assumptions to travel with the bundle

Graduation test:

- an operator can run the service from canonical artifacts rather than founder memory

### Gate 7. Repeatable Delivery

Repo evidence now standardizes the package shape through the three Half Dozen exemplar bundles:

- dedup + canonicalization
- inbox triage + sync
- fleet reliability watchdog

This is sufficient for repeatable artifact proof, but not for overstating multi-client live delivery.

Graduation test:

- the repo can prove the package shape repeats across exemplar bundles and verification runs without claiming unsupported external scale

## Remaining claim boundary

Policy OS is graduated as a repo-defined and runtime-backed package.

It is **not** appropriate to claim broad multi-client live repeatability unless additional verifiable field evidence is added beyond the current exemplar and validation set.
