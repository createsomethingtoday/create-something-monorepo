# Agents: @create-something/workflow-compiler

This package is the public local/CI workflow-to-runtime compiler. CRE-1191 is
the original prototype; the production and publication map is CRE-1831.

## Agent Entry

- Start with `README.md` for the execution boundary and public interface.
- Read `.codex/marketplace-workflow-compiler/goal.md` and `plan.md` from the CRE-1191 worktree when the durable experiment context is available.
- Primary entrypoints: `src/index.ts`, `src/compile.ts`, `src/replay.ts`, `src/artifacts.ts`, and `src/cli.ts`.

## Ownership

| Tier       | This package owns                                                                                                | This package does not own                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Database   | Versioned workflow/case fixtures and deterministic generated artifact shapes                                     | Airtable, Substrate, or other live source records                                         |
| Automation | Compilation, artifact writing, historical replay, acceptance verification, console generation, and local serving | Marketplace intake, validation workers, reviewer MCP execution, or Atlas runtime behavior |
| Judgment   | Validation of authority, autonomy, evidence, approval, receipt, and recovery contracts                           | Live approval, rejection, publication, credential, or access decisions                    |

## Rules

- Keep `compileWorkflowDefinition` and `replayWorkflow` as the small caller-facing seam.
- Derive all generated artifacts and console data from the versioned workflow definition and replay manifest.
- Fail closed on unknown references, missing consequential governance, unknown actions, invalid transitions, and insufficient evidence.
- Keep output deterministic. Do not introduce timestamps, random IDs, or ambient environment values into compiled artifacts.
- Never weaken fixtures, expected outcomes, governance diagnostics, or acceptance coverage to make a run pass.
- The generated console is read-only. Do not add action controls without a separately approved production runtime and authorization design.
- Do not mutate Airtable, Webflow, Substrate, Atlas, Policy OS, credentials, or production infrastructure from package tests or acceptance scripts.

## Validation

```bash
pnpm --filter @create-something/workflow-compiler check
pnpm --filter @create-something/workflow-compiler test
pnpm --filter @create-something/workflow-compiler test:acceptance
npm --prefix packages/workflow-compiler run release:consumer
pnpm exports @create-something/workflow-compiler
git diff --check
```

Public promotion additionally requires the Node 22/24 matrix in
`.github/workflows/workflow-compiler-public-release.yml`, exact equality with
`package-files.json`, a committed package-local npm lock consumed only through
`npm ci`, protected `main`, and the staged npm approval path in `RELEASING.md`.
Never replace staged publishing with direct CI publication.

Add behavior one public-interface slice at a time: failing check, minimal implementation, green check, then refactor.

Escalate if a requested change would add live execution controls, weaken fail-closed behavior, introduce nondeterministic output, or mutate an owning system outside this package.
