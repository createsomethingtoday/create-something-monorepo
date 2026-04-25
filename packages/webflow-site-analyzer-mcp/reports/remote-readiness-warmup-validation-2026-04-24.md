# Remote Readiness Warm-up Validation — 2026-04-24

Scope: remove the “first real caller pays the cold-start tax” behavior from the container-backed remote analyzer deploy flow by adding an explicit post-deploy readiness warm-up and validation step.

## Changes

- Added [ready-remote-runtime.mjs](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-site-analyzer-mcp/scripts/ready-remote-runtime.mjs):
  - derives the deployed worker URL from `workers/remote/wrangler.jsonc`
  - polls `/health` until the remote container is answering
  - verifies `templateReview.browserAutomationSupported=true`
  - best-effort resolves the MCP auth token from env or Infisical
  - calls `get_provider_status` when a token is available
  - fails if the active provider reports unhealthy
- Added `pnpm --dir packages/webflow-site-analyzer-mcp/workers/remote run ready`.
- Updated the remote `deploy` script so it now runs:
  - `prepare:runtime`
  - Wrangler deploy
  - readiness warm-up

## Local Verification

- Standalone readiness command:

```bash
pnpm --dir packages/webflow-site-analyzer-mcp/workers/remote run ready -- --json
```

Observed result:

- `ready=true`
- `elapsedMs=2766`
- `/health` succeeded on attempt `1` in `632ms`
- `get_provider_status` succeeded in `267ms`
- token source: `infisical:WEBFLOW_SITE_ANALYZER_MCP_API_KEY@prod`
- active provider: `steel`
- `isHealthy=true`

## Deployment

- Deploy command:

```bash
pnpm run deploy:webflow-site-analyzer-mcp-remote
```

- Deployed version: `16a63d61-138a-441c-8893-463c046fb37e`

Observed post-deploy readiness output:

- readiness ran automatically after Wrangler finished
- remote analyzer ready in `2991ms`
- `/health` succeeded in `722ms`
- `get_provider_status` succeeded in `355ms`
- active provider: `steel`
- `isHealthy=true`

## Live Validation: Immediate Post-deploy Smoke

Invocation:

- Tool: `run_template_review`
- Args:
  - `publishedUrl=https://athelas-template.webflow.io/`
  - `designerMode=skip`
  - `crawlMaxPages=1`
  - `crawlMaxDepth=0`
  - `timeout=30000`

Observed result immediately after the warmed deploy:

- `isError=false`
- `durationMs=33465`
- `overallScore=67`
- `grade=C`

## Notes

- The readiness step is intentionally cheap. It warms the container and validates the MCP lane without turning deploy into a full template review.
- This does not remove all remote startup latency, but it shifts the cold-start work into the deploy path instead of leaving it to the first real reviewer call.
