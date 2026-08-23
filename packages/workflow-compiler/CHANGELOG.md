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
