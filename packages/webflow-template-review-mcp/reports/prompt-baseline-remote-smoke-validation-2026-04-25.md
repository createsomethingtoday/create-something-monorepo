# Template Review Prompt Baseline Remote Smoke Validation - 2026-04-25

Scope: add a repeatable production smoke path for `webflow-template-review-mcp`, verify the current production worker after the prompt-baseline deploy, and record the MCP HTTP session requirement so future operator checks use the correct transport shape.

## Changes

- Added a package-owned remote smoke script in [scripts/smoke-remote-worker.ts](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-template-review-mcp/scripts/smoke-remote-worker.ts).
- Added `smoke:remote` to [package.json](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-template-review-mcp/package.json).
- Documented the command in [README.md](/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/template-analyzer-mcp-tool-0lniq/packages/webflow-template-review-mcp/README.md).

## Production deploy under validation

- Worker URL: `https://webflow-template-review-mcp.createsomething.workers.dev/mcp`
- Health URL: `https://webflow-template-review-mcp.createsomething.workers.dev/health`
- Deploy version ID for the prompt-baseline rollout: `3315f4ce-57a3-4087-8b44-c775f94b8720`

## Commands run

```bash
pnpm --dir packages/webflow-template-review-mcp typecheck
pnpm --dir packages/webflow-template-review-mcp test
infisical run --env=prod --path=/ -- pnpm --dir packages/webflow-template-review-mcp smoke:remote
git diff --check
```

## Results

- `typecheck`: passed
- `test`: passed (`25` tests, `0` failed)
- `git diff --check`: passed
- `smoke:remote`: passed

The production smoke returned:

- worker auth configured with bearer mode at the worker boundary
- `template_review_health.ok=true`
- `template_review_health.data.analyzer.configured=true`
- `template_review_health.data.analyzer.reachable=true`
- `template_review_health.data.analyzer.browserAutomationSupported=true`
- `template_review_health.data.analyzer.url=https://webflow-site-analyzer-mcp-remote.createsomething.workers.dev/mcp`
- prompt title matched `# Webflow Template Review — Reviewer Workflow Guide`
- prompt included the published-first analyzer wording
- prompt included the gated publishing wording

Prompt excerpt from the live worker:

```text
# Webflow Template Review — Reviewer Workflow Guide

You are a Webflow Marketplace template reviewer using the Template Review MCP toolset. This guide covers the end-to-end review process.

## The Review Lifecycle

Every review follows these phases:
1. Setup & Health → 2. Find Work → 3. Inspect → 4. Analyze → 5. Decide

Publishing and asset-finishing actions exist on some lanes, but they are gated follow-on actions rather than the default reviewer workflow.
```

## Transport note

The HTTP MCP endpoint requires a real session flow:

1. `initialize`
2. read `Mcp-Session-Id` from the response headers
3. send `notifications/initialized`
4. include `Mcp-Session-Id` on subsequent `tools/call` and `prompts/get` requests

Naive one-shot POSTs without the session header fail with:

```text
Bad Request: Mcp-Session-Id header is required
```

The new smoke script handles this automatically, so future production checks should use `smoke:remote` instead of ad hoc curl sequences.
