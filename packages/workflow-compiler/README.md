# Workflow Compiler

`@create-something/workflow-compiler` is a bounded prototype for compiling one versioned operating workflow into governed runtime contracts, replay evidence, and an operator-readable console.

It answers the CRE-1191 experiment:

> Can CREATE SOMETHING turn a workflow it already understands into a deterministic, governed system bundle without rebuilding or bypassing the systems that own live state and execution?

The first vertical is the Webflow Marketplace template lifecycle: submission, validation, review, approval, publishing, and post-launch monitoring.

The CREATE SOMETHING internal-delivery fixture is the canonical reference
mission behind the Performance Lab identity. It composes Linear, the agent
harness, repository checks, promotion authority, live verification, recovery,
and Canon lessons without claiming ownership of those runtimes.

## Module design

**Concept:** workflow-to-runtime compilation.

**Previous caller burden:** understand intake, validation, review MCP, Policy OS, Substrate, Atlas, approval policy, evidence requirements, receipts, replay, and artifact ordering separately.

**Public interface:**

```ts
import {
  compileWorkflowDefinition,
  evaluateGovernedInteractionCompatibility,
  parseGovernedInteractionBundle,
  replayWorkflow,
  writeCompiledWorkflowArtifacts
} from '@create-something/workflow-compiler';
```

**Depth:** the interface hides governance validation, reference validation, canonical hashing, artifact linkage, transition replay, fail-closed defaults, evidence receipts, acceptance coverage, console generation, and deterministic file output.

**Runtime ownership:** generated target contracts point to existing owning surfaces. The compiler does not replace Marketplace Submission Cloud, template validation, template-review MCP, Policy OS, Substrate, or Atlas Studio.

## Governed interaction IR

`governed_interaction_bundle.v0.1` is a versioned JSON intermediate representation for portable, policy-bounded desktop interactions. It is deliberately not a general-purpose programming language. A bundle declares its exact language and runtime version, one or more semantic surfaces, a finite capability inventory, finite local operations, and the compiled authority/evidence/approval/receipt/recovery contract for each workflow action.

The `create-something/control` runtime currently permits only four read-only capabilities (`workflow.inspect`, `replay.inspect`, `receipt.inspect`, and `interaction.select`) and one local operation (`select_replay_case`). Parsing rejects unknown fields, versions, capabilities, references, duplicate identifiers, executable operations, and incomplete approval ownership. Hosts publish their supported runtime/capability/operation contract and receive one normalized compatibility decision; they do not reinterpret workflow authority.

The compiler emits the same content-hashed `governed-interaction.json` for Atlas Studio and Client Workspace. The trusted desktop application contains the interpreter and renderer. A delivery may contain data governed by the IR, but it cannot introduce JavaScript, native plugins, commands, filesystem roots, origins, or ambient environment access.

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

Serve the generated read-only console:

```bash
node packages/workflow-compiler/dist/cli.js serve \
  --dir /tmp/marketplace-workflow-compiler \
  --port 4173
```

Compile the internal-delivery reference mission:

```bash
node packages/workflow-compiler/dist/cli.js compile \
  --workflow packages/workflow-compiler/fixtures/internal-delivery/workflow.json \
  --cases packages/workflow-compiler/fixtures/internal-delivery/cases.json \
  --out /tmp/create-something-reference-mission
```

Its identity invariants, state translations, receipt envelope, public
projection, and agent extension declaration live beside the fixture in
`fixtures/internal-delivery/identity.json` and are documented in
`docs/CREATE_SOMETHING_REFERENCE_MISSION.md`.

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
