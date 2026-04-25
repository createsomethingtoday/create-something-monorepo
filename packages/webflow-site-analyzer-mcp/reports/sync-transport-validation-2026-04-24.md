# Sync Transport Validation — 2026-04-24

Scope: tighten the remote `run_template_review` experience so bounded synchronous smoke checks still work, while longer reviews fail fast with an explicit async recommendation instead of appearing to hang. Also add end-to-end duration telemetry to async review jobs.

## Changes

- Added end-to-end `durationMs` to:
  - synchronous `run_template_review` reports
  - async template review job records
  - async job result payloads
- Tagged the remote container deployment runtime as `container-worker` so the analyzer can distinguish:
  - direct/local Node execution
  - direct Worker execution
  - container-backed remote Worker execution
- Added a bounded-sync guard for remote deployments:
  - allow synchronous review only for small smoke checks by default
  - reject longer requests with a clear `enqueue_template_review` recommendation
  - allow an explicit override via `allowLongSync=true`

## Local Verification

- `pnpm --dir packages/webflow-site-analyzer-mcp test` passed.
- `git diff --check` passed.

## Deployment

- Fresh worker URL: `https://webflow-site-analyzer-mcp-remote.createsomething.workers.dev/mcp`
- Deployed version: `205d659d-c5d7-4103-806a-9904e366ece7`

## Live Validation: Athelas

Warm-up:

- `GET /health` returned normally after deploy.
- `get_provider_status` returned normally once the container was warm.

### 1. Bounded synchronous smoke succeeds

Invocation:

- Tool: `run_template_review`
- Args:
  - `publishedUrl=https://athelas-template.webflow.io/`
  - `designerMode=skip`
  - `crawlMaxPages=1`
  - `crawlMaxDepth=0`
  - `timeout=30000`

Observed result:

- `isError=false`
- `durationMs=31539`
- Summary:
  - `overallScore=67`
  - `grade=C`
  - `crawledPages=1`

### 2. Longer synchronous request fails fast with guidance

Invocation:

- Tool: `run_template_review`
- Args:
  - `publishedUrl=https://athelas-template.webflow.io/`
  - `designerMode=skip`
  - `crawlMaxPages=3`
  - `crawlMaxDepth=1`
  - `timeout=120000`

Observed result:

- `isError=true`
- Error text:
  - sync review is reserved for bounded smoke checks on the remote deployment
  - the request is likely to outlive the synchronous transport
  - callers should use `enqueue_template_review` + `get_template_review_job`
  - callers can still force the sync path with `allowLongSync=true`

### 3. Async review returns duration telemetry

Invocation:

- Tool path: `enqueue_template_review` -> `get_template_review_job`
- Job: `template-review-1777074063676-63a6s8`
- Args:
  - `publishedUrl=https://athelas-template.webflow.io/`
  - `designerMode=skip`
  - `crawlMaxPages=3`
  - `crawlMaxDepth=1`
  - `timeout=120000`

Observed result:

- `status=succeeded`
- `durationMs=34446`
- `result.durationMs=34446`
- `progress.phase=completed`

## Notes

- Immediately after deploy, one first-hit bounded sync request timed out with zero bytes while the remote container was still cold. After a health warm-up, the bounded sync and async validation calls behaved normally.
- The current product split is now explicit:
  - `run_template_review` is the bounded smoke/debug path
  - `enqueue_template_review` is the reliable path for deeper remote reviews
- This improves operator confidence without pretending the remote transport can make longer browser-backed reviews cheap.
