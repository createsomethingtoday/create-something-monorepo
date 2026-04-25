# Remote Smoke Script Validation — 2026-04-24

Scope: codify the warmed remote analyzer smoke workflow into a reusable script so lane validation no longer depends on manual curl sequences.

## Changes

- Added [smoke-remote-runtime.mjs](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-site-analyzer-mcp/scripts/smoke-remote-runtime.mjs).
- Added `pnpm --dir packages/webflow-site-analyzer-mcp/workers/remote run smoke`.
- Added optional artifact persistence via `--output <path>` and `--output-dir <path>`.
- Updated [workers/remote/package.json](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-site-analyzer-mcp/workers/remote/package.json) and [README.md](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-site-analyzer-mcp/README.md).

Script behavior:

- runs the readiness warm-up first unless `--skip-ready` is passed
- defaults to `https://athelas-template.webflow.io/`
- runs a bounded synchronous `run_template_review`
- optionally verifies:
  - the long-sync bounded-smoke guard
  - the async job path and `durationMs` telemetry
- can write the full JSON result to disk for deploy-over-deploy comparison

## Local Verification

- `node --check packages/webflow-site-analyzer-mcp/scripts/ready-remote-runtime.mjs`
- `node --check packages/webflow-site-analyzer-mcp/scripts/smoke-remote-runtime.mjs`
- `git diff --check`

## Live Validation

Command:

```bash
pnpm --dir packages/webflow-site-analyzer-mcp/workers/remote run smoke -- --check-sync-guard --check-async-job --json
```

Observed result:

- total elapsed: `38867ms`
- published URL: `https://athelas-template.webflow.io/`
- token source: `infisical:WEBFLOW_SITE_ANALYZER_MCP_API_KEY@prod`

Readiness:

- `ready=true`
- `elapsedMs=4243`
- health attempt `1`
- health elapsed `2839ms`
- provider check elapsed `297ms`
- active provider `steel`
- `isHealthy=true`

Bounded sync smoke:

- `durationMs=34108`
- `overallScore=67`
- `grade=C`
- `crawledPages=1`
- `coveragePercent=4`

Sync guard:

- `isError=true`
- `matchedGuardMessage=true`
- returned the expected remote bounded-smoke guidance for:
  - `crawlMaxPages=3`
  - `crawlMaxDepth=1`
  - `timeout=120000`

Async job:

- `jobId=template-review-1777074980859-c6vn3n`
- `status=succeeded`
- `durationMs=38349`
- `resultDurationMs=38349`

## Artifact Validation

Command:

```bash
pnpm --dir packages/webflow-site-analyzer-mcp/workers/remote run smoke -- --check-sync-guard --check-async-job --output-dir packages/webflow-site-analyzer-mcp/reports/remote-smoke-runs --json
```

Observed result:

- total elapsed: `43188ms`
- readiness elapsed `2724ms`
- bounded sync `durationMs=39847`
- async job `template-review-1777076530417-kcbplp` succeeded with `durationMs=48735`
- artifact written to:
  - [remote-smoke-2026-04-25-002209692Z.json](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-site-analyzer-mcp/reports/remote-smoke-runs/remote-smoke-2026-04-25-002209692Z.json)

## Notes

- This script is intentionally separate from the automatic `deploy` flow.
- `ready` remains the cheap post-deploy warm-up.
- `smoke` is the reusable deeper validation surface when operator confidence matters more than deploy speed.
