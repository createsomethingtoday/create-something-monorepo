# Remote Smoke Comparison Validation — 2026-04-25

Scope: validate a small comparator for persisted remote analyzer smoke artifacts so deploy-over-deploy drift can be read from one command instead of opening multiple JSON files by hand.

## Changes

- Added [compare-remote-smoke-runs.mjs](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-site-analyzer-mcp/scripts/compare-remote-smoke-runs.mjs).
- Added `pnpm --dir packages/webflow-site-analyzer-mcp/workers/remote run compare-smoke`.
- Updated [workers/remote/package.json](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-site-analyzer-mcp/workers/remote/package.json) and [README.md](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-site-analyzer-mcp/README.md).

Script behavior:

- compares the latest two JSON artifacts in `packages/webflow-site-analyzer-mcp/reports/remote-smoke-runs/` by default
- supports explicit `--base` / `--compare` overrides
- reports deltas for:
  - readiness
  - health check
  - provider check
  - bounded sync duration
  - score / coverage
  - async duration

## Local Verification

- `node --check packages/webflow-site-analyzer-mcp/scripts/compare-remote-smoke-runs.mjs`
- `git diff --check`

## Live Validation

Second artifact generation:

```bash
pnpm --dir packages/webflow-site-analyzer-mcp/workers/remote run smoke -- --check-sync-guard --check-async-job --output-dir packages/webflow-site-analyzer-mcp/reports/remote-smoke-runs --json
```

Produced:

- [remote-smoke-2026-04-25-013032336Z.json](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-site-analyzer-mcp/reports/remote-smoke-runs/remote-smoke-2026-04-25-013032336Z.json)

Comparison command:

```bash
pnpm --dir packages/webflow-site-analyzer-mcp/workers/remote run compare-smoke -- --json
```

Compared artifacts:

- base:
  - [remote-smoke-2026-04-25-002209692Z.json](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-site-analyzer-mcp/reports/remote-smoke-runs/remote-smoke-2026-04-25-002209692Z.json)
- current:
  - [remote-smoke-2026-04-25-013032336Z.json](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-site-analyzer-mcp/reports/remote-smoke-runs/remote-smoke-2026-04-25-013032336Z.json)

Observed deltas:

- readiness: `2724ms -> 2378ms` (`-346ms`)
- health: `707ms -> 498ms` (`-209ms`)
- provider check: `439ms -> 367ms` (`-72ms`)
- bounded sync: `39847ms -> 36088ms` (`-3759ms`)
- overall score: `67 -> 67`
- coverage percent: `4% -> 4%`
- async duration: `48735ms -> 40729ms` (`-8006ms`)

## Notes

- This closes the loop on persisted smoke artifacts: the lane now has a reusable way to generate, retain, and compare live MCP validation runs.
- The comparator is intentionally focused on operator-facing drift, not reviewer-facing rubric output.
