# API reference

`@create-something/workflow-compiler` is an ESM-only package. All public
functions are exported from the package root. Generated TypeScript declarations
are included in the npm tarball.

## Compile and parse

### `compileWorkflowDefinition(input)`

Parses one `workflow_definition.v0.1` value, validates every reference and
consequential governance boundary, and returns a deterministic
`CompiledWorkflowBundle`. It throws `WorkflowInputValidationError` for input
shape errors and `WorkflowCompilationError` for invalid workflow semantics.

### `parseWorkflowDefinition(input)`

Validates and normalizes a workflow definition without compiling artifacts.
Unknown properties, schema versions, duplicate IDs, unsafe references, and
invalid authority assignments fail closed.

### `parseWorkflowReplayManifest(input)`

Validates one `workflow_replay_manifest.v0.1` value. Replay workflow IDs must
match the compiled definition.

## Replay and adapter planning

### `replayWorkflow(bundle, replayManifest)`

Evaluates all replay cases against a compiled bundle and returns a replay
report, evidence ledger, receipts, and acceptance summary. Historical actor and
approval strings do not authenticate a live consequential action.

### `createMcpToolCallPlan(bundle, replayCase)`

Returns a provider-neutral MCP `tools/call` plan for an eligible `auto_allow`
action. The function is pure and performs no transport call. Its disposition is
`pass`, `wait`, or `stop`; only `pass` contains an invocation.

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
`governed_interaction_bundle.v0.1` IR. `createOperatorConsoleData` derives the
read-only UI model. `serveOperatorConsole` serves an already compiled bundle;
it does not add execution controls.

## CLI

```text
workflow-compiler compile --workflow <definition.json> [--cases <cases.json>] --out <directory> [--signing-key <private.pem> --key-id <id>]
workflow-compiler verify --dir <compiled-output> [--public-key <public.pem>]
workflow-compiler serve --dir <compiled-output> [--port <number>]
workflow-compiler init --template local-runbook --dir <new-directory>
workflow-compiler validate --workflow <definition.json>
workflow-compiler simulate --workflow <definition.json> --cases <cases.json>
workflow-compiler explain --workflow <definition.json> [--cases <cases.json>]
```

`init` writes the fixed local-runbook starter only into a new directory and fails before an overwrite. Its structured response identifies the working directory for the follow-up commands. `validate` compiles one input for inspection, `simulate` requires at least one replay case and exits non-zero when an expectation is unmet, and `explain` renders the resulting decisions as Markdown. They never call a provider, read credentials, execute a live action, or approve a consequential step. `compile` writes only compiler-managed local artifacts; `verify` and `serve` inspect those artifacts.

Exit codes are stable: `0` success, `2` usage or versioned-input failure, `3`
governance, integrity, or simulation stop, and `1` unexpected operational failure.

## Type inventory

The root export includes definitions for workflow systems, objects, events,
actors, states, actions, transitions, tool parameters, compiled artifacts,
replay cases and receipts, adapter plans, attestation receipts, and governed
interaction host contracts. Treat the generated `.d.ts` files as the exact
type source; this document describes the supported seams rather than
duplicating every structural field.
