# API reference

`@create-something/workflow-compiler` is an ESM-only package. All public
functions are exported from the package root. Generated TypeScript declarations
are included in the npm tarball.

## Compile and parse

### `compileWorkflowDefinition(input)`

Parses one `workflow_definition.v0.1`, `workflow_definition.v0.2`, or
`workflow_definition.v0.3` value, validates every reference and
consequential governance boundary, and returns a deterministic
`CompiledWorkflowBundle`. It throws `WorkflowInputValidationError` for input
shape errors and `WorkflowCompilationError` for invalid workflow semantics.

`workflow_definition.v0.2` and `workflow_definition.v0.3` may declare
`requiredEvidenceValues`, a map of required-evidence fields to an exact
non-empty string, finite number, or boolean value. Each constrained field must
also appear in `requiredEvidence`. The compiled governed-interaction, workflow,
decision-inventory, tool-contract, and approval-surface schemas retain the same
version family as the definition. Tool contracts and controlled actions retain
their exact-value and matcher constraints, so a consumer cannot mistake a
constrained decision for a v0.1 contract. Replay blocks a supplied value that differs from
the versioned contract with
`EVIDENCE_VALUE_MISMATCH`; a non-empty receipt alone cannot satisfy that
condition.

The generated TypeScript `WorkflowDefinition` is a schema-discriminated union:
`workflow_definition.v0.1` actions cannot declare either evidence-constraint
field, while v0.2 and v0.3 actions can. This mirrors the fail-closed runtime parser
instead of leaving an invalid v0.1 document to fail only after it reaches
production validation.

`workflow_definition.v0.2` limits `requiredEvidenceMatchers` to
`contains_case_insensitive`, which accepts a non-empty string that contains one
of its declared non-empty values. `workflow_definition.v0.3` adds
`equals_one_of`, which accepts only an exact member of its declared non-empty
string allowlist, and emits correlated v0.3 compiled, inventory, interaction,
approval-surface, tool-contract, replay-report, console, and adapter-plan
schemas. Replay blocks a
non-match with `EVIDENCE_MATCHER_MISMATCH`. This permits an owning system's
documented receipt vocabulary without accepting arbitrary regular expressions.
When an exact-value constraint and a matcher constrain the same evidence field,
the exact value must itself satisfy that matcher. The compiler rejects a contradiction with
`EVIDENCE_VALUE_MATCHER_CONFLICT`, and the interaction parser rejects an
externally supplied contradictory bundle, rather than permitting a workflow
that no replay could satisfy.

When constrained evidence supplies a declared tool parameter, an exact value
must match that parameter's type and a matcher requires a string parameter.
Compilation rejects incompatible contracts with
`EVIDENCE_VALUE_CONSTRAINT_TOOL_PARAMETER_TYPE_MISMATCH` or
`EVIDENCE_MATCHER_TOOL_PARAMETER_TYPE_MISMATCH`, rather than emitting an
adapter plan that cannot be invoked.

### `parseWorkflowDefinition(input)`

Validates and normalizes a workflow definition without compiling artifacts.
Unknown properties, schema versions, duplicate IDs, unsafe references, and
invalid authority assignments fail closed.

### `migrateWorkflowDefinition(input)`

Validates a `workflow_definition.v0.1` or `workflow_definition.v0.2` value and
returns a detached `workflow_definition.v0.2` copy. It does not infer new
evidence constraints or change workflow semantics. Validate, compile, replay,
and retain the prior source and compiled revision before promoting the copy.
`migrateWorkflowDefinitionToV0_3(input)` is the corresponding detached upgrade
path for v0.3; the v0.2 helper refuses to downgrade a v0.3 definition.

### `parseWorkflowReplayManifest(input)`

Validates one `workflow_replay_manifest.v0.1` value. Replay workflow IDs must
match the compiled definition.

## Replay and adapter planning

### `replayWorkflow(bundle, replayManifest)`

Evaluates all replay cases against a compiled bundle and returns a replay
report, evidence ledger, receipts, and acceptance summary. Historical actor and
approval strings do not authenticate a live consequential action.

A `compiled_workflow_bundle.v0.1` emits
`workflow_replay_report.v0.1`; its cases do not contain evidence-mismatch
fields. A v0.2 bundle emits `workflow_replay_report.v0.2`, whose cases add
exact-value and matcher mismatch detail plus their two reason codes. Consumers
must select the report shape by `schemaVersion` and recompile/replay a migrated
source definition rather than relabeling historical report data. Replay rejects
a v0.1 decision that merely carries either constraint field before evaluating a
case, even if supplied evidence would happen to satisfy it.

`CompiledWorkflowBundle` is also a schema-discriminated union. A v0.1 bundle
can contain only v0.1 decision inventory, governed interaction, tool contracts,
approval surfaces, and decisions without evidence constraints; a v0.2 bundle
carries the corresponding v0.2 contracts; a v0.3 bundle carries the exact-enum
matcher in corresponding v0.3 contracts. Replay also rejects a deserialized
bundle whose nested artifact schema or governance contract (including autonomy,
authority, approvals, and evidence constraints) does not match the correlated
v0.2 decision before it evaluates a case. The decision embeds the
source-derived tool contract when one exists, so an added, removed, duplicated,
or altered tool cannot become invokable after deserialization. TypeScript
callers therefore cannot construct a cross-version bundle that would produce a
legacy report while enforcing v0.2 constraints.

Before v0.2 replay, every action must appear exactly once in the decision
inventory and governed interaction; controlled actions must appear exactly once
in approval surfaces, while auto-allowed actions must not. The source-derived
tool inventory follows the same rule. Unknown and duplicate records are rejected
before replay or adapter planning can rely on them.

Adapter plans follow the compiled-bundle boundary. v0.1 bundles emit
`workflow_adapter_plan.v0.1`, whose `governanceReasonCode` uses the legacy
replay vocabulary. v0.2 bundles emit `workflow_adapter_plan.v0.2`, which may
carry exact-value or matcher mismatch reasons. Both MCP and offline OpenAI
Responses plans use the same versioned contract.

A v0.3 bundle emits `workflow_adapter_plan.v0.3`. The immutable-bundle stop
also uses that v0.3 plan envelope—even for a copied v0.1 or v0.2 bundle—so an
exact consumer never receives the new `UNVERIFIED_COMPILED_BUNDLE` reason in a
previously published plan schema.

### `createMcpToolCallPlan(bundle, replayCase)`

Returns a provider-neutral MCP `tools/call` plan for an eligible `auto_allow`
action. The function is pure and performs no transport call. Its disposition is
`pass`, `wait`, or `stop`; only `pass` contains an invocation.

Invocation requires the frozen bundle instance returned by
`compileWorkflowDefinition`. A deserialized or copied bundle remains suitable
for read-only replay and inspection, but adapter planning stops with
`UNVERIFIED_COMPILED_BUNDLE` in `workflow_adapter_plan.v0.3`; recompile trusted source in the current process
before producing a tool plan.

### `createOpenAIResponsesRequestPlan(bundle, replayCase, options)`

Returns an offline OpenAI Responses request plan using the caller-supplied
`options.model`. It emits one strict function tool and exact governed arguments
for an eligible action. It does not read an API key or call OpenAI. Only a
`pass` result contains a request.

## Artifact publication and verification

### `writeCompiledWorkflowArtifacts(bundle, outDir, replay?, signing?)`

Writes a complete immutable revision and atomically advances a compiler-owned
public pointer. The optional replay value is the output of `replayWorkflow`; the
optional signing value contains caller-owned Ed25519 key material and a stable
key ID. The output contract rejects unowned directories, unsafe links, and
partial legacy layouts.

### `verifyWorkflowArtifactBundle(directory, options?)`

Independently checks the manifest inventory and every declared SHA-256 digest.
Supplying a trusted public key also requires and verifies the Ed25519
attestation. The returned receipt distinguishes `unsigned`,
`present_unverified`, and `verified` signer states.

### Attestation helpers

`createWorkflowArtifactAttestation`, `parseWorkflowArtifactAttestation`,
`verifyWorkflowArtifactAttestation`, `workflowArtifactManifestHash`, and
`workflowArtifactPublicKeyFingerprint` expose the deterministic signer
boundary for callers that manage their own keys.

## Governed interaction and console

`parseGovernedInteractionBundle` and
`evaluateGovernedInteractionCompatibility` validate the finite, read-only
`governed_interaction_bundle.v0.1`, `governed_interaction_bundle.v0.2`, and
`governed_interaction_bundle.v0.3` IR. Version `v0.2` carries exact-evidence
and substring-matcher fields; v0.3 adds exact-enum matchers from a v0.3
workflow. v0.1 rejects constrained fields. `migrateGovernedInteractionBundle`
validates an existing bundle and returns a detached v0.2 copy without adding
authority or changing a decision. `createOperatorConsoleData` derives the
read-only UI model. `serveOperatorConsole` serves an already compiled bundle;
it does not add execution controls.

`migrateGovernedInteractionBundleToV0_3(input)` makes a detached v0.3 copy;
the v0.2 helper refuses a v0.3 downgrade.

`GovernedInteractionHostContract` supports an optional `schemaVersions`
allowlist alongside its runtime, capability, and operation allowlists. Omission
preserves the legacy public contract and means v0.1-only support. New hosts
must explicitly list every supported schema; a host cannot report another
bundle as compatible unless it lists that exact governed interaction schema
version. The evaluator emits
`governed_interaction_compatibility.v0.2` and otherwise contains
`UNSUPPORTED_SCHEMA_VERSION`. Historical v0.1 compatibility decisions retain
their original error vocabulary, so consumers must discriminate decisions by
`schemaVersion` before reading error codes.

Client Workspace inspection outputs follow the same nesting boundary:
`client_workspace_governed_interaction_inspection.v0.1` contains a v0.1
compatibility decision, while the current inspector emits
`client_workspace_governed_interaction_inspection.v0.2` with a v0.2 decision.
Historical v0.1 inspections can contain only a v0.1 interaction bundle; v0.2
inspections contain v0.1/v0.2 bundles, while v0.3 inspections contain a v0.3
bundle. Do not relabel a retained inspection; branch on its outer
`schemaVersion`.

`createOperatorConsoleData` follows the same correlated-artifact rule. A
v0.1 compiled bundle and replay report produce
`workflow_operator_console.v0.1`; matching v0.2 artifacts produce
`workflow_operator_console.v0.2`; matching v0.3 artifacts produce
`workflow_operator_console.v0.3`. The helper rejects a mismatched bundle and
replay-report schema rather than emitting a misleading console envelope.

## CLI

```text
npx workflow-compiler compile --workflow <definition.json> [--cases <cases.json>] --out <directory> [--signing-key <private.pem> --key-id <id>]
npx workflow-compiler verify --dir <compiled-output> [--public-key <public.pem>]
npx workflow-compiler serve --dir <compiled-output> [--port <number>]
npx workflow-compiler init --template <local-runbook|marketplace-submission> --dir <new-directory>
npx workflow-compiler validate --workflow <definition.json>
npx workflow-compiler simulate --workflow <definition.json> --cases <cases.json>
npx workflow-compiler explain --workflow <definition.json> [--cases <cases.json>]
```

`init` writes either the local-runbook or Marketplace submission-to-review starter only into a new directory and fails before an overwrite. The Marketplace template records source pointers plus sanitized fixtures for form validation, a passing Validator App preflight, a confirmed Airtable handoff with asset/version/review-status evidence, reviewer waiting, and blocked creator messaging; it never calls those systems. Its structured response identifies the working directory for the follow-up commands. `validate` compiles one input for inspection, `simulate` requires at least one replay case, coverage for every declared evaluation, and matching expectations; otherwise it exits non-zero. An evaluation is covered only when a matching replay case proves its action, expected outcome, and required evidence. `explain` renders the resulting decisions as Markdown and explicitly reports whether replay expectations match, including mismatched case IDs. They never call a provider, read credentials, execute a live action, or approve a consequential step. `compile` writes only compiler-managed local artifacts; `verify` and `serve` inspect those artifacts.

Exit codes are stable: `0` success, `2` usage or versioned-input failure, `3`
governance, integrity, or simulation stop, and `1` unexpected operational failure.

## Type inventory

The root export includes definitions for workflow systems, objects, events,
actors, states, actions, transitions, tool parameters, compiled artifacts,
replay cases and receipts, adapter plans, attestation receipts, and governed
interaction host contracts. Treat the generated `.d.ts` files as the exact
type source; this document describes the supported seams rather than
duplicating every structural field.
