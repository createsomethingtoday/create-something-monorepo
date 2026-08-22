# Workflow Compiler

`@create-something/workflow-compiler` is a bounded prototype for compiling one versioned operating workflow into governed runtime contracts, replay evidence, and an operator-readable console.

It answers the CRE-1191 experiment:

> Can CREATE SOMETHING turn a workflow it already understands into a deterministic, governed system bundle without rebuilding or bypassing the systems that own live state and execution?

The first vertical is the Webflow Marketplace template lifecycle: submission, validation, review, approval, publishing, and post-launch monitoring.

## Module design

**Concept:** workflow-to-runtime compilation.

**Previous caller burden:** understand intake, validation, review MCP, Policy OS, Substrate, Atlas, approval policy, evidence requirements, receipts, replay, and artifact ordering separately.

**Public interface:**

```ts
import {
  compileWorkflowDefinition,
  createMcpToolCallPlan,
  createOpenAIResponsesRequestPlan,
  evaluateGovernedInteractionCompatibility,
  parseGovernedInteractionBundle,
  replayWorkflow,
  verifyWorkflowArtifactBundle,
  writeCompiledWorkflowArtifacts
} from '@create-something/workflow-compiler';
```

**Depth:** the interface hides governance validation, reference validation, canonical hashing, artifact linkage, transition replay, fail-closed defaults, evidence receipts, acceptance coverage, console generation, and deterministic file output.

**Runtime ownership:** generated target contracts point to existing owning surfaces. The compiler does not replace Marketplace Submission Cloud, template validation, template-review MCP, Policy OS, Substrate, or Atlas Studio.

## Governed interaction IR

`governed_interaction_bundle.v0.1` is a versioned JSON intermediate representation for portable, policy-bounded desktop interactions. It is deliberately not a general-purpose programming language. A bundle declares its exact language and runtime version, one or more semantic surfaces, a finite capability inventory, finite local operations, and the compiled authority/evidence/approval/receipt/recovery contract for each workflow action.

The `create-something/control` runtime currently permits only four read-only capabilities (`workflow.inspect`, `replay.inspect`, `receipt.inspect`, and `interaction.select`) and one local operation (`select_replay_case`). Parsing rejects unknown fields, versions, capabilities, references, duplicate identifiers, executable operations, and incomplete approval ownership. Hosts publish their supported runtime/capability/operation contract and receive one normalized compatibility decision; they do not reinterpret workflow authority.

The compiler emits the same content-hashed `governed-interaction.json` for Atlas Studio and Client Workspace. The trusted desktop application contains the interpreter and renderer. A delivery may contain data governed by the IR, but it cannot introduce JavaScript, native plugins, commands, filesystem roots, origins, or ambient environment access.

## Builder adapter plans

The public adapter seam is pure and offline. It evaluates one replay case against the compiled workflow, then either emits a provider-ready plan or preserves the governance stop:

```ts
const mcpPlan = createMcpToolCallPlan(bundle, replayCase);

const openAIPlan = createOpenAIResponsesRequestPlan(bundle, replayCase, {
  model: 'caller-selected-model'
});
```

Both adapters return the same explicit disposition:

- `pass` includes a request or invocation that the caller may execute.
- `wait` means approval is still required and includes no executable request.
- `stop` means policy, evidence, transition, tool-contract, or adapter validation blocked execution and includes no executable request.

Tool parameters are versioned in the workflow definition, type checked, and required to map to governed evidence. The MCP plan names a provider-neutral `tools/call` operation, target system, tool, and arguments; it does not select a transport, endpoint, session, or credential. The OpenAI plan emits the caller-selected `model`, `instructions`, `input`, one strict function tool, forced `tool_choice`, disabled parallel tool calls, and `store: false`; it does not call the API or read an API key. This shape follows the official [OpenAI Responses create API](https://developers.openai.com/api/reference/cli/resources/responses/methods/create). A Codex or other OpenAI execution host remains responsible for transport, current model policy, tool-result handling, and receipt persistence.

The adapter never accepts a replay result and a second unbound evidence object. It replays the exact input it maps so evidence values cannot be substituted after the governance decision.

## Agent Legibility Contract

<!-- prettier-ignore -->
| Field | Value |
| --- | --- |
| Entry point | `src/index.ts`, `src/compile.ts`, `src/replay.ts`, `src/artifacts.ts`, `src/cli.ts` |
| Boot command | `pnpm build` |
| Smoke command | `pnpm check && pnpm test && pnpm test:acceptance` |
| Validation surfaces | TypeScript output, node test output, workflow diagnostics, content-hashed manifest, replay report, evidence ledger, acceptance summary |
| UI validation path | Serve the generated `operator-console/` and verify overview, approval-required, blocked, reload, and browser-console states with Playwright |
| Escalation rule | Stop before live mutation or execution controls, and stop when authority, evidence, approval, receipt, recovery, or owning-system boundaries cannot be proven |

## Compile the marketplace fixture

```bash
pnpm --filter @create-something/workflow-compiler build

node packages/workflow-compiler/dist/cli.js compile \
  --workflow packages/workflow-compiler/fixtures/marketplace/workflow.json \
  --cases packages/workflow-compiler/fixtures/marketplace/cases.json \
  --out /tmp/marketplace-workflow-compiler
```

The output includes:

- compiled workflow and workflow map
- runtime target inventory
- object and event schemas
- decision inventory and autonomy classifications
- tool and agent contracts
- approval surfaces
- evaluation manifest
- replay report
- evidence ledger
- acceptance summary
- generated operator console
- governed-interaction bundle
- content-hashed artifact manifest

The second fixture proves that the contract composes beyond Webflow. It models software release verification, human-owned production promotion, and a blocked policy bypass:

```bash
node packages/workflow-compiler/dist/cli.js compile \
  --workflow packages/workflow-compiler/fixtures/release-promotion/workflow.json \
  --cases packages/workflow-compiler/fixtures/release-promotion/cases.json \
  --out /tmp/release-promotion-workflow-compiler
```

The output path is a compiler-managed symbolic link to an immutable sibling revision. Recompilation writes and validates a complete new revision before one atomic pointer rename, so concurrent readers see either the previous bundle or the new bundle and a terminated compiler cannot strand the public path between two directory renames. The compiler retains published revisions under `.<output-name>.workflow-compiler/` so one concurrent publisher can never garbage-collect another publisher's winning revision; remove that control directory together with the output pointer only when no compiler or reader is active. A versioned owner-only marker binds that control directory to the resolved output path, and an unmarked or differently bound directory is rejected. The sole migration exception is a pre-marker output whose existing public symlink, real revisions directory, direct immutable revision, complete manifest shape, required base artifacts, listed content hashes, and bundle identity already prove the prior compiler relationship; the compiler then creates the marker exclusively before continuing. Compiler control directories preserve required read/traversal access but never inherit group or world write authority. New artifact files and directories receive deterministic `0644` and `0755` modes; recompilation preserves explicit per-artifact mode adjustments from the published revision instead of inheriting the caller's current umask. The compiler rejects unrelated links, non-empty unowned directories, and legacy direct-directory outputs instead of migrating them through a non-atomic window.

## Integrity and local attestation

Compile an unsigned bundle when content integrity is sufficient:

```bash
workflow-compiler compile \
  --workflow workflow.json \
  --out .workflow-build

workflow-compiler verify --dir .workflow-build
```

For signer attestation, supply your own Ed25519 private key and a stable key ID. The private key is read for the signing operation and is never copied into the output:

```bash
workflow-compiler compile \
  --workflow workflow.json \
  --out .workflow-build \
  --signing-key ./private-ed25519.pem \
  --key-id ci-release-2026

workflow-compiler verify \
  --dir .workflow-build \
  --public-key ./trusted-public-ed25519.pem
```

The manifest is the deterministic integrity inventory. `attestation.json` is a non-circular sidecar whose signature binds the schema, algorithm, key ID, public-key fingerprint, and canonical manifest hash; the manifest in turn contains every artifact hash. Verification receipts are byte-identical for identical content and trust inputs and report one explicit attestation state: `unsigned`, `present_unverified`, or `verified`. Unsigned or untrusted-key checks report top-level `integrity_verified`; only a trusted-key signature reports top-level `verified`. A supplied public key makes the attestation mandatory; missing, malformed, wrong-key, manifest-mismatched, or invalid signatures stop with exit code 3. CLI usage or key-format errors exit 2, unexpected operational failures exit 1, and successful verification exits 0.

A digest alone is never described as an attestation. See [THREAT_MODEL.md](./THREAT_MODEL.md) for trust assumptions, limits, and non-goals.

Serve the generated read-only console:

```bash
node packages/workflow-compiler/dist/cli.js serve \
  --dir /tmp/marketplace-workflow-compiler \
  --port 4173
```

## Acceptance verifier

```bash
pnpm --filter @create-something/workflow-compiler test:acceptance
```

The verifier runs the public CLI twice from clean directories and rejects byte differences. It also requires:

- passing, approval-required, and blocked outcomes
- explicit insufficient-evidence coverage
- explicit unknown-action coverage
- complete consequential governance
- matching expected and observed historical outcomes
- 18 content-hashed generated artifacts, including a strict-CSP-compatible console split into semantic HTML, CSS, trusted module code, and data

The stable local acceptance output defaults to the operating system temporary directory at `cre-1191-workflow-compiler-acceptance`. Override it with `WORKFLOW_COMPILER_ACCEPTANCE_OUT` when needed.

## Shadow-only boundary

This prototype performs no production deploy, external write, Airtable mutation, approval, rejection, publication, credential/access change, or public positioning migration. Historical cases are local representative fixtures. The operator console intentionally has no execution controls.

Promotion would require a separate decision about live evidence adapters, authenticated runtime boundaries, approval execution, rollback, data retention, and Atlas integration.
