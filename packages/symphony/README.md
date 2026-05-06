# @create-something/symphony

Linear-backed orchestration runtime for Codex workers.

Symphony watches a workflow definition, queries Linear for ready work, creates isolated workspaces, starts Codex-backed workers, and reports progress back to the tracker. It is the repo-local automation loop behind commands such as:

```bash
pnpm symphony:code-quality
pnpm symphony:code-quality:once
pnpm symphony:policy
```

## Core Flow

1. Load a workflow file from `automation/symphony/**/WORKFLOW.md`.
2. Validate dispatch config from the workflow frontmatter.
3. Query Linear through the tracker client.
4. Prepare or reuse an isolated workspace.
5. Start an agent worker and stream status events.
6. Mark terminal work and clean up workspaces according to policy.

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `packages/symphony/src/cli.js`, `packages/symphony/src/orchestrator.js`, `packages/symphony/src/tracker/linear.js` |
| Boot command | `node src/cli.js ../../automation/symphony/code-quality/WORKFLOW.md --once` |
| Smoke command | `pnpm check && pnpm test` |
| Validation surfaces | node syntax check output, node test output, Linear tracker events, worker workspace metadata |
| UI validation path | none |
| Escalation rule | stop if Linear issue state, workspace cleanup behavior, or Codex worker status cannot be reconciled with the workflow file and tracker evidence |

## Development

```bash
pnpm --filter @create-something/symphony check
pnpm --filter @create-something/symphony test
```

Run a workflow once from the repo root:

```bash
pnpm symphony:code-quality:once
```

Use Infisical for Linear credentials when running against live work:

```bash
infisical run --env=prod --path=/ --include-imports=true -- pnpm symphony:code-quality:once
```
