# Changelog

All notable changes to this package are documented here. This project follows
Semantic Versioning for its npm API and separately versions its workflow and
artifact schemas.

## 0.3.0

- Add the `marketplace-submission` terminal starter for a local, source-bound
  submission-to-review walkthrough.
- Replay form validation, Validator App preflight, Airtable Automation receipt
  inspection, reviewer wait, failed preflight, missing receipt, and blocked
  creator messaging using sanitized deterministic fixtures only.
- Require `form_validation_passed: true`, exact passing preflight and confirmed
  handoff values, plus the owning review-ready receipt vocabulary before replay
  can transition to form-validated, preflight-passed, or ready-for-review
  states.
- Add explicit `workflow_definition.v0.2` and
  `compiled_workflow_bundle.v0.2`, `decision_inventory.v0.2`, and
  `governed_interaction_bundle.v0.2` schemas for exact-evidence and
  evidence-matcher constraints, with detached public migration helpers from
  v0.1.
- Reject empty or whitespace-only exact evidence values before a replay can be
  made permanently unsatisfiable.
- Make `WorkflowDefinition` schema-discriminated in the public TypeScript
  declarations so v0.1 actions cannot type-check with v0.2-only evidence
  constraints.
- Add `workflow_replay_report.v0.2` for constrained replay output; v0.1
  reports retain their historical case shape without mismatch fields or reason
  codes.
- Correlate compiled-bundle, decision-inventory, governed-interaction, and
  decision TypeScript contracts by schema version so legacy bundles cannot be
  constructed with constrained v0.2 internals.
- Add `workflow_adapter_plan.v0.2` for MCP and OpenAI Responses plans from
  constrained bundles, retaining the original v0.1 governance-reason vocabulary
  for legacy plans.
- Serialize absent exact-value and matcher evidence as `actual: null` in v0.2
  mismatch details rather than dropping the required field from replay JSON.
- Preserve the legacy host contract when its schema allowlist is omitted:
  omission now means v0.1-only support, so newer bundles receive a normalized
  incompatibility decision rather than throwing. New hosts still explicitly
  allowlist supported governed-interaction schemas.
- Reject an exact evidence value and matcher on the same field when their
  conjunction cannot be satisfied in both compilation and direct interaction
  parsing, rather than emitting or accepting a permanently blocked replay
  contract.
- Version compatibility decisions as
  `governed_interaction_compatibility.v0.2` before emitting the expanded
  schema-support error vocabulary; historical v0.1 decisions remain readable
  with their original errors.
- Version the Client Workspace and Atlas Studio inspection envelopes to v0.2
  with their nested v0.2 compatibility receipts; historical v0.1 envelopes
  retain the v0.1 nested contract and accept only v0.1 interaction bundles.
- Version operator-console data with the decision-inventory and replay-report
  artifacts it embeds, and reject a mixed v0.1/v0.2 pair rather than emitting
  a misleading console schema.

## 0.2.0

- Add the local-runbook terminal starter, validation, simulation, and Markdown
  explanation commands for Codex-paired builders.
- Ship a repository-local Codex skill with explicit approval, no-live-action,
  and no-partnership-claim boundaries.

## 0.1.0

- Promote the audited bootstrap candidate to the first stable builder release.
- Preserve the exact local/CI compiler, independent verification, MCP and
  OpenAI/Codex adapter, and stage-only trusted-publication contracts proven by
  `0.1.0-beta.0`.

## 0.1.0-beta.0

- Add versioned workflow and replay parsers with stable diagnostics.
- Compile deterministic, content-hashed local/CI artifact bundles.
- Verify bundle integrity and optional Ed25519 signer attestations.
- Emit provider-neutral MCP and offline OpenAI Responses request plans.
- Include Webflow Marketplace and software-release reference workflows.
- Add exact tarball, clean-consumer, Node 22/24, and staged-publication gates.
