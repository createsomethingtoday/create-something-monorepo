# Template Review Remote Smoke Artifact Comparison Validation - 2026-04-25

Scope: extend the new `webflow-template-review-mcp` production smoke so it can persist structured artifacts and compare recent runs, then validate the full operator loop against the live production worker.

## Changes

- Extended [scripts/smoke-remote-worker.ts](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-template-review-mcp/scripts/smoke-remote-worker.ts) with:
  - timing telemetry
  - `--output`
  - `--output-dir`
  - optional JSON artifact output including `artifactPath`
- Added [scripts/compare-remote-smoke-runs.ts](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-template-review-mcp/scripts/compare-remote-smoke-runs.ts).
- Added `compare:remote-smoke` to [package.json](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-template-review-mcp/package.json).
- Updated [README.md](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-template-review-mcp/README.md) with artifact and compare commands.

## Commands run

```bash
pnpm --dir packages/webflow-template-review-mcp typecheck
pnpm --dir packages/webflow-template-review-mcp test
infisical run --env=prod --path=/ -- \
  pnpm --dir packages/webflow-template-review-mcp smoke:remote \
  --output-dir packages/webflow-template-review-mcp/reports/remote-smoke-runs \
  --json
infisical run --env=prod --path=/ -- \
  pnpm --dir packages/webflow-template-review-mcp smoke:remote \
  --output-dir packages/webflow-template-review-mcp/reports/remote-smoke-runs \
  --json
pnpm --dir packages/webflow-template-review-mcp compare:remote-smoke
git diff --check
```

## Results

- `typecheck`: passed
- `test`: passed (`25` tests, `0` failed)
- first `smoke:remote`: passed
- second `smoke:remote`: passed
- `compare:remote-smoke`: passed
- `git diff --check`: passed

Artifacts written:

- [remote-smoke-2026-04-25-050451290Z.json](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-template-review-mcp/reports/remote-smoke-runs/remote-smoke-2026-04-25-050451290Z.json)
- [remote-smoke-2026-04-25-050500920Z.json](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-template-review-mcp/reports/remote-smoke-runs/remote-smoke-2026-04-25-050500920Z.json)

Comparison summary:

```text
[compare-template-review-smoke] 2026-04-25T05:04:51.290Z -> 2026-04-25T05:05:00.920Z
  total: 2070ms -> 2225ms (+155ms)
  health: 172ms -> 532ms (+360ms)
  initialize: 767ms -> 710ms (-57ms)
  tool health: 923ms -> 767ms (-156ms)
  prompt fetch: 55ms -> 58ms (+3ms)
```

Both artifacts preserved the expected correctness signals:

- prompt title matched `# Webflow Template Review — Reviewer Workflow Guide`
- published-first wording present
- gated publishing wording present
- analyzer reachable
- analyzer browser automation supported

## Outcome

The template-review worker now has the same practical operator loop as the analyzer worker:

1. run live smoke
2. persist an artifact
3. compare drift across runs

This makes future production verification cheaper and avoids repeating ad hoc MCP session-handshake debugging.
