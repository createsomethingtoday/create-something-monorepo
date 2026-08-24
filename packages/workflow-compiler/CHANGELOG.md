# Changelog

All notable changes to this package are documented here. This project follows
Semantic Versioning for its npm API and separately versions its workflow and
artifact schemas.

## 0.4.0

- Add offline `notion_agent_blueprint.v0.1` planning for a workflow agent's
  explicit Custom Agent resources, triggers, and narrow Worker or CREATE
  SOMETHING MCP bindings.
- Add strict blueprint, configuration-receipt, and operational-receipt parsers
  plus deterministic `pass`, `wait`, and `stop` evaluators. A matching supplied
  receipt is a structural comparison only, never a claim of a live Notion
  readback.
- Require explicit configuration/activation/run/tool receipts for every
  blueprint and a confirmed tool receipt plus mutation receipt bound to the
  same run for write or publish bindings. Scope expansion, altered tool
  bindings, stale receipts, and missing write proof fail closed.
- Reject `can_comment` and `can_edit` access without a governed write or
  publish action. Activation receipts must bind the same run as operational
  evidence, and undeclared receipt actions stop evaluation.

## 0.3.1

- Add the shipped Marketplace Submission System Map. It provides one
  source-linked buyer walkthrough and builder handoff for form validation,
  Validator App preflight, confirmed Airtable Automation handoff, reviewer
  authority, receipts, stops, and the authenticated execution-host boundary.
- Keep credential declarations, local compiler receipts, and current
  third-party operating receipts distinct so the documentation never treats a
  configuration requirement, webhook, or agent message as proof of a live
  submission or approval.

## 0.3.0

- Require compiler-owned in-process bundles for replay as well as adapter
  invocation, so a copied or deserialized transition graph cannot alter an
  accepted replay under a retained definition hash.
- Add the `marketplace-submission` terminal starter for a local, source-bound
  submission-to-review walkthrough.
- Replay form validation, Validator App preflight, Airtable Automation receipt
  inspection, reviewer wait, failed preflight, missing receipt, and blocked
  creator messaging using sanitized deterministic fixtures only.
- Require `form_validation_passed: true`, exact passing preflight and confirmed
  handoff values, plus the owning review-ready receipt vocabulary before replay
  can transition to form-validated, preflight-passed, or ready-for-review
  states.
- Add the `equals_one_of` evidence matcher only in the new v0.3 workflow and
  correlated artifact schemas, preserving v0.2's published substring-only
  matcher vocabulary. The Marketplace starter uses it with the owning
  review-status vocabulary so a negative phrase such as `Not Ready for Review`
  cannot be treated as review-ready.
- Add detached `migrateWorkflowDefinitionToV0_3` and
  `migrateGovernedInteractionBundleToV0_3` helpers; the v0.2 helpers refuse a
  v0.3 downgrade.
- Add explicit `workflow_definition.v0.2` and
  `compiled_workflow_bundle.v0.2`, `decision_inventory.v0.2`, and
  `governed_interaction_bundle.v0.2` schemas for exact-evidence and
  evidence-matcher constraints, with detached public migration helpers from
  v0.1.
- Add the correlated v0.3 definition, compiled bundle, decision inventory,
  governed interaction, approval surface, tool contract, replay report, and
  operator-console schemas for exact-enum matcher contracts.
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
- Add `workflow_adapter_plan.v0.3` for exact-enum workflows and for the new
  `UNVERIFIED_COMPILED_BUNDLE` fail-closed stop, so v0.1/v0.2 plan consumers
  never receive an expanded reason-code vocabulary under their prior schema.
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
- Reject constrained evidence that conflicts with the type of its declared tool
  parameter, including a string matcher on a number or boolean parameter,
  before emitting an uninvokable adapter plan.
- Reject v0.1 compiled decisions that carry either v0.2-only evidence constraint
  field before replay-case evaluation, even when supplied evidence would match.
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
- Version approval surfaces as v0.2 for constrained workflows, retaining
  exact-value and matcher constraints on controlled actions instead of reducing
  them to evidence field names.
- Version tool contracts as v0.2 for constrained workflows, retaining the
  exact-value and matcher evidence accepted by each governed tool action.
- Reject a deserialized bundle before replay when its nested inventory,
  interaction, tool-contract, or approval-surface schema or governance
  contract (including autonomy, authority, approvals, and evidence constraints)
  does not match the correlated compiled decision.
- Bind the complete v0.2 tool inventory to source-derived decision contracts so
  deserialized artifacts cannot add, remove, duplicate, or alter an invokable
  tool.
- Require a complete one-to-one v0.2 action inventory across decision,
  governed-interaction, approval-surface, and source-derived tool artifacts;
  replay rejects unknown, duplicate, missing, or inappropriate approval records
  before they can influence replay or adapter planning.
- Freeze compiler-produced bundles and require that in-process trusted source
  for adapter invocation; deserialized or copied bundles now stop with
  `UNVERIFIED_COMPILED_BUNDLE` rather than allowing co-mutated tool copies to
  agree on an invocation target.

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
