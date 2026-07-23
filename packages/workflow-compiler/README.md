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
  replayWorkflow,
  writeCompiledWorkflowArtifacts
} from '@create-something/workflow-compiler';
```

**Depth:** the interface hides governance validation, reference validation, canonical hashing, artifact linkage, transition replay, fail-closed defaults, evidence receipts, acceptance coverage, console generation, and deterministic file output.

**Runtime ownership:** generated target contracts point to existing owning surfaces. The compiler does not replace Marketplace Submission Cloud, template validation, template-review MCP, Policy OS, Substrate, or Atlas Studio.

## Agent Legibility Contract

| Field               | Value                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry point         | `src/index.ts`, `src/compile.ts`, `src/replay.ts`, `src/artifacts.ts`, `src/cli.ts`                                                                           |
| Boot command        | `pnpm build`                                                                                                                                                  |
| Smoke command       | `pnpm check && pnpm test && pnpm test:acceptance`                                                                                                             |
| Validation surfaces | TypeScript output, node test output, workflow diagnostics, content-hashed manifest, replay report, evidence ledger, acceptance summary                        |
| UI validation path  | Serve the generated `operator-console/` and verify overview, approval-required, blocked, reload, and browser-console states with Playwright                   |
| Escalation rule     | Stop before live mutation or execution controls, and stop when authority, evidence, approval, receipt, recovery, or owning-system boundaries cannot be proven |

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
- 15 content-hashed generated artifacts

The stable local acceptance output defaults to the operating system temporary directory at `cre-1191-workflow-compiler-acceptance`. Override it with `WORKFLOW_COMPILER_ACCEPTANCE_OUT` when needed.

## Shadow-only boundary

This prototype performs no production deploy, external write, Airtable mutation, approval, rejection, publication, credential/access change, or public positioning migration. Historical cases are local representative fixtures. The operator console intentionally has no execution controls.

Promotion would require a separate decision about live evidence adapters, authenticated runtime boundaries, approval execution, rollback, data retention, and Atlas integration.
