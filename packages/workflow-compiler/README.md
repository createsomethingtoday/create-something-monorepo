# Workflow Compiler

`@create-something/workflow-compiler` compiles versioned operating workflows into deterministic local/CI artifacts, replay evidence, provider-neutral MCP plans, offline OpenAI Responses request plans, and a read-only operator console.

It gives builders a composable governance layer below any hosted control plane. The package does not call providers, hold credentials, choose a model, or mutate the systems named by a workflow.

## Codex paired terminal quickstart

Install the builder artifact in the repository where the workflow will live:

```bash
npm install @create-something/workflow-compiler@0.3.1
```

Copy the shipped Codex skill into that repository, then ask Codex to turn a recurring operating task into a runbook. Codex can propose and revise the local files; the terminal commands below remain the deterministic proof surface:

```bash
mkdir -p .codex/skills
cp -R node_modules/@create-something/workflow-compiler/skills/workflow-compiler \
  .codex/skills/workflow-compiler

npx workflow-compiler init --template local-runbook --dir ./ops-runbook
cd ./ops-runbook
npx workflow-compiler validate --workflow workflow.json
npx workflow-compiler simulate --workflow workflow.json --cases cases.json
npx workflow-compiler explain --workflow workflow.json --cases cases.json
```

`init` refuses an existing target directory. The starter gives Codex a local, versioned contract with one permitted step, one operator-approval boundary, and one explicit stop. `validate`, `simulate`, and `explain` make that contract inspectable before a builder connects any external system.

### Marketplace submission-to-review template

Use the second starter when a walkthrough needs to show the complete app-form
and review path: form validation, published-site validation, Validator App
preflight, confirmed Airtable Automation handoff, reviewer wait, and a blocked
creator message.

```bash
npx workflow-compiler init --template marketplace-submission --dir ./marketplace-submission
cd ./marketplace-submission
npx workflow-compiler validate --workflow workflow.json
npx workflow-compiler simulate --workflow workflow.json --cases cases.json
npx workflow-compiler explain --workflow workflow.json --cases cases.json
```

The template generates a source-bound `SOURCES.md`, a runbook, a playbook, and
sanitized replay fixtures. Its “Airtable Automation handoff” requires a
confirmed state, asset, version, and an owning review-ready status receipt; a
webhook receipt alone remains processing evidence. The compiler neither sends a webhook
nor reads Airtable. The source pointers identify the owning repository surfaces;
they are not proof of a live submission, validation, review, or delivery.

This loop does not execute live actions, contact a provider, read credentials, or make an approval decision. A future execution host must supply its own authenticated transport, policy review, result validation, and receipt retention. The package is designed for Codex and OpenAI-compatible workflows, but it is not an official OpenAI partnership, endorsement, certification, or hosted service.

Read the [System Map](./SYSTEM.md) to explain the complete submission path:
what the live Marketplace application owns, what the local terminal workflow
proves, which evidence advances each stage, and where a future authenticated
execution host begins.

## Five-minute quickstart

Install the package with a supported Node release:

```bash
npm install @create-something/workflow-compiler@0.3.1
```

Create `workflow.json` and optionally `cases.json` using the versioned schemas documented in [API.md](./API.md). Compile and independently verify a local bundle:

```bash
npx workflow-compiler compile \
  --workflow ./workflow.json \
  --cases ./cases.json \
  --out ./.workflow-build

npx workflow-compiler verify --dir ./.workflow-build
```

The compiler writes through an atomic managed pointer to an immutable revision. Inspect `acceptance-summary.json`, `replay-report.json`, `tool-contracts.json`, and `operator-console/index.html` before connecting any execution host.

Programmatic use is also offline:

```js
import {
  compileWorkflowDefinition,
  createMcpToolCallPlan,
  replayWorkflow
} from '@create-something/workflow-compiler';

const bundle = compileWorkflowDefinition(workflowJson);
const replay = replayWorkflow(bundle, casesJson);
const plan = createMcpToolCallPlan(bundle, casesJson.cases[0]);

console.log(replay.report.counts, plan.disposition);
```

Start with the shipped software-release fixture under
`node_modules/@create-something/workflow-compiler/fixtures/release-promotion/` or the complete examples in this repository. See [API.md](./API.md), [COMPATIBILITY.md](./COMPATIBILITY.md), and [MIGRATING.md](./MIGRATING.md) before promoting a workflow.

## Module design

**Concept:** workflow-to-runtime compilation.

**Previous caller burden:** understand intake, validation, review MCP, Policy OS, Substrate, Atlas, approval policy, evidence requirements, receipts, replay, and artifact ordering separately.

**Public interface:**

```ts
import {
  compileWorkflowDefinition,
  createMcpToolCallPlan,
  createOpenAIResponsesRequestPlan,
  createNotionCustomAgentBlueprint,
  evaluateNotionCustomAgentInstallation,
  evaluateNotionCustomAgentOperationalReceipts,
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

`governed_interaction_bundle.v0.1`, `governed_interaction_bundle.v0.2`, and `governed_interaction_bundle.v0.3` are versioned JSON intermediate representations for portable, policy-bounded desktop interactions. They are deliberately not a general-purpose programming language. A bundle declares its exact language and runtime version, one or more semantic surfaces, a finite capability inventory, finite local operations, and the compiled authority/evidence/approval/receipt/recovery contract for each workflow action. Version `v0.2` carries exact-evidence and substring-matcher constraints from `workflow_definition.v0.2`; v0.3 adds exact enum matching from `workflow_definition.v0.3`; v0.1 rejects constrained fields rather than ignoring them.

The `create-something/control` runtime currently permits only four read-only capabilities (`workflow.inspect`, `replay.inspect`, `receipt.inspect`, and `interaction.select`) and one local operation (`select_replay_case`). Parsing rejects unknown fields, versions, capabilities, references, duplicate identifiers, executable operations, and incomplete approval ownership. New hosts publish their supported interaction-schema, runtime, capability, and operation contract and receive one normalized compatibility decision; a bundle whose schema is not explicitly listed is incompatible. Existing hosts without an interaction-schema list preserve v0.1-only support. Hosts do not reinterpret workflow authority.

The compiler emits the same content-hashed `governed-interaction.json` for Atlas Studio and Client Workspace. Historical v0.1 inspection envelopes can contain only a v0.1 interaction bundle; v0.2 envelopes report v0.1/v0.2 bundles, and v0.3 envelopes report v0.3 bundles with a v0.2 compatibility receipt. The trusted desktop application contains the interpreter and renderer. A delivery may contain data governed by the IR, but it cannot introduce JavaScript, native plugins, commands, filesystem roots, origins, or ambient environment access.

## Builder adapter plans

The public adapter seam is pure and offline. It evaluates one replay case against the compiled workflow, then either emits a provider-ready plan or preserves the governance stop:

```ts
const mcpPlan = createMcpToolCallPlan(bundle, replayCase);

const openAIPlan = createOpenAIResponsesRequestPlan(bundle, replayCase, {
  model: 'caller-selected-model'
});
```

Both adapters return the same explicit disposition:

- `pass` includes a request or invocation only for an `auto_allow` action with a complete declared tool contract.
- `wait` means authenticated approval or manual execution is still required and includes no executable request. Replay `actorId` and `approvals` strings never make `approval_required` or `manual_only` actions invocable.
- `stop` means policy, evidence, transition, tool-contract, or adapter validation blocked execution and includes no executable request.

Tool parameters are versioned in the workflow definition, type checked, and required to map to governed evidence. A tool target must also appear in the action's `systemsTouched` boundary. The MCP plan names a provider-neutral `tools/call` operation, target system, tool, and arguments; it does not select a transport, endpoint, session, or credential. The OpenAI plan emits the caller-selected `model`, `instructions`, `input`, one strict function tool, forced `tool_choice`, disabled parallel tool calls, and `store: false`; every function parameter has a single allowed value matching the governed argument, and the same canonical map is exposed as `expectedArguments`. It does not call the API or read an API key. This shape follows the official [OpenAI Responses create API](https://developers.openai.com/api/reference/cli/resources/responses/methods/create). A Codex or other OpenAI execution host remains responsible for transport, current model policy, tool-result validation, and receipt persistence.

The adapter never accepts a replay result and a second unbound evidence object. It first detaches one structured-data snapshot, then replays and maps only that copy so caller mutation, getters, proxies, or a second evidence object cannot substitute values during or after the governance decision.

## Notion Custom Agent blueprints

`createNotionCustomAgentBlueprint` is a provider-specific, offline artifact
for the documented Custom Agent delivery boundary. It compiles a workflow agent
into explicit resource access, triggers, and narrow Worker or CREATE SOMETHING
MCP bindings; it retains the compiled action's authority, autonomy, evidence,
receipt, recovery, and scalar tool parameters.

```ts
const blueprint = createNotionCustomAgentBlueprint(bundle, blueprintInput);
const configuration = evaluateNotionCustomAgentInstallation(blueprint, receipt);
const operation = evaluateNotionCustomAgentOperationalReceipts(blueprint, runReceipts);
```

The artifact begins in `wait` until a configuration receipt is supplied.
Configuration scope or tool-contract mismatches stop. A read-only binding waits
for its operational receipt; a write or publish binding stops unless it has a
confirmed tool receipt and mutation receipt for the same run. These helpers make no
Notion request and do not claim that a caller-supplied receipt is authentic or
that an agent is installed. An authorized Notion runtime remains responsible
for manual setup, live configuration readback, activation, execution,
authentication, confirmation, receipt provenance, recovery, and any mutation.
See [API.md](./API.md) for exact schemas and error behavior.

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
npx workflow-compiler compile \
  --workflow workflow.json \
  --out .workflow-build

npx workflow-compiler verify --dir .workflow-build
```

For signer attestation, supply your own Ed25519 private key and a stable key ID. The private key is read for the signing operation and is never copied into the output:

```bash
npx workflow-compiler compile \
  --workflow workflow.json \
  --out .workflow-build \
  --signing-key ./private-ed25519.pem \
  --key-id ci-release-2026

npx workflow-compiler verify \
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

## Execution boundary

The compiler performs no production deploy, external write, approval, rejection, publication, credential change, or provider request. Historical cases are local representative fixtures. The operator console intentionally has no execution controls.

An execution host may consume a `pass` plan only after it supplies its own authenticated transport, validates tool results, and persists receipts. `wait` and `stop` plans never contain an executable request. Live evidence adapters, approval execution, rollback, and data retention remain responsibilities of the owning runtime and policy artifacts.
