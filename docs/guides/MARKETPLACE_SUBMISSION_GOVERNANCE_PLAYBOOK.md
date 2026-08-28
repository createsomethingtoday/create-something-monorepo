# Marketplace Submission Governance Playbook

- **Status:** v1 internal operating artifact
- **Owner:** Marketplace review owner
**Scope:** template and app submission triage, evidence, exception, and handoff

## Objective

Move a Marketplace submission from reported issue or review request to a
reviewer-legible decision without treating a support update, bundle test, or
browser observation as broader approval.

## Three-tier model

| Tier | Source of truth |
| --- | --- |
| Database | submission/version record, support ticket, review queue, exception record, and receipt |
| Automation | Review MCP, validators, bundle/runtime checks, and controlled notifications |
| Judgment | reviewer decision, exception authority, release/resubmission approval, and escalation |

## Plays

### Intake and reconciliation

Capture the original report and immutable identifiers first. Reconcile the
submission/version, support record, review queue, and any creator/account state
before changing labels, feedback, or publication state.

### Evidence preparation

Keep these receipts distinct:

- static bundle or source checks
- local test result
- pinned runtime or hash readback
- published-site or configured custom-code observation
- required form fields and screenshots
- final reviewer or Preflight outcome

### Exception and resubmission

An exception record must name the finding, observed behavior, requested
authority, decision owner, decision, and expiry/review condition. A resubmission
may prepare evidence while a judgment item waits; it cannot turn an unresolved
exception into approval.

## Stop conditions

- source records disagree or a required identifier is missing
- a write would alter a review, creator, payment, or publication state without
  the named owner's approval
- evidence only covers a subset of the submission surface
- a proposed external security report cannot be independently verified

## Proof and handoff

The terminal receipt identifies the records reviewed, evidence coverage,
decision, remaining gaps, next owner, and whether a public/deployment action was
actually performed. Link the owning implementation in
`packages/webflow-template-review-mcp/`, `packages/webflow-app-review-mcp/`, or
`packages/webflow-template-validation/` rather than copying changing runtime
details into this Playbook.
