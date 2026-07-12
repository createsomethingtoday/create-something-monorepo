# Agents: @create-something/workflow-shadow-pilot

## Agent Entry

- Start with `README.md` for the public runner and shadow boundary.
- Read `.codex/marketplace-workflow-compiler-shadow-pilot/goal.md` and `plan.md` when the durable CRE-1219 experiment context is available.
- Primary entrypoints: `src/index.ts`, `src/run.ts`, `src/operator-console.ts`, and `scripts/acceptance.mjs`.

## Tier Ownership

| Tier | Owns | Does not own |
| --- | --- | --- |
| Database | source and corpus hashes, sanitized generated artifacts, measurement receipts | live marketplace state or private corpus storage |
| Automation | discovery, orchestration, compilation, reconciliation, privacy checks, deterministic output, console generation | live workflow execution or deployment |
| Judgment | fail-closed authority, ambiguity, privacy, approval, escalation, and progression rules | marketplace decisions or production promotion |

## Grounding

- Read `.codex/marketplace-workflow-compiler-shadow-pilot/goal.md` and `plan.md` before changes.
- Keep the private corpus outside git.
- Preserve Workflow Compiler and reconciler ownership; this module only coordinates them.

## Validation

```bash
pnpm --filter @create-something/workflow-shadow-pilot check
pnpm --filter @create-something/workflow-shadow-pilot test
WORKFLOW_PILOT_CORPUS_DIR="/absolute/path/to/authorized-corpus" \
  pnpm --filter @create-something/workflow-shadow-pilot test:acceptance
```

## Escalation

Stop on source drift, private-value emission, sampling failure, attempted ambiguity resolution, external mutation, proposal application, or implied write authority.
